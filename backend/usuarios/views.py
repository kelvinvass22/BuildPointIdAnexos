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
    PerfilOperarioSerializer,
    UsuarioSerializer,
)


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — {"cpf": "...", "password": "..."}"""

    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer


class MeView(APIView):
    """GET /api/usuarios/me/ — dados do usuário autenticado + tela inicial (polimorfismo)."""

    def get(self, request):
        data = UsuarioSerializer(request.user).data
        data["tela_inicial"] = request.user.tela_inicial()
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
        qs = PerfilOperario.objects.select_related("usuario", "obra")
        if usuario.papel == "GERENTE":
            return qs.filter(obra__gerente=usuario)
        return qs.filter(obra__dono=usuario)
