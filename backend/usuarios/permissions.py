"""
RBAC (RS01): controle de acesso baseado em papel.

Uma classe de permissão por papel, combináveis com `|` (OR) e `&` (AND) do
DRF, ex.: permission_classes = [EhGerente | EhDono].
"""
from rest_framework.permissions import BasePermission


class _TemPapel(BasePermission):
    papel_exigido = None

    def has_permission(self, request, view):
        usuario = request.user
        return bool(
            usuario and usuario.is_authenticated and usuario.papel == self.papel_exigido
        )


class EhDono(_TemPapel):
    papel_exigido = "DONO"
    message = "Somente o Dono pode acessar este recurso."


class EhGerente(_TemPapel):
    papel_exigido = "GERENTE"
    message = "Somente Gerentes podem acessar este recurso."


class EhOperario(_TemPapel):
    papel_exigido = "OPERARIO"
    message = "Somente Operários podem acessar este recurso."
