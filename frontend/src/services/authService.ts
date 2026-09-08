import api, { STORAGE_KEYS } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import secureBiometryStore from './secureBiometryStore';

export class AuthError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

// PapelEnum do backend -> Stack de navegação do app (ver App.js)
export const ROLE_TO_STACK: Record<string, string> = {
  DONO: 'OwnerStack',
  GERENTE: 'ManagerStack',
  OPERARIO: 'WorkerStack',
};

export const authService = {
  /**
   * Realiza login do usuário com CPF e Senha.
   * Envia o payload no formato: { cpf: string, password: string }
   *
   * Resposta esperada do backend (200):
   * { refresh, access, usuario_id, nome, papel, tela_inicial }
   *
   * @param {string} cpf - CPF do usuário
   * @param {string} password - Senha do usuário
   */
  async login(cpf: string, password: string): Promise<any> {
    const cleanCpf = cpf.replace(/\D/g, '');

    let response;
    try {
      response = await api.post('/api/auth/login/', {
        cpf: cleanCpf,
        password: password,
      });
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.response?.data?.error;

      console.error('Erro na requisição de login:', error?.response?.data || error.message);

      throw new AuthError(
        backendMessage || 'CPF ou senha inválidos, ou erro no servidor.',
        error?.response?.status
      );
    }

    if (!response || response.status < 200 || response.status >= 300 || !response.data) {
      throw new AuthError('Resposta inesperada do servidor.', response?.status);
    }

    const { access, refresh, usuario_id, nome, papel, tela_inicial } = response.data;

    if (!access || !refresh) {
      throw new AuthError('Login não retornou tokens de autenticação.', response.status);
    }

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, access],
      [STORAGE_KEYS.REFRESH_TOKEN, refresh],
      [STORAGE_KEYS.PAPEL, papel || ''],
      [STORAGE_KEYS.USUARIO_ID, usuario_id || ''],
      [STORAGE_KEYS.NOME, nome || ''],
    ]);

    return { access, refresh, usuario_id, nome, papel, tela_inicial };
  },

  /**
   * Remove dados de autenticação locais ao deslogar. Também limpa o cache
   * de biometria offline (secureBiometryStore) -- o embedding autorizado
   * de quem estava logado não deve continuar acessível no aparelho depois
   * que a sessão encerra.
   */
  async logout(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.PAPEL,
      STORAGE_KEYS.USUARIO_ID,
      STORAGE_KEYS.NOME,
    ]);
    await secureBiometryStore.limpar().catch((err) => {
      console.warn('Não foi possível limpar o cache de biometria offline no logout:', err);
    });
  },

  /**
   * Recupera o token de acesso salvo localmente.
   */
  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  /**
   * Recupera o papel (DONO | GERENTE | OPERARIO) salvo no último login.
   */
  async getStoredPapel(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.PAPEL);
  },

  /**
   * Recupera o id do usuário logado, salvo no último login.
   */
  async getStoredUsuarioId(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.USUARIO_ID);
  },
};

export default authService;
