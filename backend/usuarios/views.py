from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import PerfilOperario
from .permissions import EhDono, EhGerente
from .serializers import (
    CadastrarGerenteSerializer,
    CadastrarOperarioSerializer,
    LoginSerializer,
    PerfilGerenteSerializer,
    PerfilOperarioSerializer,
    UsuarioSerializer,
)
from ponto.services import registrar_log_administrativo


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — {"cpf": "...", "password": "..."}"""

    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer


class MeView(APIView):
    """GET /api/usuarios/me/ — dados do usuário autenticado + tela inicial (polimorfismo)."""

    def get(self, request):
        data = UsuarioSerializer(request.user).data
        data["tela_inicial"] = request.user.tela_inicial()

        if request.user.papel == "OPERARIO":
            try:
                perfil = request.user.perfil_operario
                data["perfil"] = PerfilOperarioSerializer(perfil).data
            except PerfilOperario.DoesNotExist:
                data["perfil"] = None
        elif request.user.papel == "GERENTE":
            try:
                data["perfil"] = PerfilGerenteSerializer(request.user.perfil_gerente).data
            except Exception:
                data["perfil"] = None

        return Response(data)


class CadastrarOperarioView(generics.CreateAPIView):
    """
    UC05 — Cadastrar Operário com Biometria Facial (RF05).
    Só o Gerente cadastra operários (ver mapa ator x caso de uso da Etapa 3).
    """

    serializer_class = CadastrarOperarioSerializer
    permission_classes = [EhGerente]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        perfil = serializer.save()
        return Response(PerfilOperarioSerializer(perfil).data, status=status.HTTP_201_CREATED)


class CadastrarGerenteView(generics.CreateAPIView):
    """UC02 — Cadastrar/Vincular Gerente (RF02). Só o Dono cadastra gerentes."""

    serializer_class = CadastrarGerenteSerializer
    permission_classes = [EhDono]


class ListarOperariosView(generics.ListAPIView):
    """Lista operários da(s) obra(s) do Gerente/Dono autenticado (apoia UC08 e o dashboard)."""

    serializer_class = PerfilOperarioSerializer
    permission_classes = [EhGerente | EhDono]

    def get_queryset(self):
        usuario = self.request.user
        qs = PerfilOperario.objects.select_related("usuario", "obra").order_by("usuario__last_name", "usuario__first_name", "usuario_id")
        if usuario.papel == "GERENTE":
            return qs.filter(obra__gerentes=usuario)
        return qs.filter(obra__dono=usuario)


class RemoverOperarioView(APIView):
    """Desativa e desvincula um operário sem apagar seu histórico."""

    permission_classes = [EhGerente | EhDono]

    def post(self, request, pk):
        try:
            perfil = PerfilOperario.objects.select_related("usuario", "obra").get(pk=pk)
        except PerfilOperario.DoesNotExist:
            return Response({"detail": "Operário não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        autorizado = (
            request.user.papel == "GERENTE" and perfil.obra and perfil.obra.gerentes.filter(pk=request.user.pk).exists()
        ) or (request.user.papel == "DONO" and perfil.obra and perfil.obra.dono_id == request.user.pk)
        if not autorizado:
            return Response({"detail": "Você não gerencia este operário."}, status=status.HTTP_403_FORBIDDEN)

        obra_anterior_id = perfil.obra_id
        perfil.usuario.ativo = False
        perfil.usuario.save(update_fields=["ativo"])
        perfil.obra = None
        perfil.save(update_fields=["obra"])
        registrar_log_administrativo(
            ator=request.user,
            acao="REMOVER_OPERARIO",
            alvo_tipo="PerfilOperario",
            alvo_id=perfil.pk,
            detalhes={"obra_id": str(obra_anterior_id) if obra_anterior_id else None},
        )
        return Response({"detail": "Operário removido da equipe e acesso desativado."})
