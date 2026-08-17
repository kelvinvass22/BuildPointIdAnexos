"""
Modelos de usuário — traduz Usuario/Dono/Gerente/Operario do Diagrama de
Classes da Etapa 3 (docs/03-diagrama-de-classes.md).

Decisão de design: no UML, Dono/Gerente/Operario HERDAM de Usuario
(Usuario <|-- Dono, <|-- Gerente, <|-- Operario). Aqui isso é representado
como COMPOSIÇÃO — um Usuario "tem" um PerfilDono/PerfilGerente/PerfilOperario
1:1 — em vez de herança de tabela múltipla (Multi-Table Inheritance) do
Django. É o mesmo RBAC (RS01), só trocando herança de verdade por um
padrão mais testado em produção: MTI em cima de AUTH_USER_MODEL tem
ressalvas conhecidas com managers e permissions do Django. Fica registrado
que dá pra fazer com herança literal (class Dono(Usuario): ...) se
quiserem seguir o UML ao pé da letra — só exige mais cuidado com o
manager de autenticação.
"""
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class Papel(models.TextChoices):
    DONO = "DONO", "Dono"
    GERENTE = "GERENTE", "Gerente"
    OPERARIO = "OPERARIO", "Operário"


class Usuario(AbstractUser):
    """AUTH_USER_MODEL único. Superclasse do diagrama de classes."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cpf = models.CharField("CPF/CNPJ", max_length=18, unique=True)
    papel = models.CharField(max_length=10, choices=Papel.choices)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    REQUIRED_FIELDS = ["email", "cpf", "papel"]

    class Meta:
        db_table = "usuarios"
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.cpf
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_papel_display()})"

    def get_perfil(self):
        """
        Bridge de polimorfismo: devolve o perfil concreto (PerfilDono,
        PerfilGerente ou PerfilOperario) por trás deste Usuario, sem espalhar
        `if papel == ...` pelo resto do código. Equivalente ao
        getPerfil()/telaInicial() discutido na modelagem de POO.
        """
        return getattr(self, f"perfil_{self.papel.lower()}", None)

    def tela_inicial(self):
        """Cada perfil sabe sua própria tela — ver Figma: Home do Operário /
        Home do Gerente / Perfil Dono. Isso é o polimorfismo que faltava
        no diagrama original."""
        perfil = self.get_perfil()
        return perfil.tela_inicial() if perfil else "login"


class PerfilDono(models.Model):
    usuario = models.OneToOneField(
        Usuario, on_delete=models.CASCADE, related_name="perfil_dono", primary_key=True
    )

    class Meta:
        db_table = "perfis_dono"
        verbose_name = "Perfil de Dono"
        verbose_name_plural = "Perfis de Dono"

    def __str__(self):
        return f"Dono: {self.usuario}"

    def tela_inicial(self):
        return "perfil_dono"


class PerfilGerente(models.Model):
    usuario = models.OneToOneField(
        Usuario, on_delete=models.CASCADE, related_name="perfil_gerente", primary_key=True
    )
    telefone = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = "perfis_gerente"
        verbose_name = "Perfil de Gerente"
        verbose_name_plural = "Perfis de Gerente"

    def __str__(self):
        return f"Gerente: {self.usuario}"

    def tela_inicial(self):
        return "home_gerente"


class PerfilOperario(models.Model):
    usuario = models.OneToOneField(
        Usuario, on_delete=models.CASCADE, related_name="perfil_operario", primary_key=True
    )
    cargo = models.CharField(max_length=100, blank=True)
    obra = models.ForeignKey(
        "obras.Obra", on_delete=models.SET_NULL, null=True, blank=True, related_name="operarios"
    )
    biometria_cadastrada_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "perfis_operario"
        verbose_name = "Perfil de Operário"
        verbose_name_plural = "Perfis de Operário"

    def __str__(self):
        return f"Operário: {self.usuario}"

    def tela_inicial(self):
        return "home_operario"

    @property
    def possui_biometria_ativa(self):
        return hasattr(self, "biometria")
