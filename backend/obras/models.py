"""Obra — traduz a classe Obra do Diagrama de Classes (Etapa 3)."""
import uuid
from math import asin, cos, radians, sin, sqrt

from django.core.validators import MinValueValidator
from django.db import models

from usuarios.models import TipoGerente

RAIO_TERRA_METROS = 6371000


class StatusObra(models.TextChoices):
    ATIVA = "ATIVA", "Ativa"
    PAUSADA = "PAUSADA", "Pausada"
    ENCERRADA = "ENCERRADA", "Encerrada"


class Obra(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dono = models.ForeignKey(
        "usuarios.Usuario", on_delete=models.PROTECT, related_name="obras",
        limit_choices_to={"papel": "DONO"},
    )
    gerentes = models.ManyToManyField(
        "usuarios.Usuario", through="VinculoGerente", related_name="obras_gerenciadas",
        blank=True,
    )
    nome = models.CharField(max_length=150)
    endereco = models.CharField(max_length=255)
    numero_art = models.CharField(
        "Número da ART/RRT",
        max_length=30,
        blank=True,
        help_text=(
            "Anotação de Responsabilidade Técnica (CREA) ou Registro de "
            "Responsabilidade Técnica (CAU) da obra -- não é preciso CNPJ "
            "pra cadastrar. Obrigatória por lei (6.496/77) antes do início "
            "da obra, mas deixamos opcional aqui pra não travar o cadastro "
            "de obras já em andamento sem o número à mão ainda."
        ),
    )
    latitude_centro = models.FloatField()
    longitude_centro = models.FloatField()
    raio_metros = models.FloatField(
        default=5.0, validators=[MinValueValidator(5.0)],
    )  # RNF03: geofencing estrito, mínimo de 5 m (também validado em ConfigurarGeofenceSerializer)
    status = models.CharField(max_length=10, choices=StatusObra.choices, default=StatusObra.ATIVA)
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "obras"
        verbose_name = "Obra"
        verbose_name_plural = "Obras"
        ordering = ["nome"]

    def __str__(self):
        return self.nome

    def definir_perimetro(self, latitude, longitude, raio_metros):
        """UC04 — Configurar Raio de Ponto (RF04)."""
        self.latitude_centro = latitude
        self.longitude_centro = longitude
        self.raio_metros = raio_metros
        self.save(update_fields=["latitude_centro", "longitude_centro", "raio_metros"])

    def calcular_distancia(self, latitude: float, longitude: float) -> float:
        """Distância em metros até o centro da obra (fórmula de Haversine)."""
        lat1, lon1, lat2, lon2 = map(
            radians, [self.latitude_centro, self.longitude_centro, latitude, longitude]
        )
        dlat, dlon = lat2 - lat1, lon2 - lon1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        a = max(0.0, min(1.0, a))
        return RAIO_TERRA_METROS * 2 * asin(sqrt(a))

    def esta_dentro_do_raio(self, latitude: float, longitude: float) -> bool:
        """
        RF08/RT03: SEMPRE recalculada no servidor. Nunca aceitar um booleano
        "dentro do raio" vindo do app -- um cliente adulterado poderia mentir.
        """
        return self.calcular_distancia(latitude, longitude) <= self.raio_metros


class VinculoGerente(models.Model):
    """
    Tabela de associação Obra<->Gerente com o atributo `especialidade`
    (ex.: elétrica, civil, segurança do trabalho) -- feedback do professor:
    "Obra tem vários gerentes como gerente de elétrica...". Substitui o
    antigo `Obra.gerente` (OneToOne) por um M:N: uma obra pode ter vários
    gerentes (um por especialidade) e um gerente pode atender mais de uma obra.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    obra = models.ForeignKey(Obra, on_delete=models.CASCADE, related_name="vinculos_gerente")
    gerente = models.ForeignKey(
        "usuarios.Usuario", on_delete=models.CASCADE, related_name="vinculos_obra",
        limit_choices_to={"papel": "GERENTE"},
    )
    especialidade = models.CharField(max_length=100)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "vinculos_gerente"
        verbose_name = "Vínculo de Gerente"
        verbose_name_plural = "Vínculos de Gerente"
        constraints = [
            models.UniqueConstraint(fields=["obra", "gerente", "especialidade"], name="vinculo_gerente_unico"),
        ]

    def __str__(self):
        return f"{self.gerente} — {self.especialidade} ({self.obra.nome})"


class Equipe(models.Model):
    """Grupo operacional de trabalhadores dentro de uma obra."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    obra = models.ForeignKey(Obra, on_delete=models.CASCADE, related_name="equipes")
    nome = models.CharField(max_length=100)
    gerente = models.ForeignKey(
        "usuarios.Usuario", on_delete=models.PROTECT, related_name="equipes_lideradas",
        limit_choices_to={"papel": "GERENTE"},
    )
    membros = models.ManyToManyField("usuarios.PerfilOperario", related_name="equipes", blank=True)
    ativa = models.BooleanField(default=True)
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "equipes"
        constraints = [models.UniqueConstraint(fields=["obra", "nome"], name="equipe_nome_unico_por_obra")]
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} ({self.obra.nome})"
