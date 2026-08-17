from rest_framework import generics, status
from rest_framework.response import Response

from usuarios.permissions import EhGerente

from .serializers import BiometriaFacialSerializer, CadastrarBiometriaSerializer


class CadastrarBiometriaView(generics.CreateAPIView):
    """
    UC05 — Cadastrar Operário com Biometria Facial (RF05).
    POST /api/biometria/cadastrar/  (multipart/form-data: operario_id, frame)
    Só o Gerente captura a biometria em campo (ver SQ02 da Etapa 3).
    """

    serializer_class = CadastrarBiometriaSerializer
    permission_classes = [EhGerente]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        biometria = serializer.save()
        return Response(BiometriaFacialSerializer(biometria).data, status=status.HTTP_201_CREATED)
