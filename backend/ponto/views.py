from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.response import Response

from obras.models import Obra
from usuarios.permissions import EhGerente, EhOperario
from usuarios.models import PerfilOperario

from .models import MarcacaoPonto, OrigemMarcacao
from .serializers import MarcacaoPontoSerializer, RegistrarPontoSerializer
from .services import (
    BiometriaNaoCadastradaError,
    ForaDoPerimetroError,
    IdentidadeNaoConfirmadaError,
    registrar_ponto,
)


class RegistrarPontoView(CreateAPIView):
    """
    UC06 — Registrar Ponto Eletrônico (RF07, RF08). Implementa o SQ01.
    POST /api/marcacoes/  (multipart/form-data)
    """

    serializer_class = RegistrarPontoSerializer
    permission_classes = [EhOperario]
    throttle_scope = "marcacoes"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        try:
            operario = request.user.perfil_operario
        except PerfilOperario.DoesNotExist:
            raise PermissionDenied("Usuário autenticado não é um operário.")

        try:
            obra = Obra.objects.get(pk=dados["obra_id"])
        except Obra.DoesNotExist:
            raise ValidationError({"obra_id": "Obra não encontrada."})

        try:
            marcacao = registrar_ponto(
                operario=operario,
                obra=obra,
                latitude=dados["latitude"],
                longitude=dados["longitude"],
                precisao_gps_metros=dados["precisao_gps_metros"],
                frame_facial=dados["frame"].read(),
                tipo=dados["tipo"],
                origem=OrigemMarcacao.APP_OPERARIO,
                registrado_por=request.user,
            )
        except ForaDoPerimetroError as exc:
            return Response({"detail": str(exc), "codigo": "FORA_DO_PERIMETRO"}, status=status.HTTP_403_FORBIDDEN)
        except BiometriaNaoCadastradaError as exc:
            return Response({"detail": str(exc), "codigo": "BIOMETRIA_AUSENTE"}, status=status.HTTP_412_PRECONDITION_FAILED)
        except IdentidadeNaoConfirmadaError as exc:
            return Response({"detail": str(exc), "codigo": "IDENTIDADE_NAO_CONFIRMADA"}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(MarcacaoPontoSerializer(marcacao).data, status=status.HTTP_201_CREATED)


class HistoricoMarcacoesView(ListAPIView):
    """UC08 — Consultar Histórico de Dias Trabalhados (RF09)."""

    serializer_class = MarcacaoPontoSerializer
    permission_classes = [EhOperario | EhGerente]

    def get_queryset(self):
        usuario = self.request.user
        qs = MarcacaoPonto.objects.select_related("operario__usuario", "obra")
        if usuario.papel == "OPERARIO":
            return qs.filter(operario=usuario.perfil_operario)
        return qs.filter(obra__gerente=usuario)
