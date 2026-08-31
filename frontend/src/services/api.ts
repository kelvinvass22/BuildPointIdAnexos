import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chaves usadas em todo o app para persistir a sessão localmente.
// Centralizadas aqui para não existir divergência entre quem grava (authService)
// e quem lê (o interceptor abaixo).
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@BuildPoint:accessToken',
  REFRESH_TOKEN: '@BuildPoint:refreshToken',
  PAPEL: '@BuildPoint:papel',
  USUARIO_ID: '@BuildPoint:usuarioId',
  NOME: '@BuildPoint:nome',
};

const api = axios.create({
  // @ts-ignore
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://buildpointid.onrender.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Anexa o Access Token JWT em toda chamada.
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Erro ao buscar o token de autenticação:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh automático: se uma chamada autenticada voltar 401, tenta renovar o
// access token uma única vez via /api/auth/refresh/ e repete a chamada original.
// Se o refresh também falhar, limpa a sessão local (o app deve então mandar o
// usuário de volta para a tela de login).
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function resolveQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const isAuthEndpoint =
      originalRequest?.url?.includes('/api/auth/login/') ||
      originalRequest?.url?.includes('/api/auth/refresh/');

    if (error?.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      isRefreshing = true;
      try {
        const refresh = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (!refresh) throw error;

        const { data } = await axios.post(`${api.defaults.baseURL}/api/auth/refresh/`, { refresh });
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
        resolveQueue(data.access);

        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        resolveQueue(null);
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.PAPEL,
          STORAGE_KEYS.USUARIO_ID,
          STORAGE_KEYS.NOME,
        ]);
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
