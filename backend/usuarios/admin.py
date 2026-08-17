from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import PerfilDono, PerfilGerente, PerfilOperario, Usuario


class UsuarioCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = Usuario
        fields = ("username", "cpf", "papel")


class UsuarioChangeForm(UserChangeForm):
    class Meta:
        model = Usuario
        fields = "__all__"


class ObraInline(admin.TabularInline):
    """
    'Minhas Obras' com linha de '+ Adicionar outro' -- mesma ideia da tela
    Perfil Dono do Figma. Só faz sentido pra quem é Dono, então some pra
    Gerente/Operário via get_inline_instances abaixo.
    """
    from obras.models import Obra

    model = Obra
    fk_name = "dono"
    extra = 1
    fields = ("nome", "endereco", "numero_art", "gerente", "status")
    autocomplete_fields = ["gerente"]


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    add_form = UsuarioCreationForm
    form = UsuarioChangeForm

    list_display = ("username", "cpf", "get_full_name", "papel", "ativo", "criado_em")
    list_filter = ("papel", "ativo")
    search_fields = ("username", "cpf", "first_name", "last_name", "email")
    ordering = ("-criado_em",)

    fieldsets = UserAdmin.fieldsets + (
        ("BuildPoint ID", {"fields": ("cpf", "papel", "ativo")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("BuildPoint ID", {"classes": ("wide",), "fields": ("cpf", "papel")}),
    )

    def get_inline_instances(self, request, obj=None):
        if obj is not None and obj.papel == "DONO":
            return [ObraInline(self.model, self.admin_site)]
        return []


@admin.register(PerfilDono)
class PerfilDonoAdmin(admin.ModelAdmin):
    list_display = ("usuario",)


@admin.register(PerfilGerente)
class PerfilGerenteAdmin(admin.ModelAdmin):
    list_display = ("usuario", "telefone")


@admin.register(PerfilOperario)
class PerfilOperarioAdmin(admin.ModelAdmin):
    list_display = ("usuario", "cargo", "obra", "biometria_cadastrada_em")
    list_filter = ("obra",)
    autocomplete_fields = ["obra"]
