from django.contrib import admin

from .models import LogAuditoria, MarcacaoPonto, SessaoOffline


@admin.register(MarcacaoPonto)
class MarcacaoPontoAdmin(admin.ModelAdmin):
    list_display = ("nsr", "operario", "obra", "tipo", "data_hora", "confianca_face", "sincronizado")
    list_filter = ("tipo", "origem", "sincronizado", "obra")
    search_fields = ("nsr", "operario__usuario__cpf", "operario__usuario__first_name")
    readonly_fields = ("hash_integridade",)

    def has_change_permission(self, request, obj=None):
        return False  # RS03: marcação não é editável, nem pelo admin

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(LogAuditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ("marcacao", "payload_hash", "registrado_em", "imutavel")

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SessaoOffline)
class SessaoOfflineAdmin(admin.ModelAdmin):
    list_display = ("dispositivo_id", "status", "criada_em", "sincronizada_em")
    list_filter = ("status",)
