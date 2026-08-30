from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from usuarios.permissions import EhDono, EhGerente

from .models import Obra
from .serializers import ConfigurarGeofenceSerializer, ObraSerializer, VincularGerenteSerializer, VinculoGerenteSerializer


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
