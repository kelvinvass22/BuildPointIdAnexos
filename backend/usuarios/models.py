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
    # Papel de suporte técnico -- NÃO tem tela no app (ver LoginSerializer,
    # que recusa login mobile pra essa conta). Existe só pra dar um valor
    # válido de `papel` (campo obrigatório) a um superusuário criado via
    # `python manage.py createsuperuser`, que usa exclusivamente o painel
    # /admin/ do Django (já com todos os models registrados em admin.py).
    ADMIN = "ADMIN", "Administrador"


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
        # NUNCA cair pro `username` aqui -- ele é sempre igual ao CPF (ver
        # `save()` acima), então isso já vazou o CPF como se fosse o nome
        # em telas/relatórios que só tinham `str(usuario)` à mão (bug
        # relatado: "nome do usuário aparecendo com CPF"). A causa raiz era
        # o Django Admin permitir criar um Usuario sem nome (ver
        # `UsuarioAdmin.add_fieldsets`, corrigido); isso aqui é a segunda
        # camada de defesa pros que já foram criados assim.
        return f"{self.get_full_name() or '(sem nome cadastrado)'} ({self.get_papel_display()})"

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


class TipoGerente(models.TextChoices):
    """
    Catálogo fixo de especialidades de gerente (substitui o antigo texto
    livre) -- funciona como uma "sub-role" dentro do papel GERENTE: define
    o que aquele gerente supervisiona, tanto no perfil (`PerfilGerente.
    tipo_gerente`, especialidade "padrão" da pessoa) quanto por obra
    (`obras.models.VinculoGerente.especialidade` -- o mesmo gerente pode
    ter especialidades diferentes em obras diferentes).
    """
    OBRA = "OBRA", "Gerente de Obra"
    CIVIL_ESTRUTURAL = "CIVIL_ESTRUTURAL", "Gerente Civil/Estrutural"
    ELETRICA = "ELETRICA", "Gerente Elétrico"
    HIDRAULICA = "HIDRAULICA", "Gerente Hidráulico/Sanitário"
    SEGURANCA_TRABALHO = "SEGURANCA_TRABALHO", "Gerente de Segurança do Trabalho"
    QUALIDADE = "QUALIDADE", "Gerente de Qualidade"
    PLANEJAMENTO = "PLANEJAMENTO", "Gerente de Planejamento e Controle"
    SUPRIMENTOS = "SUPRIMENTOS", "Gerente de Suprimentos/Compras"
    MANUTENCAO = "MANUTENCAO", "Gerente de Manutenção/Equipamentos"
    AMBIENTAL = "AMBIENTAL", "Gerente Ambiental"
    FINANCEIRO = "FINANCEIRO", "Gerente Financeiro"
    RECURSOS_HUMANOS = "RECURSOS_HUMANOS", "Gerente de Recursos Humanos"
    COMERCIAL = "COMERCIAL", "Gerente Comercial"
    GERAL = "GERAL", "Gerente Geral"
    OUTRO = "OUTRO", "Outro"


class PerfilGerente(models.Model):
    usuario = models.OneToOneField(
        Usuario, on_delete=models.CASCADE, related_name="perfil_gerente", primary_key=True
    )
    telefone = models.CharField(max_length=20, blank=True)
    tipo_gerente = models.CharField(
        max_length=40, choices=TipoGerente.choices, blank=True,
        help_text="Especialidade padrão do gerente (pode variar por obra -- ver VinculoGerente.especialidade).",
    )

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
    tipo_vinculo = models.CharField(
        max_length=20,
        choices=[("PROPRIO", "Próprio"), ("TERCEIRIZADO", "Terceirizado")],
        default="PROPRIO",
    )
    empresa_terceirizada = models.CharField(max_length=150, blank=True)
    endereco = models.CharField(max_length=255, blank=True)
    data_admissao = models.DateField(null=True, blank=True)
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
