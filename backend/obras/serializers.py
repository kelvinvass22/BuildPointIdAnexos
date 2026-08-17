from rest_framework import serializers

from .models import Obra


class ObraSerializer(serializers.ModelSerializer):
    gerente_nome = serializers.CharField(source="gerente.get_full_name", read_only=True, default=None)
    total_operarios = serializers.IntegerField(source="operarios.count", read_only=True)

    class Meta:
        model = Obra
        fields = [
            "id", "nome", "endereco", "latitude_centro", "longitude_centro",
            "raio_metros", "status", "gerente", "gerente_nome", "total_operarios", "criada_em",
        ]
        read_only_fields = ["id", "criada_em"]

    def create(self, validated_data):
        # UC01 — o dono autenticado é sempre o dono da obra criada.
        validated_data["dono"] = self.context["request"].user
        return super().create(validated_data)


class ConfigurarGeofenceSerializer(serializers.Serializer):
    """UC04 — Configurar Raio de Ponto (RF04)."""

    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    precisao_gps_metros = serializers.FloatField(required=False)
    raio_metros = serializers.FloatField(default=5.0, min_value=1, max_value=100)

    def validate(self, attrs):
        # Alternativa do UC04: GPS fraco (> 10 m) -> pedir alta precisão / céu aberto.
        precisao = attrs.get("precisao_gps_metros")
        if precisao is not None and precisao > 10:
            raise serializers.ValidationError(
                "GPS impreciso (>10m). Ative alta precisão ou tente em local mais aberto."
            )
        return attrs
