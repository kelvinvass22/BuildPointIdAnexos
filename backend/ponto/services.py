"""
Orquestra o fluxo do Diagrama de Sequência SQ01 — Registrar Ponto
(Etapa 3, docs/04-diagramas-de-sequencia.md):

  1) valida o geofence NO SERVIDOR (nunca confia no app -- RT03);
  2) valida a face contra o vetor cadastrado do operário;
  3) gera NSR + hash de integridade e persiste a marcação + o log imutável,
     tudo dentro de uma transação atômica.
"""
import hashlib

from django.db import transaction
from django.utils import timezone

from .models import MarcacaoPonto, OrigemMarcacao, TipoMarcacao


class ForaDoPerimetroError(Exception):
    """RF08: fora do raio da obra -- marcação bloqueada."""


class IdentidadeNaoConfirmadaError(Exception):
    """Confiança facial insuficiente ou vivacidade não confirmada (anti-spoof)."""


class BiometriaNaoCadastradaError(Exception):
    """Operário ainda não passou pelo UC05."""


def gerar_nsr() -> str:
    """Número Sequencial de Registro, exigido pelo AFD (Portaria 671/MTE)."""
    ultimo = MarcacaoPonto.objects.order_by("-nsr").values_list("nsr", flat=True).first()
    proximo = int(ultimo) + 1 if ultimo else 1
    return str(proximo).zfill(9)


def gerar_hash_integridade(marcacao: MarcacaoPonto) -> str:
    payload = "|".join(
        str(v)
        for v in (
            marcacao.nsr, marcacao.operario_id, marcacao.obra_id,
            marcacao.data_hora.isoformat(), marcacao.latitude, marcacao.longitude, marcacao.tipo,
        )
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


@transaction.atomic
def registrar_ponto(
    *,
    operario,
    obra,
    latitude: float,
    longitude: float,
    precisao_gps_metros: float,
    frame_facial: bytes,
    tipo: str = TipoMarcacao.ENTRADA,
    origem: str = OrigemMarcacao.APP_OPERARIO,
    registrado_por=None,
) -> MarcacaoPonto:
    if not obra.esta_dentro_do_raio(latitude, longitude):
        raise ForaDoPerimetroError(
            f"Fora do perímetro de {obra.raio_metros:g} m definido para a obra {obra.nome}."
        )

    if not hasattr(operario, "biometria"):
        raise BiometriaNaoCadastradaError("Operário sem biometria cadastrada (ver UC05).")

    from biometria.services import get_servico_facial

    resultado = get_servico_facial().comparar_rosto(frame_facial, operario.biometria.vetor_criptografado)
    if not (resultado.identidade_confirmada and resultado.vivacidade_confirmada):
        raise IdentidadeNaoConfirmadaError("Confiança facial insuficiente -- tente novamente.")

    marcacao = MarcacaoPonto(
        nsr=gerar_nsr(),
        operario=operario,
        obra=obra,
        data_hora=timezone.now(),
        latitude=latitude,
        longitude=longitude,
        precisao_gps_metros=precisao_gps_metros,
        confianca_face=resultado.confianca,
        tipo=tipo,
        origem=origem,
        sincronizado=True,
        registrado_por=registrado_por or operario.usuario,
    )
    marcacao.hash_integridade = gerar_hash_integridade(marcacao)
    marcacao.save()
    marcacao.gerar_log_imutavel()
    return marcacao
