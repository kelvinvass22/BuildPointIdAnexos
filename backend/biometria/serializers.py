from rest_framework import serializers

from .models import BiometriaFacial


class BiometriaFacialSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiometriaFacial
        fields = ["id", "operario", "algoritmo", "qualidade_amostra", "capturado_em"]
        read_only_fields = fields  # nunca expor vetor_criptografado via API geral (RS02/LGPD)


class CadastrarBiometriaSerializer(serializers.Serializer):
    """
    UC05 (parte de biometria) -- recebe o EMBEDDING já extraído no
    dispositivo do Gerente (modelo MobileFaceNet/ArcFace em TFLite, via
    react-native-fast-tflite), nunca uma imagem/frame, e persiste cifrado
    (RS02/LGPD, ver biometria/services.py:cifrar_vetor).
    """

    operario_id = serializers.UUIDField()
    vetor_facial = serializers.ListField(
        child=serializers.FloatField(), min_length=8,
        help_text="Embedding facial extraído no dispositivo (MobileFaceNet/ArcFace .tflite) -- não a imagem.",
    )
    qualidade_amostra = serializers.FloatField(
        min_value=0, max_value=1, help_text="Qualidade informada pelo próprio pipeline de captura do dispositivo.",
    )

    def validate(self, attrs):
        from usuarios.models import PerfilOperario

        try:
            attrs["operario"] = PerfilOperario.objects.get(pk=attrs.pop("operario_id"))
        except PerfilOperario.DoesNotExist:
            raise serializers.ValidationError({"operario_id": "Operário não encontrado."})
        return attrs

    def create(self, validated_data):
        from django.conf import settings

        from .services import get_servico_facial

        operario = validated_data["operario"]
        qualidade_amostra = validated_data["qualidade_amostra"]

        if qualidade_amostra < BiometriaFacial.LIMIAR_QUALIDADE_MINIMA:
            # Alternativa do SQ02: qualidade insuficiente (luz/EPI) -> pedir nova captura.
            raise serializers.ValidationError({
                "codigo": "QUALIDADE_INSUFICIENTE",
                "detail": (
                    f"Qualidade da amostra insuficiente ({qualidade_amostra:.2f}; "
                    f"mínimo {BiometriaFacial.LIMIAR_QUALIDADE_MINIMA:.2f}). "
                    "Ajuste a iluminação, mantenha o celular firme e capture novamente."
                ),
            })

        resultado = get_servico_facial().registrar_vetor(validated_data["vetor_facial"], qualidade_amostra)

        biometria, _ = BiometriaFacial.objects.update_or_create(
            operario=operario,
            defaults={
                "vetor_criptografado": resultado.vetor_criptografado,
                "qualidade_amostra": resultado.qualidade_amostra,
                "algoritmo": settings.FACE_ALGORITMO_PADRAO,
            },
        )
        operario.biometria_cadastrada_em = biometria.capturado_em
        operario.save(update_fields=["biometria_cadastrada_em"])
        return biometria


class MinhaBiometriaEmbeddingSerializer(serializers.Serializer):
    """
    Serializer só do endpoint GET /api/biometria/minha/ — o ÚNICO lugar da
    API que devolve o embedding em claro, e só pro dono dele (ver
    permissão em views.MinhaBiometriaEmbeddingView). Existe pra alimentar o
    cache local (`secureBiometryStore`) que permite validar a face 100%
    offline no próprio aparelho do operário (mesma comparação por
    similaridade de cosseno que o backend faz, replicada em
    `offlineFaceValidationService`).
    """

    embedding = serializers.ListField(child=serializers.FloatField())
    algoritmo = serializers.CharField()
    qualidade_amostra = serializers.FloatField()
    limiar_confianca = serializers.FloatField()
    capturado_em = serializers.DateTimeField()
