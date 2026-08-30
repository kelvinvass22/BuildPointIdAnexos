from django.contrib import admin

from .models import Obra, VinculoGerente


class VinculoGerenteInline(admin.TabularInline):
    model = VinculoGerente
    extra = 0
    autocomplete_fields = ["gerente"]


@admin.register(Obra)
class ObraAdmin(admin.ModelAdmin):
    list_display = ("nome", "numero_art", "dono", "status", "raio_metros", "criada_em")
    list_filter = ("status",)
    search_fields = ("nome", "endereco", "numero_art")
    inlines = [VinculoGerenteInline]
