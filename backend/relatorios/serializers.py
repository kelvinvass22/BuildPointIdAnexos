from rest_framework import serializers

from .models import RelatorioFrequencia


class RelatorioFrequenciaSerializer(serializers.ModelSerializer):
    obra_nome = serializers.CharField(source="obra.nome", read_only=True)

    class Meta:
        model = RelatorioFrequencia
        fields = [
            "id", "obra", "obra_nome", "periodo_inicio", "periodo_fim",
            "percentual_presenca", "total_marcacoes", "gerado_em",
        ]
        read_only_fields = fields


class GerarRelatorioSerializer(serializers.Serializer):
    """UC03 — Visualizar Dashboard (RF03)."""

    obra_id = serializers.UUIDField()
    periodo_inicio = serializers.DateField()
    periodo_fim = serializers.DateField()

    def validate(self, attrs):
        if attrs["periodo_fim"] < attrs["periodo_inicio"]:
            raise serializers.ValidationError("periodo_fim não pode ser anterior a periodo_inicio.")
        return attrs
