from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from obras.models import Obra
from usuarios.models import PerfilOperario
from usuarios.permissions import EhGerente, EhOperario

from .models import MarcacaoPonto
from .recibo import gerar_pdf_recibo
from .serializers import (
    MarcacaoPontoSerializer,
    RegistrarContingenciaPapelSerializer,
    RegistrarContingenciaSerializer,
    RegistrarPontoSerializer,
)
from .services import (
    BiometriaNaoCadastradaError,
    ForaDoPerimetroError,
    IdentidadeNaoConfirmadaError,
    registrar_ponto,
    registrar_ponto_contingencia,
    registrar_ponto_contingencia_papel,
    verificar_integridade,
)


def _resposta_erro_registro(exc):
    if isinstance(exc, ForaDoPerimetroError):
        return Response({"detail": str(exc), "codigo": "FORA_DO_PERIMETRO"}, status=status.HTTP_403_FORBIDDEN)
    if isinstance(exc, BiometriaNaoCadastradaError):
        return Response({"detail": str(exc), "codigo": "BIOMETRIA_AUSENTE"}, status=status.HTTP_412_PRECONDITION_FAILED)
    if isinstance(exc, IdentidadeNaoConfirmadaError):
        return Response({"detail": str(exc), "codigo": "IDENTIDADE_NAO_CONFIRMADA"}, status=status.HTTP_401_UNAUTHORIZED)
    return Response({"detail": str(exc), "codigo": "ERRO_REGISTRO_PONTO"}, status=status.HTTP_400_BAD_REQUEST)


class ServerTimeView(APIView):
    """Relógio oficial da aplicação para reduzir divergências do aparelho."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        return Response({"agora": now.isoformat(), "timestamp": now.timestamp()})


class RegistrarPontoView(CreateAPIView):
    """
    UC06 — Registrar Ponto Eletrônico (RF07-RF11). Implementa o SQ01.
    POST /api/marcacoes/  (JSON: obra_id, latitude, longitude,
    precisao_gps_metros, tipo, vetor_facial, dispositivo_id, sistema_operacional)
    """

    serializer_class = RegistrarPontoSerializer
    permission_classes = [EhOperario]
    throttle_scope = "marcacoes"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        try:
            operario = request.user.perfil_operario
        except PerfilOperario.DoesNotExist:
            raise PermissionDenied("Usuário autenticado não é um operário.")

        try:
            obra = Obra.objects.get(pk=dados["obra_id"])
        except Obra.DoesNotExist:
            raise ValidationError({"obra_id": "Obra não encontrada."})

        try:
            marcacao = registrar_ponto(
                operario=operario,
                obra=obra,
                latitude=dados["latitude"],
                longitude=dados["longitude"],
                precisao_gps_metros=dados["precisao_gps_metros"],
                vetor_facial=dados["vetor_facial"],
                tipo=dados["tipo"],
                dispositivo_id=dados.get("dispositivo_id", ""),
                sistema_operacional=dados.get("sistema_operacional", ""),
                data_hora=dados.get("data_hora"),
                offline=dados.get("offline", False),
                registrado_por=request.user,
            )
        except (ForaDoPerimetroError, BiometriaNaoCadastradaError, IdentidadeNaoConfirmadaError) as exc:
            return _resposta_erro_registro(exc)

        return Response(MarcacaoPontoSerializer(marcacao).data, status=status.HTTP_201_CREATED)


class RegistrarContingenciaView(CreateAPIView):
    """
    RF06/UC07 — Gerente valida a batida no local quando a face do Operário falhou.
    POST /api/marcacoes/contingencia/
    """

    serializer_class = RegistrarContingenciaSerializer
    permission_classes = [EhGerente]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        try:
            operario = PerfilOperario.objects.get(pk=dados["operario_id"])
            obra = Obra.objects.get(pk=dados["obra_id"])
        except (PerfilOperario.DoesNotExist, Obra.DoesNotExist):
            raise ValidationError("Operário ou obra não encontrados.")

        try:
            marcacao = registrar_ponto_contingencia(
                operario=operario, obra=obra, latitude=dados["latitude"], longitude=dados["longitude"],
                precisao_gps_metros=dados["precisao_gps_metros"], tipo=dados["tipo"],
                gerente=request.user, dispositivo_id=dados.get("dispositivo_id", ""),
            )
        except ForaDoPerimetroError as exc:
            return _resposta_erro_registro(exc)

        return Response(MarcacaoPontoSerializer(marcacao).data, status=status.HTTP_201_CREATED)


class RegistrarContingenciaPapelView(CreateAPIView):
    """
    RF17 (novo) — lançamento retroativo de uma batida feita em papel
    (operário totalmente offline, sem app/dispositivo).
    POST /api/marcacoes/contingencia-papel/
    """

    serializer_class = RegistrarContingenciaPapelSerializer
    permission_classes = [EhGerente]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        try:
            operario = PerfilOperario.objects.get(pk=dados["operario_id"])
            obra = Obra.objects.get(pk=dados["obra_id"])
        except (PerfilOperario.DoesNotExist, Obra.DoesNotExist):
            raise ValidationError("Operário ou obra não encontrados.")

        marcacao = registrar_ponto_contingencia_papel(
            operario=operario, obra=obra, data_hora=dados["data_hora"],
            tipo=dados["tipo"], gerente=request.user,
        )
        return Response(MarcacaoPontoSerializer(marcacao).data, status=status.HTTP_201_CREATED)


class HistoricoMarcacoesView(ListAPIView):
    """UC08 — Consultar Histórico de Dias Trabalhados (RF13)."""

    serializer_class = MarcacaoPontoSerializer
    permission_classes = [EhOperario | EhGerente]

    def get_queryset(self):
        usuario = self.request.user
        qs = MarcacaoPonto.objects.select_related("operario__usuario", "obra")
        if usuario.papel == "OPERARIO":
            return qs.filter(operario=usuario.perfil_operario)
        return qs.filter(obra__gerentes=usuario)


class ReciboPontoView(APIView):
    """RF16 (novo) — recibo em PDF, disponível pra Dono, Gerente e o próprio Operário."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        marcacao = self._obter_marcacao_permitida(request, pk)
        pdf_bytes = gerar_pdf_recibo(marcacao)
        resposta = HttpResponse(pdf_bytes, content_type="application/pdf")
        resposta["Content-Disposition"] = f'attachment; filename="recibo-{marcacao.nsr}.pdf"'
        return resposta

    def _obter_marcacao_permitida(self, request, pk):
        usuario = request.user
        marcacao = MarcacaoPonto.objects.select_related(
            "operario__usuario", "obra", "registrado_por"
        ).filter(pk=pk).first()
        if marcacao is None:
            raise ValidationError("Marcação não encontrada.")

        permitido = (
            (usuario.papel == "OPERARIO" and marcacao.operario.usuario_id == usuario.id)
            or (usuario.papel == "GERENTE" and marcacao.obra.gerentes.filter(id=usuario.id).exists())
            or (usuario.papel == "DONO" and marcacao.obra.dono_id == usuario.id)
        )
        if not permitido:
            raise PermissionDenied("Você não tem acesso a este registro.")
        return marcacao


class VerificarIntegridadeView(APIView):
    """
    RF15/UC11 (novo, pedido do professor) — reprocessa o hash e mostra os
    metadados completos da validação. Aberto pra Dono, Gerente e o próprio
    Operário (mesma tela pros três, cada um só enxergando o que pode).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        marcacao = ReciboPontoView()._obter_marcacao_permitida(request, pk)
        log = getattr(marcacao, "log_auditoria", None)

        return Response({
            "integro": verificar_integridade(marcacao),
            "marcacao": MarcacaoPontoSerializer(marcacao).data,
            "dispositivo_id": marcacao.dispositivo_id,
            "sistema_operacional": marcacao.sistema_operacional,
            "login_utilizado": marcacao.registrado_por.cpf,
            "registrado_em": log.registrado_em if log else None,
        })
