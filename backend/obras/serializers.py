from rest_framework import serializers

from .models import Equipe, Obra, VinculoGerente


class VinculoGerenteSerializer(serializers.ModelSerializer):
    gerente_nome = serializers.CharField(source="gerente.get_full_name", read_only=True)
    tipo_gerente = serializers.CharField(source="gerente.perfil_gerente.tipo_gerente", read_only=True, default="")

    class Meta:
        model = VinculoGerente
        fields = ["id", "gerente", "gerente_nome", "tipo_gerente", "especialidade", "criado_em"]
        read_only_fields = ["id", "criado_em"]


class VincularGerenteSerializer(serializers.Serializer):
    """
    RF02/UC02 — vincula um gerente já existente (`gerente_id`) OU cadastra
    um novo (`nome_completo`/`cpf`/`email`) na mesma chamada, sempre com
    uma `especialidade` (ex.: elétrica, civil, segurança do trabalho).
    """

    especialidade = serializers.CharField(max_length=100)

    gerente_id = serializers.UUIDField(required=False)

    nome_completo = serializers.CharField(max_length=150, required=False)
    cpf = serializers.CharField(max_length=14, required=False)
    email = serializers.EmailField(required=False)
    telefone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    tipo_gerente = serializers.CharField(max_length=80, required=False, allow_blank=True)
    senha_inicial = serializers.CharField(write_only=True, required=False, min_length=8)

    def validate(self, attrs):
        if not attrs.get("gerente_id") and not (attrs.get("nome_completo") and attrs.get("cpf")):
            raise serializers.ValidationError(
                "Informe `gerente_id` de um gerente já cadastrado, ou `nome_completo`+`cpf`+`email` pra criar um novo."
            )
        return attrs

    def create(self, validated_data):
        from usuarios.models import Usuario

        obra = self.context["obra"]

        if validated_data.get("gerente_id"):
            try:
                gerente = Usuario.objects.get(pk=validated_data["gerente_id"], papel="GERENTE")
            except Usuario.DoesNotExist:
                raise serializers.ValidationError({"gerente_id": "Gerente não encontrado."})
        else:
            from usuarios.models import PerfilGerente

            cpf = validated_data["cpf"]
            if Usuario.objects.filter(cpf=cpf).exists():
                raise serializers.ValidationError({"cpf": "Já existe um usuário com este CPF."})

            partes_nome = validated_data["nome_completo"].split(" ", 1)
            gerente = Usuario.objects.create_user(
                username=cpf, cpf=cpf, email=validated_data.get("email", ""),
                first_name=partes_nome[0], last_name=partes_nome[1] if len(partes_nome) > 1 else "",
                password=validated_data.get("senha_inicial") or __import__("secrets").token_urlsafe(12),
                papel="GERENTE",
            )
            PerfilGerente.objects.create(
                usuario=gerente,
                telefone=validated_data.get("telefone", ""),
                tipo_gerente=validated_data.get("tipo_gerente", ""),
            )

        return VinculoGerente.objects.create(
            obra=obra, gerente=gerente, especialidade=validated_data["especialidade"],
        )


class ObraSerializer(serializers.ModelSerializer):
    vinculos_gerente = VinculoGerenteSerializer(many=True, read_only=True)
    total_operarios = serializers.IntegerField(source="operarios.count", read_only=True)

    class Meta:
        model = Obra
        fields = [
            "id", "nome", "endereco", "numero_art", "latitude_centro", "longitude_centro",
            "raio_metros", "status", "vinculos_gerente", "total_operarios", "criada_em",
        ]
        read_only_fields = ["id", "criada_em"]

    def create(self, validated_data):
        # UC01 — o dono autenticado é sempre o dono da obra criada.
        validated_data["dono"] = self.context["request"].user
        return super().create(validated_data)


class EquipeSerializer(serializers.ModelSerializer):
    obra_nome = serializers.CharField(source="obra.nome", read_only=True)
    gerente_nome = serializers.CharField(source="gerente.get_full_name", read_only=True)
    total_membros = serializers.IntegerField(source="membros.count", read_only=True)

    class Meta:
        model = Equipe
        fields = ["id", "obra", "obra_nome", "nome", "gerente", "gerente_nome", "membros", "total_membros", "ativa", "criada_em"]
        read_only_fields = ["id", "obra_nome", "gerente_nome", "total_membros", "criada_em"]
        extra_kwargs = {"gerente": {"required": False}}

    def validate(self, attrs):
        obra = attrs.get("obra") or getattr(self.instance, "obra", None)
        membros = attrs.get("membros")
        if obra and membros and any(membro.obra_id != obra.id for membro in membros):
            raise serializers.ValidationError("Todos os membros devem pertencer à mesma obra da equipe.")
        gerente = attrs.get("gerente")
        if gerente and not obra.gerentes.filter(pk=gerente.pk).exists() and obra.dono_id != gerente.pk:
            raise serializers.ValidationError("O gerente precisa estar vinculado à obra.")
        return attrs


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
