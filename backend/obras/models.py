"""Obra — traduz a classe Obra do Diagrama de Classes (Etapa 3)."""
import uuid
from math import asin, cos, radians, sin, sqrt

from django.db import models

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
    gerente = models.OneToOneField(
        "usuarios.Usuario", on_delete=models.PROTECT, related_name="obra_gerenciada",
        limit_choices_to={"papel": "GERENTE"}, null=True, blank=True,
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
    raio_metros = models.FloatField(default=5.0)  # RNF03: geofencing estrito de 5 m
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
        return RAIO_TERRA_METROS * 2 * asin(sqrt(a))

    def esta_dentro_do_raio(self, latitude: float, longitude: float) -> bool:
        """
        RF08/RT03: SEMPRE recalculada no servidor. Nunca aceitar um booleano
        "dentro do raio" vindo do app -- um cliente adulterado poderia mentir.
        """
        return self.calcular_distancia(latitude, longitude) <= self.raio_metros
