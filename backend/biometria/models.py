"""BiometriaFacial — traduz a classe do Diagrama de Classes (Etapa 3).

RS02: armazenar apenas hash/vetor facial criptografado (sem foto pura).
Este model nunca tem um campo de imagem -- de propósito.
"""
import uuid

from django.db import models


class BiometriaFacial(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operario = models.OneToOneField(
        "usuarios.PerfilOperario", on_delete=models.CASCADE, related_name="biometria"
    )
    vetor_criptografado = models.TextField(help_text="Vetor facial cifrado -- nunca a imagem crua (RS02/LGPD).")
    algoritmo = models.CharField(max_length=50, default="aws-rekognition")
    qualidade_amostra = models.FloatField()
    capturado_em = models.DateTimeField(auto_now_add=True)

    LIMIAR_QUALIDADE_MINIMA = 0.80

    class Meta:
        db_table = "biometrias_faciais"
        verbose_name = "Biometria Facial"
        verbose_name_plural = "Biometrias Faciais"

    def __str__(self):
        return f"Biometria de {self.operario}"

    def validar_qualidade(self) -> bool:
        return self.qualidade_amostra >= self.LIMIAR_QUALIDADE_MINIMA
