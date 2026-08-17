"""
Orquestra o fluxo do Diagrama de Sequência SQ01 — Registrar Ponto
(Etapa 3, docs/04-diagramas-de-sequencia.md):

  1) valida o geofence via API Geoapify (nunca confia no app -- RT03);
  2) valida a face contra o vetor cadastrado do operário;
  3) gera NSR + hash de integridade e persiste a marcação + o log imutável,
     tudo dentro de uma transação atômica.
"""
import hashlib
import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import MarcacaoPonto, OrigemMarcacao, TipoMarcacao


class ForaDoPerimetroError(Exception):
    """RF08: fora do raio da obra -- marcação bloqueada."""

class IdentidadeNaoConfirmadaError(Exception):
    """Confiança facial insuficiente ou vivacidade não confirmada (anti-spoof)."""

class BiometriaNaoCadastradaError(Exception):
    """Operário ainda não passou pelo UC05."""

class ServicoGeolocalizacaoGeoapify:
    @staticmethod
    def calcular_distancia_metros(lat_origem: float, lon_origem: float, lat_destino: float, lon_destino: float) -> float:
        """
        Calcula a distância real em metros entre a posição do operário e a obra via Geoapify.
        """
        api_key = settings.GEOAPIFY_API_KEY
        if not api_key:
            raise ValueError("GEOAPIFY_API_KEY não configurada no ambiente.")

        url = f"https://api.geoapify.com/v2/distance-matrix?apiKey={api_key}"
        payload = {
            "mode": "walk", # 'walk' ou 'drive' (walk é mais preciso para distâncias curtas)
            "sources": [{"location": [lon_origem, lat_origem]}],
            "targets": [{"location": [lon_destino, lat_destino]}]
        }

        try:
            response = requests.post(url, json=payload, timeout=5)
            if response.status_code == 200:
                data = response.json()
                return data["sources_to_targets"][0][0]["distance"]
            raise Exception(f"Erro na API de Geolocalização: {response.text}")
        except requests.RequestException as e:
            raise Exception(f"Falha de comunicação com o serviço de mapas: {str(e)}")


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
    
    # 1. Validação de Geofence via Geoapify
    distancia = ServicoGeolocalizacaoGeoapify.calcular_distancia_metros(
        lat_origem=latitude,
        lon_origem=longitude,
        lat_destino=obra.latitude,
        lon_destino=obra.longitude
    )

    if distancia > obra.raio_metros:
        raise ForaDoPerimetroError(
            f"Fora do perímetro. Você está a {distancia}m da obra. O limite é {obra.raio_metros:g}m."
        )

    # 2. Validação Biométrica
    if not hasattr(operario, "biometria"):
        raise BiometriaNaoCadastradaError("Operário sem biometria cadastrada (ver UC05).")

    from biometria.services import get_servico_facial

    resultado = get_servico_facial().comparar_rosto(frame_facial, operario.biometria.vetor_criptografado)
    if not (resultado.identidade_confirmada and resultado.vivacidade_confirmada):
        raise IdentidadeNaoConfirmadaError("Confiança facial insuficiente -- tente novamente.")

    # 3. Persistência e Auditoria
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