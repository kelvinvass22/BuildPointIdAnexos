import logging

from django.conf import settings
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.permissions import EhGerente, EhOperario

from .models import BiometriaFacial
from .serializers import BiometriaFacialSerializer, CadastrarBiometriaSerializer, MinhaBiometriaEmbeddingSerializer
from .services import descriptografar_vetor

logger = logging.getLogger(__name__)


class CadastrarBiometriaView(generics.CreateAPIView):
    """
    UC05 — Cadastrar Operário com Biometria Facial (RF05).
    POST /api/biometria/cadastrar/  (JSON: operario_id, vetor_facial, qualidade_amostra)
    Embedding extraído no dispositivo do Gerente (MobileFaceNet/ArcFace .tflite) -- nunca uma imagem.
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


class MinhaBiometriaEmbeddingView(APIView):
    """
    Endpoint novo pra suportar validação facial OFFLINE: o próprio
    operário autenticado baixa o SEU embedding de referência (o mesmo que
    o Gerente cadastrou no UC05) pra guardar cifrado no aparelho
    (`expo-secure-store`, ver `secureBiometryStore.js`) e comparar
    localmente quando não houver internet. Chamado pelo app assim que
    loga (e sempre que a Home carrega com internet disponível), nunca em
    background sem o operário estar autenticado.

    Só o próprio dono do registro pode ler o embedding em claro -- não
    existe rota equivalente pra Gerente/Dono consultarem o embedding de
    outra pessoa (eles só disparam o CADASTRO, nunca a leitura).

    GET /api/biometria/minha/
    """

    permission_classes = [EhOperario]

    def get(self, request):
        try:
            biometria = request.user.perfil_operario.biometria
        except (AttributeError, BiometriaFacial.DoesNotExist):
            return Response(
                {"detail": "Você ainda não tem biometria cadastrada. Procure seu gerente.", "codigo": "BIOMETRIA_AUSENTE"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            embedding = descriptografar_vetor(biometria.vetor_criptografado)
        except Exception:
            logger.exception("Falha ao decifrar biometria para cache offline: operario=%s", request.user.pk)
            return Response(
                {"detail": "A biometria cadastrada está inválida. Solicite ao gerente um novo cadastro facial.", "codigo": "BIOMETRIA_INVALIDA"},
                status=status.HTTP_409_CONFLICT,
            )

        dados = {
            "embedding": embedding,
            "algoritmo": biometria.algoritmo,
            "qualidade_amostra": biometria.qualidade_amostra,
            "limiar_confianca": settings.FACE_LIMIAR_CONFIANCA,
            "capturado_em": biometria.capturado_em,
        }
        return Response(MinhaBiometriaEmbeddingSerializer(dados).data)
