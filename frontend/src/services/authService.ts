import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AuthError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export const authService = {
  /**
   * Realiza login do usuário com CPF e Senha.
   * Envia o payload no formato: { cpf: string, password: string }
   *
   * IMPORTANTE: por padrão o Axios já rejeita a Promise para qualquer
   * status fora do range 2xx (400, 401, 500, etc.), então o `catch`
   * abaixo é suficiente. Se o seu `api.js` (instância do Axios) tiver
   * um `validateStatus` customizado ou um interceptor de resposta que
   * "engole" o erro, isso precisa ser corrigido lá — senão o login
   * nunca vai lançar exceção mesmo quando a API retornar 401.
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

      // Repassa um erro padronizado para a tela conseguir exibir
      // a mensagem correta no Alert.
      throw new AuthError(
        backendMessage || 'CPF ou senha inválidos, ou erro no servidor.',
        error?.response?.status
      );
    }

    // Confirmação explícita de sucesso (200/201). Qualquer outro status
    // já teria caído no catch acima, mas deixamos essa checagem
    // como segunda camada de segurança.
    if (!response || response.status < 200 || response.status >= 300 || !response.data) {
      throw new AuthError('Resposta inesperada do servidor.', response?.status);
    }

    const { token, access } = response.data;
    const authToken = token || access;

    if (!authToken) {
      // A API respondeu 200/201 mas sem token = não é um login válido.
      throw new AuthError('Login não retornou token de autenticação.', response.status);
    }

    await AsyncStorage.setItem('@BuildPoint:token', authToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

    if (response.data.role) {
      await AsyncStorage.setItem('@BuildPoint:role', response.data.role);
    }

    return response.data;
  },

  /**
   * Remove dados de autenticação locais ao deslogar.
   */
  async logout(): Promise<void> {
    await AsyncStorage.removeItem('@BuildPoint:token');
    await AsyncStorage.removeItem('@BuildPoint:role');
    delete api.defaults.headers.common['Authorization'];
  },

  /**
   * Recupera o token salvo localmente.
   */
  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('@BuildPoint:token');
  },
};

export default authService;