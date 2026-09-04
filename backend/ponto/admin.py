from django.contrib import admin

from .models import LogAdministrativo, LogAuditoria, MarcacaoPonto, SessaoOffline


@admin.register(MarcacaoPonto)
class MarcacaoPontoAdmin(admin.ModelAdmin):
    list_display = ("nsr", "operario", "obra", "tipo", "origem", "data_hora", "confianca_face", "dispositivo_id", "sincronizado")
    list_filter = ("tipo", "origem", "sincronizado", "obra")
    search_fields = ("nsr", "operario__usuario__cpf", "operario__usuario__first_name")
    readonly_fields = ("hash_integridade",)

    # BLOQUEIA A CRIAÇÃO MANUAL PELO ADMIN
    def has_add_permission(self, request):
        return False

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


@admin.register(LogAdministrativo)
class LogAdministrativoAdmin(admin.ModelAdmin):
    list_display = ("criado_em", "ator", "acao", "alvo_tipo", "alvo_id")
    list_filter = ("acao", "alvo_tipo")
    search_fields = ("ator__cpf", "alvo_id")
    readonly_fields = ("ator", "acao", "alvo_tipo", "alvo_id", "detalhes", "criado_em")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
