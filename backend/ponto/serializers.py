from rest_framework import serializers

from .models import MarcacaoPonto, TipoMarcacao


class MarcacaoPontoSerializer(serializers.ModelSerializer):
    operario_nome = serializers.CharField(source="operario.usuario.get_full_name", read_only=True)
    obra_nome = serializers.CharField(source="obra.nome", read_only=True)

    class Meta:
        model = MarcacaoPonto
        fields = [
            "id", "nsr", "operario", "operario_nome", "obra", "obra_nome", "data_hora",
            "latitude", "longitude", "precisao_gps_metros", "confianca_face",
            "tipo", "origem", "sincronizado", "hash_integridade",
        ]
        read_only_fields = fields  # marcações nunca são editadas via API -- só criadas (RS03)


class RegistrarPontoSerializer(serializers.Serializer):
    """
    UC06 — Registrar Ponto Eletrônico (RF07/RF08).
    POST /api/marcacoes/  (multipart/form-data)
    """

    obra_id = serializers.UUIDField()
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    precisao_gps_metros = serializers.FloatField(min_value=0)
    tipo = serializers.ChoiceField(choices=TipoMarcacao.choices, default=TipoMarcacao.ENTRADA)
    frame = serializers.ImageField(write_only=True)
