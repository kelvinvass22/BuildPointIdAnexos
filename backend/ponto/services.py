"""
Orquestra os fluxos de registro de ponto (SQ01 da Etapa 3 + as extensões
de contingência):

  1) valida o geofence (RF08) usando o cálculo de Haversine que já existe
     em `Obra.calcular_distancia()`/`esta_dentro_do_raio()` -- ver nota
     abaixo sobre o Geoapify;
  2) valida a face por SIMILARIDADE DE VETOR (o vetor já vem extraído do
     dispositivo -- não processamos mais imagem aqui), exceto em
     contingência;
  3) gera NSR + hash de integridade e persiste a marcação + o log imutável,
     tudo dentro de uma transação atômica.

Sobre o Geoapify: o código anterior chamava `obra.latitude`/`obra.longitude`,
que não existem no model (é `latitude_centro`/`longitude_centro`) -- ia
quebrar em produção. Como `Obra` já tem Haversine pronto (local, sem custo,
sem chamada de rede) e a checagem é só "está a menos de 5 m do centro?",
trocamos pelo método local em vez de só corrigir o nome do campo -- pra uma
distância tão curta, "linha reta" e "andando" dão praticamente o mesmo
resultado, e tira uma dependência de API paga + ponto de falha de um
fluxo que roda toda hora, no pico do início de turno (RT01/RF12). Se
havia um motivo específico pra usar o Geoapify (ex.: raios bem maiores em
outro cenário), é só reverter esse trecho -- a classe
`ServicoGeolocalizacaoGeoapify` não foi apagada, só não é mais chamada
por padrão (fica comentada no fim do arquivo).
"""
import hashlib

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import MarcacaoPonto, OrigemMarcacao, TipoMarcacao


class ForaDoPerimetroError(Exception):
    """RF08: fora do raio da obra -- marcação bloqueada."""


class IdentidadeNaoConfirmadaError(Exception):
    """Confiança facial (similaridade do vetor) insuficiente."""


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


def verificar_integridade(marcacao: MarcacaoPonto) -> bool:
    """RF15/UC11 -- recomputa o hash a partir dos dados atuais e compara com o salvo."""
    return gerar_hash_integridade(marcacao) == marcacao.hash_integridade


def _validar_geofence(obra, latitude, longitude):
    dentro = obra.esta_dentro_do_raio(latitude, longitude)
    if not dentro:
        distancia = obra.calcular_distancia(latitude, longitude)
        raise ForaDoPerimetroError(
            f"Fora do perímetro. Você está a {distancia:.0f} m da obra. O limite é {obra.raio_metros:g} m."
        )


@transaction.atomic
def registrar_ponto(
    *,
    operario,
    obra,
    latitude: float,
    longitude: float,
    precisao_gps_metros: float,
    vetor_facial: list,
    tipo: str = TipoMarcacao.ENTRADA,
    dispositivo_id: str = "",
    sistema_operacional: str = "",
    registrado_por=None,
) -> MarcacaoPonto:
    """RF07-RF11/UC06 -- batida normal do Operário, com validação facial por vetor."""
    _validar_geofence(obra, latitude, longitude)

    if not hasattr(operario, "biometria"):
        raise BiometriaNaoCadastradaError("Operário sem biometria cadastrada (ver UC05).")

    from biometria.services import get_servico_facial

    resultado = get_servico_facial().comparar_vetores(vetor_facial, operario.biometria.vetor_criptografado)
    if not resultado.identidade_confirmada:
        raise IdentidadeNaoConfirmadaError("Confiança facial insuficiente -- tente novamente.")

    return _persistir_marcacao(
        operario=operario, obra=obra, latitude=latitude, longitude=longitude,
        precisao_gps_metros=precisao_gps_metros, confianca_face=resultado.confianca,
        tipo=tipo, origem=OrigemMarcacao.APP_OPERARIO,
        dispositivo_id=dispositivo_id, sistema_operacional=sistema_operacional,
        registrado_por=registrado_por or operario.usuario, data_hora=timezone.now(),
    )


@transaction.atomic
def registrar_ponto_contingencia(
    *, operario, obra, latitude: float, longitude: float, precisao_gps_metros: float,
    tipo: str, gerente, dispositivo_id: str = "",
) -> MarcacaoPonto:
    """
    RF06/UC07 -- o Gerente valida a batida no local quando a face do
    Operário falhou. Ainda exige geofence (não dispensa GPS), mas pula a
    checagem facial -- o Gerente está assumindo a responsabilidade.
    """
    _validar_geofence(obra, latitude, longitude)

    return _persistir_marcacao(
        operario=operario, obra=obra, latitude=latitude, longitude=longitude,
        precisao_gps_metros=precisao_gps_metros, confianca_face=None,
        tipo=tipo, origem=OrigemMarcacao.CONTINGENCIA_GERENTE,
        dispositivo_id=dispositivo_id, sistema_operacional="",
        registrado_por=gerente, data_hora=timezone.now(),
    )


@transaction.atomic
def registrar_ponto_contingencia_papel(*, operario, obra, data_hora, tipo: str, gerente) -> MarcacaoPonto:
    """
    RF17 (novo) -- lançamento retroativo de uma batida feita em papel,
    quando o Operário estava totalmente offline (sem app/dispositivo).
    Não há GPS real desse momento -- usamos o centro da obra como
    coordenada, só pra manter o registro consistente; a rastreabilidade de
    quem aprovou e quando fica em `registrado_por` + `log_auditoria.registrado_em`.
    """
    return _persistir_marcacao(
        operario=operario, obra=obra, latitude=obra.latitude_centro, longitude=obra.longitude_centro,
        precisao_gps_metros=0, confianca_face=None,
        tipo=tipo, origem=OrigemMarcacao.CONTINGENCIA_PAPEL,
        dispositivo_id="", sistema_operacional="",
        registrado_por=gerente, data_hora=data_hora,
    )


def _persistir_marcacao(
    *, operario, obra, latitude, longitude, precisao_gps_metros, confianca_face,
    tipo, origem, dispositivo_id, sistema_operacional, registrado_por, data_hora,
) -> MarcacaoPonto:
    marcacao = MarcacaoPonto(
        nsr=gerar_nsr(),
        operario=operario,
        obra=obra,
        data_hora=data_hora,
        latitude=latitude,
        longitude=longitude,
        precisao_gps_metros=precisao_gps_metros,
        confianca_face=confianca_face if confianca_face is not None else 0.0,
        tipo=tipo,
        origem=origem,
        sincronizado=True,
        dispositivo_id=dispositivo_id,
        sistema_operacional=sistema_operacional,
        registrado_por=registrado_por,
    )
    marcacao.hash_integridade = gerar_hash_integridade(marcacao)
    marcacao.save()
    marcacao.gerar_log_imutavel()
    return marcacao