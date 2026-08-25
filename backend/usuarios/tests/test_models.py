from django.test import TestCase
from usuarios.models import Usuario, PerfilDono, PerfilGerente, PerfilOperario, Papel

class UsuarioModelTestCase(TestCase):
    def setUp(self):
        # 1. Dono
        self.dono = Usuario.objects.create_user(
            username="111.111.111-11",
            cpf="111.111.111-11",
            email="dono@buildpoint.com",
            password="SenhaSegura123!",
            papel=Papel.DONO
        )
        self.perfil_dono = PerfilDono.objects.create(usuario=self.dono)

        # 2. Gerente
        self.gerente = Usuario.objects.create_user(
            username="222.222.222-22",
            cpf="222.222.222-22",
            email="gerente@buildpoint.com",
            password="SenhaSegura123!",
            papel=Papel.GERENTE
        )
        self.perfil_gerente = PerfilGerente.objects.create(
            usuario=self.gerente, 
            telefone="85999999999"
        )

        # 3. Operário
        self.operario = Usuario.objects.create_user(
            username="333.333.333-33",
            cpf="333.333.333-33",
            email="operario@buildpoint.com",
            password="SenhaSegura123!",
            papel=Papel.OPERARIO
        )
        self.perfil_operario = PerfilOperario.objects.create(
            usuario=self.operario, 
            cargo="Pedreiro"
        )

    def test_username_e_definido_como_cpf_automaticamente(self):
        """Garante que o método save() atribui o CPF como username quando vazio"""
        self.assertEqual(self.dono.username, "111.111.111-11")
        self.assertEqual(self.gerente.username, "222.222.222-22")

    def test_polimorfismo_get_perfil(self):
        """Verifica se o bridge get_perfil() retorna a instância correta de cada perfil"""
        self.assertIsInstance(self.dono.get_perfil(), PerfilDono)
        self.assertIsInstance(self.gerente.get_perfil(), PerfilGerente)
        self.assertIsInstance(self.operario.get_perfil(), PerfilOperario)

    def test_tela_inicial_retorna_string_correta_para_cada_papel(self):
        """Testa o método polimórfico tela_inicial() em todos os perfis"""
        self.assertEqual(self.dono.tela_inicial(), "perfil_dono")
        self.assertEqual(self.gerente.tela_inicial(), "home_gerente")
        self.assertEqual(self.operario.tela_inicial(), "home_operario")

    def test_usuario_sem_perfil_retorna_login_na_tela_inicial(self):
        """Garante resiliência caso um usuário fique temporariamente sem perfil vinculado"""
        usuario_sem_perfil = Usuario.objects.create_user(
            username="999.999.999-99",
            cpf="999.999.999-99",
            password="123",
            papel=Papel.OPERARIO
        )
        self.assertIsNone(usuario_sem_perfil.get_perfil())
        self.assertEqual(usuario_sem_perfil.tela_inicial(), "login")

    def test_propriedade_possui_biometria_ativa(self):
        """Testa o atributo de verificação de biometria no perfil do operário"""
        self.assertFalse(self.perfil_operario.possui_biometria_ativa)