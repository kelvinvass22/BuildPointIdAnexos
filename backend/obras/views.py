from django.db.models import ProtectedError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from usuarios.permissions import EhDono, EhGerente
from ponto.services import registrar_log_administrativo

from .models import Equipe, Obra
from .serializers import ConfigurarGeofenceSerializer, EquipeSerializer, ObraSerializer, VincularGerenteSerializer, VinculoGerenteSerializer


class ObraViewSet(viewsets.ModelViewSet):
    """
    UC01 — Cadastrar Obra e Vincular Gerente (RF01, RF02). CRUD completo
    disponível só para o Dono; Gerente enxerga (retrieve/list) as obras às
    quais está vinculado, através do queryset filtrado abaixo.
    """

    serializer_class = ObraSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [EhDono()]
        if self.action == "vincular_gerente":
            return [EhDono()]
        return [(EhDono | EhGerente)()]

    def get_queryset(self):
        usuario = self.request.user
        qs = Obra.objects.select_related("dono").prefetch_related("vinculos_gerente__gerente")
        if usuario.papel == "GERENTE":
            return qs.filter(gerentes=usuario)
        return qs.filter(dono=usuario)

    def perform_update(self, serializer):
        obra = serializer.save()
        registrar_log_administrativo(
            ator=self.request.user,
            acao="ATUALIZAR_OBRA",
            alvo_tipo="Obra",
            alvo_id=obra.pk,
            detalhes={"campos": list(serializer.validated_data.keys())},
        )

    def destroy(self, request, *args, **kwargs):
        """
        RF01 (extensão pedida pelo Dono) -- apagar uma obra. `MarcacaoPonto.
        obra` é `on_delete=PROTECT` de propósito (RS03: marcação de ponto é
        auditoria, não pode sumir) -- então uma obra com QUALQUER marcação
        já registrada não pode ser hard-deletada; o Dono precisa encerrá-la
        (status=ENCERRADA) em vez de apagar. `VinculoGerente`/`Equipe` são
        CASCADE (só desfazem o vínculo, não perdem histórico de ponto) e
        `PerfilOperario.obra` é SET_NULL (operário fica órfão de obra, mas
        seu cadastro e seu histórico permanecem intactos).
        """
        obra = self.get_object()
        obra_id, obra_nome = obra.pk, obra.nome
        try:
            self.perform_destroy(obra)
        except ProtectedError:
            return Response(
                {
                    "detail": (
                        "Não é possível apagar esta obra porque já existem marcações de "
                        "ponto registradas nela (o histórico de ponto não pode ser "
                        "perdido). Altere o status da obra para \"Encerrada\" em vez de "
                        "apagá-la."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )
        registrar_log_administrativo(
            ator=request.user, acao="APAGAR_OBRA", alvo_tipo="Obra", alvo_id=obra_id,
            detalhes={"nome": obra_nome},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], permission_classes=[EhGerente])
    def configurar_geofence(self, request, pk=None):
        """
        UC04 — Configurar Raio de Ponto (RF04).
        POST /api/obras/{id}/configurar_geofence/
        """
        obra = self.get_object()
        serializer = ConfigurarGeofenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data
        obra.definir_perimetro(
            latitude=dados["latitude"], longitude=dados["longitude"], raio_metros=dados["raio_metros"],
        )
        return Response(ObraSerializer(obra).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def vincular_gerente(self, request, pk=None):
        """
        RF02/UC02 — vincula um gerente (existente ou novo) à obra, com especialidade.
        POST /api/obras/{id}/vincular_gerente/
        """
        obra = self.get_object()
        serializer = VincularGerenteSerializer(data=request.data, context={"obra": obra, "request": request})
        serializer.is_valid(raise_exception=True)
        vinculo = serializer.save()
        return Response(VinculoGerenteSerializer(vinculo).data, status=status.HTTP_201_CREATED)


class EquipeViewSet(viewsets.ModelViewSet):
    serializer_class = EquipeSerializer
    permission_classes = [EhDono | EhGerente]

    def get_queryset(self):
        usuario = self.request.user
        qs = Equipe.objects.select_related("obra", "gerente").prefetch_related("membros__usuario")
        if usuario.papel == "GERENTE":
            return qs.filter(obra__gerentes=usuario)
        return qs.filter(obra__dono=usuario)

    def perform_create(self, serializer):
        if self.request.user.papel == "GERENTE":
            equipe = serializer.save(gerente=self.request.user)
        else:
            equipe = serializer.save()
        registrar_log_administrativo(
            ator=self.request.user,
            acao="CRIAR_EQUIPE",
            alvo_tipo="Equipe",
            alvo_id=equipe.pk,
            detalhes={"nome": equipe.nome, "obra_id": str(equipe.obra_id)},
        )
