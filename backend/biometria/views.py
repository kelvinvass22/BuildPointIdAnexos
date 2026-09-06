import logging

from rest_framework import generics, status
from rest_framework.response import Response

from usuarios.permissions import EhGerente

from .serializers import BiometriaFacialSerializer, CadastrarBiometriaSerializer

logger = logging.getLogger(__name__)


class CadastrarBiometriaView(generics.CreateAPIView):
    """
    UC05 — Cadastrar Operário com Biometria Facial (RF05).
    POST /api/biometria/cadastrar/  (JSON: operario_id, vetor_facial, qualidade_amostra)
    Vetor extraído no dispositivo do Gerente (SDK on-device) -- nunca uma imagem.
    """

    serializer_class = CadastrarBiometriaSerializer
    permission_classes = [EhGerente]

    def create(self, request, *args, **kwargs):
        logger.info(
            "Início cadastro biometria: gerente=%s operario=%s vetor_recebido=%s qualidade=%s",
            request.user.pk,
            request.data.get("operario_id"),
            bool(request.data.get("vetor_facial")),
            request.data.get("qualidade_amostra"),
        )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        biometria = serializer.save()
        return Response(BiometriaFacialSerializer(biometria).data, status=status.HTTP_201_CREATED)
