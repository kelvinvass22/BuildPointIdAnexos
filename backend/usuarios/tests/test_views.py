from unittest.mock import patch
from django.apps import apps
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from usuarios.models import Papel, PerfilDono, PerfilGerente, PerfilOperario, Usuario

Obra = apps.get_model("obras", "Obra")
VinculoGerente = apps.get_model("obras", "VinculoGerente")


@override_settings(SECURE_SSL_REDIRECT=False)
class LoginViewTestCase(APITestCase):
    def setUp(self):
        self.url = reverse("login")
        self.cpf = "12345678901"
        self.senha = "SenhaForte123!"

        self.usuario = Usuario.objects.create_user(
            username=self.cpf,
            cpf=self.cpf,
            email="dono@teste.com",
            password=self.senha,
            papel=Papel.DONO,
            first_name="Carlos",
            last_name="Dono"
        )
        PerfilDono.objects.create(usuario=self.usuario)

    def test_login_com_sucesso(self):
        """Testa o login por CPF + Senha devolvendo os tokens JWT e a tela inicial"""
        payload = {"cpf": self.cpf, "password": self.senha}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["papel"], "DONO")
        self.assertEqual(response.data["tela_inicial"], "perfil_dono")

    def test_login_com_credenciais_invalidas(self):
        """Garante rejeição com HTTP 400 em caso de senha errada"""
        payload = {"cpf": self.cpf, "password": "SenhaErrada!"}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(SECURE_SSL_REDIRECT=False)
class MeViewTestCase(APITestCase):
    def setUp(self):
        self.url = reverse("usuarios:me")

        self.usuario = Usuario.objects.create_user(
            username="22222222222",
            cpf="22222222222",
            password="123",
            papel=Papel.GERENTE,
            first_name="Ana",
            last_name="Gerente"
        )
        PerfilGerente.objects.create(usuario=self.usuario)

    def test_me_endpoint_nao_autenticado(self):
        """Requisição sem token deve retornar HTTP 401"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_autenticado(self):
        """Retorna dados do usuário logado + tela_inicial do polimorfismo"""
        self.client.force_authenticate(user=self.usuario)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["cpf"], "22222222222")
        self.assertEqual(response.data["tela_inicial"], "home_gerente")


@override_settings(SECURE_SSL_REDIRECT=False)
class CadastrarGerenteViewTestCase(APITestCase):
    def setUp(self):
        self.url = reverse("usuarios:cadastrar_gerente")

        self.dono = Usuario.objects.create_user(
            username="11111111111", cpf="11111111111", password="123", papel=Papel.DONO
        )
        PerfilDono.objects.create(usuario=self.dono)

        self.gerente = Usuario.objects.create_user(
            username="22222222222", cpf="22222222222", password="123", papel=Papel.GERENTE
        )
        PerfilGerente.objects.create(usuario=self.gerente)

        self.payload = {
            "nome_completo": "Roberto Silva",
            "cpf": "33333333333",
            "email": "roberto@teste.com",
            "telefone": "85988887777",
            "senha_inicial": "SenhaForte123!"
        }

    @patch("usuarios.serializers.CadastrarGerenteSerializer.to_representation", return_value={})
    def test_dono_pode_cadastrar_gerente(self, mock_to_rep):
        """UC02 / RF02: Somente o Dono pode cadastrar gerentes"""
        self.client.force_authenticate(user=self.dono)
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Usuario.objects.filter(cpf="33333333333").exists())
        novo_usuario = Usuario.objects.get(cpf="33333333333")
        self.assertEqual(novo_usuario.papel, Papel.GERENTE)

    def test_gerente_nao_pode_cadastrar_gerente(self):
        """RBAC (RS01): Gerente tentando cadastrar outro gerente deve receber 403 Forbidden"""
        self.client.force_authenticate(user=self.gerente)
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


@override_settings(SECURE_SSL_REDIRECT=False)
class CadastrarOperarioViewTestCase(APITestCase):
    def setUp(self):
        self.url = reverse("usuarios:cadastrar_operario")

        self.dono = Usuario.objects.create_user(
            username="11111111111", cpf="11111111111", password="123", papel=Papel.DONO
        )
        PerfilDono.objects.create(usuario=self.dono)

        self.gerente = Usuario.objects.create_user(
            username="22222222222", cpf="22222222222", password="123", papel=Papel.GERENTE
        )
        PerfilGerente.objects.create(usuario=self.gerente)

        self.obra = Obra.objects.create(
            nome="Obra Residencial 01",
            dono=self.dono,
            latitude_centro=-3.7319,
            longitude_centro=-38.5267
        )
        VinculoGerente.objects.create(obra=self.obra, gerente=self.gerente, especialidade="Geral")

        self.payload = {
            "nome_completo": "João Operário",
            "cpf": "44444444444",
            "email": "joao@teste.com",
            "cargo": "Servente",
            "senha_inicial": "SenhaForte123!",
            "obra_id": str(self.obra.id)
        }

    def test_gerente_pode_cadastrar_operario(self):
        """UC05 / RF05: Somente Gerente cadastra operários"""
        self.client.force_authenticate(user=self.gerente)
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Usuario.objects.filter(cpf="44444444444").exists())
        operario = Usuario.objects.get(cpf="44444444444")
        self.assertEqual(operario.papel, Papel.OPERARIO)

    def test_dono_nao_pode_cadastrar_operario(self):
        """RBAC (RS01): Dono tentando cadastrar operário diretamente é negado com 403"""
        self.client.force_authenticate(user=self.dono)
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


@override_settings(SECURE_SSL_REDIRECT=False)
class ListarOperariosViewTestCase(APITestCase):
    def setUp(self):
        self.url = reverse("usuarios:listar_operarios")

        self.dono = Usuario.objects.create_user(
            username="11111111111", cpf="11111111111", password="123", papel=Papel.DONO
        )
        PerfilDono.objects.create(usuario=self.dono)

        self.gerente = Usuario.objects.create_user(
            username="22222222222", cpf="22222222222", password="123", papel=Papel.GERENTE
        )
        PerfilGerente.objects.create(usuario=self.gerente)

        self.obra = Obra.objects.create(
            nome="Obra Comercial",
            dono=self.dono,
            latitude_centro=-3.7319,
            longitude_centro=-38.5267
        )
        VinculoGerente.objects.create(obra=self.obra, gerente=self.gerente, especialidade="Geral")

        self.operario_user = Usuario.objects.create_user(
            username="55555555555", cpf="55555555555", password="123", papel=Papel.OPERARIO
        )
        self.perfil_operario = PerfilOperario.objects.create(
            usuario=self.operario_user,
            cargo="Eletricista",
            obra=self.obra
        )

    def test_gerente_e_dono_podem_listar_operarios(self):
        """Acesso permitido para EhGerente | EhDono"""
        self.client.force_authenticate(user=self.gerente)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data["results"] if isinstance(response.data, dict) and "results" in response.data else response.data
        self.assertEqual(len(results), 1)

        self.client.force_authenticate(user=self.dono)
        response_dono = self.client.get(self.url)
        self.assertEqual(response_dono.status_code, status.HTTP_200_OK)

        results_dono = response_dono.data["results"] if isinstance(response_dono.data, dict) and "results" in response_dono.data else response_dono.data
        self.assertEqual(len(results_dono), 1)

    def test_operario_nao_pode_listar_operarios(self):
        """Operário comum não pode acessar o endpoint de listagem"""
        self.client.force_authenticate(user=self.operario_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)