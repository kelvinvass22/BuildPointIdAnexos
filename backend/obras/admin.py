from django.contrib import admin

from .models import Obra


@admin.register(Obra)
class ObraAdmin(admin.ModelAdmin):
    list_display = ("nome", "numero_art", "dono", "gerente", "status", "raio_metros", "criada_em")
    list_filter = ("status",)
    search_fields = ("nome", "endereco", "numero_art")
    autocomplete_fields = ["gerente"]  # só selecionar um gerente já existente, sem popup de "+ novo"
