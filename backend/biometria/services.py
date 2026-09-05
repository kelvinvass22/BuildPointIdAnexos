"""
Abstração do serviço de reconhecimento facial.

MUDANÇA DE ARQUITETURA (feedback do professor): a extração do vetor facial
passou a acontecer NO DISPOSITIVO do usuário, com um SDK gratuito on-device
(ex.: Google ML Kit Face Detection, MediaPipe Face Landmarker -- ambos
gratuitos, rodam no hardware do celular, sem custo por chamada e sem
depender de internet nesse passo). O app manda pro backend só o vetor
(lista de números) -- nunca mais a imagem/frame.

Isso muda o contrato desta interface: antes ela recebia `frame_bytes` e
processava a imagem (via Amazon Rekognition); agora ela recebe o vetor já
pronto e só faz a COMPARAÇÃO matemática (similaridade de cosseno), sem
nenhuma chamada de rede. `AmazonRekognitionService` fica comentado no fim
do arquivo -- não apagamos, porque dá pra usar como checagem adicional no
servidor depois se quiserem (ex.: revalidar amostras suspeitas), mas não é
mais o caminho principal.
"""
import math
from abc import ABC, abstractmethod
from dataclasses import dataclass

from django.conf import settings


@dataclass
class ResultadoComparacaoFacial:
    confianca: float  # 0.0 a 1.0 -- similaridade entre o vetor capturado e o de referência
    identidade_confirmada: bool


@dataclass
class ResultadoExtracaoVetor:
    vetor_criptografado: str
    qualidade_amostra: float  # 0.0 a 1.0, informada pelo próprio SDK do dispositivo


class ServicoReconhecimentoFacial(ABC):
    """Porta (Ports & Adapters) para a comparação de vetores faciais."""

    LIMIAR_CONFIANCA = 0.90  # RNF02: mesmo limiar de antes, agora aplicado à similaridade do vetor

    @abstractmethod
    def registrar_vetor(self, vetor_facial: list, qualidade_amostra: float) -> ResultadoExtracaoVetor:
        """UC05 -- recebe o vetor já extraído no dispositivo do Gerente e prepara pra persistir."""
        raise NotImplementedError

    @abstractmethod
    def comparar_vetores(self, vetor_capturado: list, vetor_referencia: str) -> ResultadoComparacaoFacial:
        """UC06 -- compara o vetor da batida com o vetor cadastrado (nunca envolve imagem)."""
        raise NotImplementedError


class ServicoSimilaridadeCosseno(ServicoReconhecimentoFacial):
    """
    Implementação padrão: sem custo, sem API externa, sem dependência de
    rede -- só matemática (similaridade de cosseno). É o que sobra depois
    que a extração saiu do backend: aqui só compara dois vetores.

    Dois "hash"/comparações diferentes, de propósito (não confundir):
      - Este serviço = comparação por SIMILARIDADE (o mesmo rosto nunca
        gera o mesmo vetor duas vezes).
      - `ponto.services.gerar_hash_integridade` = comparação por IGUALDADE
        EXATA, pra detectar alteração no registro de ponto já salvo.
    """

    def registrar_vetor(self, vetor_facial: list, qualidade_amostra: float) -> ResultadoExtracaoVetor:
        import json
        return ResultadoExtracaoVetor(
            vetor_criptografado=json.dumps(vetor_facial), qualidade_amostra=qualidade_amostra
        )

    def _similaridade_cosseno(self, vetor_a: list, vetor_b: list) -> float:
        tamanho = min(len(vetor_a), len(vetor_b))
        a, b = vetor_a[:tamanho], vetor_b[:tamanho]
        produto_escalar = sum(x * y for x, y in zip(a, b))
        norma_a = math.sqrt(sum(x * x for x in a)) or 1.0
        norma_b = math.sqrt(sum(y * y for y in b)) or 1.0
        return max(0.0, min(produto_escalar / (norma_a * norma_b), 1.0))

    def comparar_vetores(self, vetor_capturado: list, vetor_referencia: str) -> ResultadoComparacaoFacial:
        import json

        vetor_ref = json.loads(vetor_referencia)
        if not vetor_capturado or not vetor_ref:
            return ResultadoComparacaoFacial(confianca=0.0, identidade_confirmada=False)
        confianca = self._similaridade_cosseno(vetor_capturado, vetor_ref)
        return ResultadoComparacaoFacial(
            confianca=confianca, identidade_confirmada=confianca >= self.LIMIAR_CONFIANCA
        )


def get_servico_facial() -> ServicoReconhecimentoFacial:
    """Factory -- hoje só existe o serviço local; a variável fica pra eventual troca futura."""
    return ServicoSimilaridadeCosseno()
