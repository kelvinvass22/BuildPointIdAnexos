from rest_framework import serializers

from .models import BiometriaFacial


class BiometriaFacialSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiometriaFacial
        fields = ["id", "operario", "algoritmo", "qualidade_amostra", "capturado_em"]
        read_only_fields = fields  # nunca expor vetor_criptografado via API (RS02/LGPD)


class CadastrarBiometriaSerializer(serializers.Serializer):
    """
    UC05 (parte de biometria) — recebe o frame capturado no app, chama o
    serviço de reconhecimento facial pra extrair o vetor, e só então
    persiste (nunca a imagem em si).
    """

    operario_id = serializers.UUIDField()
    frame = serializers.ImageField(write_only=True)

    def validate(self, attrs):
        from usuarios.models import PerfilOperario

        try:
            attrs["operario"] = PerfilOperario.objects.get(pk=attrs.pop("operario_id"))
        except PerfilOperario.DoesNotExist:
            raise serializers.ValidationError({"operario_id": "Operário não encontrado."})
        return attrs

    def create(self, validated_data):
        from .services import get_servico_facial

        operario = validated_data["operario"]
        frame_bytes = validated_data["frame"].read()

        resultado = get_servico_facial().extrair_vetor(frame_bytes)
        if resultado.qualidade_amostra < BiometriaFacial.LIMIAR_QUALIDADE_MINIMA:
            # Alternativa do SQ02: qualidade insuficiente (luz/EPI) -> pedir nova captura.
            raise serializers.ValidationError(
                "Qualidade da amostra insuficiente. Ajuste a iluminação/EPI e capture novamente."
            )

        biometria, _ = BiometriaFacial.objects.update_or_create(
            operario=operario,
            defaults={
                "vetor_criptografado": resultado.vetor_criptografado,
                "qualidade_amostra": resultado.qualidade_amostra,
            },
        )
        operario.biometria_cadastrada_em = biometria.capturado_em
        operario.save(update_fields=["biometria_cadastrada_em"])
        return biometria
