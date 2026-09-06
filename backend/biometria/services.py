"""
Abstração do serviço de reconhecimento facial.

ARQUITETURA ATUAL (troca do vetor geométrico por embedding de rede
neural): a extração continua acontecendo NO DISPOSITIVO do usuário, mas
agora usando um modelo treinado especificamente para reconhecimento facial
(MobileFaceNet/ArcFace, formato .tflite) via `react-native-fast-tflite`,
rodando em um Development Build gerado pelo EAS (não roda no Expo Go, que
não carrega módulos nativos). Ver
`frontend/src/services/faceVectorService.js` para a extração e
`frontend/src/services/secureBiometryStore.js` /
`frontend/src/services/offlineFaceValidationService.js` para o cache e a
comparação 100% offline no aparelho do próprio operário.

O app manda pro backend só o vetor (embedding, lista de floats) -- nunca a
imagem/frame. Esta interface recebe o vetor já pronto e só faz a
COMPARAÇÃO matemática (similaridade de cosseno) e a cifragem em repouso,
sem nenhuma chamada de rede nem processamento de imagem no servidor.
`AmazonRekognitionService` fica comentado no fim do arquivo -- não
apagamos, porque dá pra usar como checagem adicional no servidor depois
(ex.: revalidar amostras suspeitas), mas não é o caminho principal.
"""
import base64
import json
import logging
import math
from abc import ABC, abstractmethod
from dataclasses import dataclass

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger(__name__)


@dataclass
class ResultadoComparacaoFacial:
    confianca: float  # 0.0 a 1.0 -- similaridade entre o vetor capturado e o de referência
    identidade_confirmada: bool


@dataclass
class ResultadoExtracaoVetor:
    vetor_criptografado: str
    qualidade_amostra: float  # 0.0 a 1.0, informada pelo próprio SDK do dispositivo


def _fernet() -> Fernet:
    chave = settings.BIOMETRIA_ENCRYPTION_KEY
    if isinstance(chave, str):
        chave = chave.encode("utf-8")
    return Fernet(chave)


def cifrar_vetor(vetor_facial: list) -> str:
    """Serializa e cifra o vetor (Fernet/AES) antes de persistir -- nunca salvamos o vetor em claro."""
    payload = json.dumps(vetor_facial).encode("utf-8")
    token = _fernet().encrypt(payload)
    return base64.urlsafe_b64encode(token).decode("ascii")


def descriptografar_vetor(vetor_criptografado: str) -> list:
    """
    Decifra um vetor salvo. Tolerante a registros legados (de antes da
    cifragem real ser implementada, quando o campo guardava só
    `json.dumps(vetor)` em claro) -- tenta Fernet primeiro e cai pro JSON
    puro se não for um token válido, só logando um aviso. Registros legados
    também são de outro algoritmo (vetor geométrico) e não devem mais ser
    usados como referência -- o operário precisa passar por um novo UC05.
    """
    try:
        token = base64.urlsafe_b64decode(vetor_criptografado.encode("ascii"))
        payload = _fernet().decrypt(token)
        return json.loads(payload)
    except (InvalidToken, ValueError, TypeError, base64.binascii.Error):
        logger.warning("Vetor facial legado (não cifrado) decodificado como JSON puro -- recomenda-se re-cadastro.")
        return json.loads(vetor_criptografado)


class ServicoReconhecimentoFacial(ABC):
    """Porta (Ports & Adapters) para a comparação de vetores faciais."""

    @property
    def LIMIAR_CONFIANCA(self) -> float:  # RNF02 -- calibrável via settings/env, ver core/settings.py
        return settings.FACE_LIMIAR_CONFIANCA

    @abstractmethod
    def registrar_vetor(self, vetor_facial: list, qualidade_amostra: float) -> ResultadoExtracaoVetor:
        """UC05 -- recebe o embedding já extraído no dispositivo do Gerente e prepara pra persistir."""
        raise NotImplementedError

    @abstractmethod
    def comparar_vetores(self, vetor_capturado: list, vetor_referencia: str) -> ResultadoComparacaoFacial:
        """UC06 -- compara o embedding da batida com o embedding cadastrado (nunca envolve imagem)."""
        raise NotImplementedError


class ServicoSimilaridadeCosseno(ServicoReconhecimentoFacial):
    """
    Implementação padrão: sem custo, sem API externa, sem dependência de
    rede -- só matemática (similaridade de cosseno) sobre o embedding que
    o dispositivo já extraiu com o modelo MobileFaceNet/ArcFace em TFLite.

    Dois "hash"/comparações diferentes, de propósito (não confundir):
      - Este serviço = comparação por SIMILARIDADE (o mesmo rosto nunca
        gera exatamente o mesmo embedding duas vezes).
      - `ponto.services.gerar_hash_integridade` = comparação por IGUALDADE
        EXATA, pra detectar alteração no registro de ponto já salvo.
    """

    def registrar_vetor(self, vetor_facial: list, qualidade_amostra: float) -> ResultadoExtracaoVetor:
        return ResultadoExtracaoVetor(
            vetor_criptografado=cifrar_vetor(vetor_facial), qualidade_amostra=qualidade_amostra
        )

    def _similaridade_cosseno(self, vetor_a: list, vetor_b: list) -> float:
        tamanho = min(len(vetor_a), len(vetor_b))
        a, b = vetor_a[:tamanho], vetor_b[:tamanho]
        produto_escalar = sum(x * y for x, y in zip(a, b))
        norma_a = math.sqrt(sum(x * x for x in a)) or 1.0
        norma_b = math.sqrt(sum(y * y for y in b)) or 1.0
        return max(0.0, min(produto_escalar / (norma_a * norma_b), 1.0))

    def comparar_vetores(self, vetor_capturado: list, vetor_referencia: str) -> ResultadoComparacaoFacial:
        vetor_ref = descriptografar_vetor(vetor_referencia)
        if not vetor_capturado or not vetor_ref:
            return ResultadoComparacaoFacial(confianca=0.0, identidade_confirmada=False)
        confianca = self._similaridade_cosseno(vetor_capturado, vetor_ref)
        return ResultadoComparacaoFacial(
            confianca=confianca, identidade_confirmada=confianca >= self.LIMIAR_CONFIANCA
        )


def get_servico_facial() -> ServicoReconhecimentoFacial:
    """Factory -- hoje só existe o serviço local; a variável fica pra eventual troca futura."""
    return ServicoSimilaridadeCosseno()


# ---------------------------------------------------------------------------
# class AmazonRekognitionService(ServicoReconhecimentoFacial):
#     """Comentado -- caminho alternativo (servidor), não é mais o padrão.
#     Ver histórico do arquivo antes desta versão para a implementação."""
#     pass
