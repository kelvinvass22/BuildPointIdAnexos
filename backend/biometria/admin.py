from django.contrib import admin

from .models import BiometriaFacial


@admin.register(BiometriaFacial)
class BiometriaFacialAdmin(admin.ModelAdmin):
    # De propósito: vetor_criptografado NÃO aparece na listagem nem é editável (RS02/LGPD).
    list_display = ("operario", "algoritmo", "qualidade_amostra", "capturado_em")
    readonly_fields = ("vetor_criptografado", "capturado_em")
