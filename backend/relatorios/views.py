from rest_framework import status
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.response import Response

from obras.models import Obra
from usuarios.permissions import EhDono

from .models import RelatorioFrequencia
from .serializers import GerarRelatorioSerializer, RelatorioFrequenciaSerializer


class GerarRelatorioView(CreateAPIView):
    """UC03 — Visualizar Dashboard (RF03). POST /api/relatorios/gerar/"""

    serializer_class = GerarRelatorioSerializer
    permission_classes = [EhDono]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        obra = Obra.objects.filter(pk=dados["obra_id"], dono=request.user).first()
        if obra is None:
            return Response({"detail": "Obra não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        relatorio = RelatorioFrequencia.gerar(obra, dados["periodo_inicio"], dados["periodo_fim"])
        return Response(RelatorioFrequenciaSerializer(relatorio).data, status=status.HTTP_201_CREATED)


class ListarRelatoriosView(ListAPIView):
    """Histórico de relatórios já gerados para as obras do Dono autenticado."""

    serializer_class = RelatorioFrequenciaSerializer
    permission_classes = [EhDono]

    def get_queryset(self):
        return RelatorioFrequencia.objects.filter(obra__dono=self.request.user).select_related("obra")
