"""
Abstração do serviço de reconhecimento facial.

Ver a conversa sobre qual API usar (Amazon Rekognition recomendado, com
Azure Face e FaceIO como alternativas). Esta interface existe justamente
pra isso: trocar de provedor depois é trocar UMA implementação aqui, não
caçar chamada de API espalhada pelo projeto -- Abstração + Polimorfismo
na prática, ligado à mesma conversa sobre POO.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass

from django.conf import settings


@dataclass
class ResultadoComparacaoFacial:
    confianca: float  # 0.0 a 1.0
    identidade_confirmada: bool
    vivacidade_confirmada: bool  # liveness / anti-spoof (foto de foto, deepfake)


@dataclass
class ResultadoExtracaoVetor:
    vetor_criptografado: str
    qualidade_amostra: float  # 0.0 a 1.0


class ServicoReconhecimentoFacial(ABC):
    """Porta (no sentido de Ports & Adapters) para qualquer provedor de Face ID."""

    LIMIAR_CONFIANCA = 0.90  # RNF02: Face ID em até 3s, tolerante a luz/EPI

    @abstractmethod
    def extrair_vetor(self, frame_bytes: bytes) -> ResultadoExtracaoVetor:
        """UC05 — usado no cadastro do operário (enrolment)."""
        raise NotImplementedError

    @abstractmethod
    def comparar_rosto(self, frame_bytes: bytes, vetor_referencia: str) -> ResultadoComparacaoFacial:
        """UC06 — usado a cada batida de ponto."""
        raise NotImplementedError


class AmazonRekognitionService(ServicoReconhecimentoFacial):
    """
    Implementação real com Amazon Rekognition, usando uma Collection (banco
    de rostos gerenciado pela AWS) em vez de comparar duas imagens direto --
    assim nunca precisamos guardar a imagem de cadastro pra comparar depois
    (RS02). O que fica em `vetor_criptografado` é o FaceId que a AWS
    devolve -- um identificador opaco, não o rosto em si.

    Liveness (anti-spoof) real exige o fluxo separado de Face Liveness da
    AWS (sessão + SDK no app) -- fora do escopo desta primeira versão.
    `vivacidade_confirmada` fica fixo em True por enquanto; ver TODO abaixo.
    """

    def _cliente(self):
        import boto3

        return boto3.client(
            "rekognition",
            region_name=settings.AWS_REKOGNITION_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

    def _garantir_colecao(self, cliente):
        """Cria a Collection na primeira vez que for usada (idempotente)."""
        from botocore.exceptions import ClientError

        try:
            cliente.create_collection(CollectionId=settings.AWS_REKOGNITION_COLLECTION_ID)
        except ClientError as exc:
            if exc.response["Error"]["Code"] != "ResourceAlreadyExistsException":
                raise

    def extrair_vetor(self, frame_bytes: bytes) -> ResultadoExtracaoVetor:
        cliente = self._cliente()
        self._garantir_colecao(cliente)

        resposta = cliente.index_faces(
            CollectionId=settings.AWS_REKOGNITION_COLLECTION_ID,
            Image={"Bytes": frame_bytes},
            MaxFaces=1,
            QualityFilter="AUTO",
            DetectionAttributes=["DEFAULT"],
        )
        registros = resposta.get("FaceRecords", [])
        if not registros:
            raise ValueError(
                "Nenhum rosto detectado com qualidade suficiente. Ajuste iluminação/EPI e capture de novo."
            )

        face = registros[0]["Face"]
        return ResultadoExtracaoVetor(
            vetor_criptografado=face["FaceId"], qualidade_amostra=face["Confidence"] / 100
        )

    def comparar_rosto(self, frame_bytes: bytes, vetor_referencia: str) -> ResultadoComparacaoFacial:
        cliente = self._cliente()

        resposta = cliente.search_faces_by_image(
            CollectionId=settings.AWS_REKOGNITION_COLLECTION_ID,
            Image={"Bytes": frame_bytes},
            MaxFaces=1,
            FaceMatchThreshold=70,
        )
        matches = resposta.get("FaceMatches", [])
        if not matches:
            return ResultadoComparacaoFacial(
                confianca=0.0, identidade_confirmada=False, vivacidade_confirmada=False
            )

        melhor = matches[0]
        confianca = melhor["Similarity"] / 100
        eh_o_mesmo_operario = melhor["Face"]["FaceId"] == vetor_referencia

        return ResultadoComparacaoFacial(
            confianca=confianca,
            identidade_confirmada=eh_o_mesmo_operario and confianca >= self.LIMIAR_CONFIANCA,
            vivacidade_confirmada=eh_o_mesmo_operario,
        )


class ServicoFacialFalso(ServicoReconhecimentoFacial):
    """
    Implementação fake para desenvolvimento local e testes automatizados,
    sem depender de credenciais reais. NUNCA usar em produção.
    """

    def extrair_vetor(self, frame_bytes: bytes) -> ResultadoExtracaoVetor:
        import hashlib

        return ResultadoExtracaoVetor(
            vetor_criptografado=hashlib.sha256(frame_bytes).hexdigest(), qualidade_amostra=0.95
        )

    def comparar_rosto(self, frame_bytes: bytes, vetor_referencia: str) -> ResultadoComparacaoFacial:
        return ResultadoComparacaoFacial(
            confianca=0.99, identidade_confirmada=True, vivacidade_confirmada=True
        )


def get_servico_facial() -> ServicoReconhecimentoFacial:
    """Factory -- decide o provedor conforme settings.FACE_SERVICE_PROVIDER."""
    provedor = getattr(settings, "FACE_SERVICE_PROVIDER", "falso")
    if provedor == "aws":
        return AmazonRekognitionService()
    return ServicoFacialFalso()