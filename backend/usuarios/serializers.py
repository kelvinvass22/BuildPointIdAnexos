from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import PerfilGerente, PerfilOperario, Usuario


class LoginSerializer(TokenObtainPairSerializer):
    """Login por CPF/CNPJ + senha — bate com a tela de Login do Figma."""

    username_field = "cpf"

    def validate(self, attrs):
        cpf = attrs.get("cpf")
        senha = attrs.get("password")

        try:
            usuario = Usuario.objects.get(cpf=cpf)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("CPF/CNPJ ou senha inválidos.")

        autenticado = authenticate(username=usuario.username, password=senha)
        if not autenticado or not autenticado.ativo:
            raise serializers.ValidationError("CPF/CNPJ ou senha inválidos.")

        refresh = self.get_token(autenticado)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "usuario_id": str(autenticado.id),
            "nome": autenticado.get_full_name(),
            "papel": autenticado.papel,
            "tela_inicial": autenticado.tela_inicial(),
        }


class UsuarioSerializer(serializers.ModelSerializer):
    nome_completo = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = Usuario
        fields = ["id", "nome_completo", "first_name", "last_name", "email", "cpf", "papel", "ativo", "criado_em"]
        read_only_fields = ["id", "papel", "criado_em"]


class PerfilOperarioSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer(read_only=True)
    obra_nome = serializers.CharField(source="obra.nome", read_only=True, default=None)
    possui_biometria_ativa = serializers.BooleanField(read_only=True)

    class Meta:
        model = PerfilOperario
        fields = ["usuario", "cargo", "obra", "obra_nome", "biometria_cadastrada_em", "possui_biometria_ativa"]


class CadastrarOperarioSerializer(serializers.Serializer):
    """
    UC05 — Cadastrar Operário com Biometria Facial (RF05).
    A biometria em si é enviada depois, via biometria/views.py — aqui só
    criamos o Usuario + PerfilOperario (dados cadastrais).
    """

    nome_completo = serializers.CharField(max_length=150)
    cpf = serializers.CharField(max_length=14)
    email = serializers.EmailField(required=False, allow_blank=True)
    cargo = serializers.CharField(max_length=100, required=False, allow_blank=True)
    senha_inicial = serializers.CharField(write_only=True, min_length=8)
    obra_id = serializers.UUIDField()

    def validate_cpf(self, value):
        if Usuario.objects.filter(cpf=value).exists():
            raise serializers.ValidationError("Já existe um usuário com este CPF.")
        return value

    def create(self, validated_data):
        from obras.models import Obra

        try:
            obra = Obra.objects.get(pk=validated_data["obra_id"])
        except Obra.DoesNotExist:
            raise serializers.ValidationError({"obra_id": "Obra não encontrada."})

        partes_nome = validated_data["nome_completo"].split(" ", 1)
        usuario = Usuario.objects.create_user(
            username=validated_data["cpf"],
            cpf=validated_data["cpf"],
            email=validated_data.get("email", ""),
            first_name=partes_nome[0],
            last_name=partes_nome[1] if len(partes_nome) > 1 else "",
            password=validated_data["senha_inicial"],
            papel="OPERARIO",
        )
        return PerfilOperario.objects.create(
            usuario=usuario, cargo=validated_data.get("cargo", ""), obra=obra
        )


class CadastrarGerenteSerializer(serializers.Serializer):
    """UC02 — Vincular Gerente (RF02), feito pelo Dono."""

    nome_completo = serializers.CharField(max_length=150)
    cpf = serializers.CharField(max_length=14)
    email = serializers.EmailField()
    telefone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    senha_inicial = serializers.CharField(write_only=True, min_length=8)

    def validate_cpf(self, value):
        if Usuario.objects.filter(cpf=value).exists():
            raise serializers.ValidationError("Já existe um usuário com este CPF.")
        return value

    def create(self, validated_data):
        partes_nome = validated_data["nome_completo"].split(" ", 1)
        usuario = Usuario.objects.create_user(
            username=validated_data["cpf"],
            cpf=validated_data["cpf"],
            email=validated_data["email"],
            first_name=partes_nome[0],
            last_name=partes_nome[1] if len(partes_nome) > 1 else "",
            password=validated_data["senha_inicial"],
            papel="GERENTE",
        )
        return PerfilGerente.objects.create(
            usuario=usuario, telefone=validated_data.get("telefone", "")
        )
