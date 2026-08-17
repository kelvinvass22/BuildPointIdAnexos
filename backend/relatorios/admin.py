from django.contrib import admin

from .models import RelatorioFrequencia


@admin.register(RelatorioFrequencia)
class RelatorioFrequenciaAdmin(admin.ModelAdmin):
    list_display = ("obra", "periodo_inicio", "periodo_fim", "percentual_presenca", "total_marcacoes")
    list_filter = ("obra",)
