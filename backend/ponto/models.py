"""
MarcacaoPonto, LogAuditoria, SessaoOffline — traduz o núcleo do Diagrama
de Classes da Etapa 3. É o coração do sistema (UC06, SQ01).
"""
import uuid

from django.db import models


class TipoMarcacao(models.TextChoices):
    ENTRADA = "ENTRADA", "Entrada"
    SAIDA = "SAIDA", "Saída"
    INTERVALO_INICIO = "INTERVALO_INICIO", "Início do intervalo"
    INTERVALO_FIM = "INTERVALO_FIM", "Fim do intervalo"


class OrigemMarcacao(models.TextChoices):
    APP_OPERARIO = "APP_OPERARIO", "App do operário"
    CONTINGENCIA_GERENTE = "CONTINGENCIA_GERENTE", "Contingência (gerente)"
    SYNC_OFFLINE = "SYNC_OFFLINE", "Sincronização offline"


class StatusSync(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    SINCRONIZADO = "SINCRONIZADO", "Sincronizado"
    FALHA = "FALHA", "Falha"


class SessaoOffline(models.Model):
    """Batida feita sem internet, guardada localmente e sincronizada depois (SQ01, alt [Sem internet])."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dispositivo_id = models.CharField(max_length=100)
    criada_em = models.DateTimeField(auto_now_add=True)
    sincronizada_em = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=StatusSync.choices, default=StatusSync.PENDENTE)

    class Meta:
        db_table = "sessoes_offline"
        verbose_name = "Sessão Offline"
        verbose_name_plural = "Sessões Offline"

    def __str__(self):
        return f"Sessão {self.dispositivo_id} ({self.status})"


class MarcacaoPonto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nsr = models.CharField(
        "Número Sequencial de Registro", max_length=20, unique=True, editable=False,
        help_text="Exigido pelo AFD da Portaria 671/MTE.",
    )
    operario = models.ForeignKey("usuarios.PerfilOperario", on_delete=models.PROTECT, related_name="marcacoes")
    obra = models.ForeignKey("obras.Obra", on_delete=models.PROTECT, related_name="marcacoes")
    data_hora = models.DateTimeField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    precisao_gps_metros = models.FloatField()
    confianca_face = models.FloatField()
    tipo = models.CharField(max_length=20, choices=TipoMarcacao.choices)
    origem = models.CharField(max_length=25, choices=OrigemMarcacao.choices, default=OrigemMarcacao.APP_OPERARIO)
    sincronizado = models.BooleanField(default=True)
    hash_integridade = models.CharField(max_length=64, editable=False)
    sessao_offline = models.ForeignKey(
        SessaoOffline, on_delete=models.SET_NULL, null=True, blank=True, related_name="marcacoes"
    )
    registrado_por = models.ForeignKey(
        "usuarios.Usuario", on_delete=models.PROTECT, related_name="marcacoes_registradas",
        help_text="Normalmente o próprio operário; em contingência (UC07), o gerente.",
    )

    class Meta:
        db_table = "marcacoes_ponto"
        verbose_name = "Marcação de Ponto"
        verbose_name_plural = "Marcações de Ponto"
        ordering = ["-data_hora"]
        indexes = [models.Index(fields=["operario", "data_hora"]), models.Index(fields=["obra", "data_hora"])]

    def __str__(self):
        return f"{self.operario} · {self.get_tipo_display()} · {self.data_hora:%d/%m/%Y %H:%M}"

    def gerar_log_imutavel(self):
        """RS03: log imutável (trabalhador, data/hora, GPS, confiança do Face ID)."""
        from .services import gerar_hash_integridade

        return LogAuditoria.objects.create(marcacao=self, payload_hash=gerar_hash_integridade(self))


class LogAuditoria(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    marcacao = models.OneToOneField(MarcacaoPonto, on_delete=models.PROTECT, related_name="log_auditoria")
    payload_hash = models.CharField(max_length=64)
    registrado_em = models.DateTimeField(auto_now_add=True)
    imutavel = models.BooleanField(default=True)

    class Meta:
        db_table = "logs_auditoria"
        verbose_name = "Log de Auditoria"
        verbose_name_plural = "Logs de Auditoria"

    def __str__(self):
        return f"Log de {self.marcacao_id}"

    def save(self, *args, **kwargs):
        if self.pk is not None:
            # RS03/Portaria 671: uma vez criado, o log não pode ser alterado.
            raise ValueError("LogAuditoria é imutável e não pode ser editado após criado.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("LogAuditoria é imutável e não pode ser apagado (Portaria 671/MTE).")
