from rest_framework import serializers

from .models import MarcacaoPonto, TipoMarcacao


class MarcacaoPontoSerializer(serializers.ModelSerializer):
    operario_nome = serializers.CharField(source="operario.usuario.get_full_name", read_only=True)
    obra_nome = serializers.CharField(source="obra.nome", read_only=True)
    registrado_por_nome = serializers.CharField(source="registrado_por.get_full_name", read_only=True)

    class Meta:
        model = MarcacaoPonto
        fields = [
            "id", "nsr", "operario", "operario_nome", "obra", "obra_nome", "data_hora",
            "latitude", "longitude", "precisao_gps_metros", "confianca_face",
            "tipo", "origem", "sincronizado", "hash_integridade",
            "dispositivo_id", "sistema_operacional", "registrado_por", "registrado_por_nome",
        ]
        read_only_fields = fields  # marcações nunca são editadas via API -- só criadas (RS03)


class RegistrarPontoSerializer(serializers.Serializer):
    """
    UC06 — Registrar Ponto Eletrônico (RF07/RF08/RF09).
    POST /api/marcacoes/  (JSON)

    `vetor_facial` já vem extraído no dispositivo (SDK on-device) -- o
    backend nunca recebe imagem, só o vetor pra comparar (ver
    biometria/services.py).
    """

    obra_id = serializers.UUIDField()
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    precisao_gps_metros = serializers.FloatField(min_value=0)
    tipo = serializers.ChoiceField(choices=TipoMarcacao.choices, default=TipoMarcacao.ENTRADA)
    vetor_facial = serializers.ListField(child=serializers.FloatField(), min_length=8)
    dispositivo_id = serializers.CharField(max_length=150, required=False, allow_blank=True)
    sistema_operacional = serializers.CharField(max_length=100, required=False, allow_blank=True)


class RegistrarContingenciaSerializer(serializers.Serializer):
    """RF06/UC07 — Gerente valida a batida no local quando a face do Operário falhou."""

    operario_id = serializers.UUIDField()
    obra_id = serializers.UUIDField()
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    precisao_gps_metros = serializers.FloatField(min_value=0)
    tipo = serializers.ChoiceField(choices=TipoMarcacao.choices, default=TipoMarcacao.ENTRADA)
    dispositivo_id = serializers.CharField(max_length=150, required=False, allow_blank=True)


class RegistrarContingenciaPapelSerializer(serializers.Serializer):
    """RF17 (novo) — lançamento retroativo de uma batida registrada em papel."""

    operario_id = serializers.UUIDField()
    obra_id = serializers.UUIDField()
    data_hora = serializers.DateTimeField(help_text="Data/hora anotada no papel no momento da batida.")
    tipo = serializers.ChoiceField(choices=TipoMarcacao.choices, default=TipoMarcacao.ENTRADA)
    observacao = serializers.CharField(required=False, allow_blank=True, max_length=500)
