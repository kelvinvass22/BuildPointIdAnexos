"""RelatorioFrequencia — traduz a classe do Diagrama de Classes (Etapa 3). RF03."""
import uuid

from django.db import models


class RelatorioFrequencia(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    obra = models.ForeignKey("obras.Obra", on_delete=models.CASCADE, related_name="relatorios_frequencia")
    periodo_inicio = models.DateField()
    periodo_fim = models.DateField()
    percentual_presenca = models.FloatField()
    total_marcacoes = models.IntegerField()
    gerado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "relatorios_frequencia"
        verbose_name = "Relatório de Frequência"
        verbose_name_plural = "Relatórios de Frequência"
        ordering = ["-gerado_em"]

    def __str__(self):
        return f"Relatório {self.obra} ({self.periodo_inicio} a {self.periodo_fim})"

    @classmethod
    def gerar(cls, obra, periodo_inicio, periodo_fim):
        """RF03: dashboard com métricas de frequência (UC03)."""
        from ponto.models import MarcacaoPonto

        marcacoes = MarcacaoPonto.objects.filter(
            obra=obra, data_hora__date__gte=periodo_inicio, data_hora__date__lte=periodo_fim
        )
        total = marcacoes.count()
        dias_periodo = (periodo_fim - periodo_inicio).days + 1
        operarios_ativos = obra.operarios.filter(usuario__ativo=True).count() or 1
        esperado = dias_periodo * operarios_ativos
        percentual = round((total / esperado) * 100, 2) if esperado else 0.0

        return cls.objects.create(
            obra=obra,
            periodo_inicio=periodo_inicio,
            periodo_fim=periodo_fim,
            percentual_presenca=percentual,
            total_marcacoes=total,
        )
