import * as FileSystem from 'expo-file-system';
import api from './api';
import authService from './authService';
import offlinePunchService from './offlinePunchService';
import secureBiometryStore from './secureBiometryStore';
import offlineFaceValidationService from './offlineFaceValidationService';

async function postPonto(payload) {
  const response = await api.post('/api/marcacoes/', payload);
  return response.data;
}

function buildPontoPayload({ obraId, latitude, longitude, precisaoGpsMetros, tipo, vetorFacial, dispositivoId, sistemaOperacional }) {
  return {
    obra_id: obraId,
    latitude,
    longitude,
    precisao_gps_metros: precisaoGpsMetros,
    tipo,
    vetor_facial: vetorFacial,
    ...(dispositivoId ? { dispositivo_id: dispositivoId } : {}),
    ...(sistemaOperacional ? { sistema_operacional: sistemaOperacional } : {}),
  };
}

function getApiErrorMessage(data) {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (data.detail || data.message) return data.detail || data.message;
  const firstFieldError = Object.entries(data).find(([, value]) => Array.isArray(value) && value.length);
  return firstFieldError ? `${firstFieldError[0]}: ${firstFieldError[1][0]}` : null;
}

function formatLocalEntry(record) {
  const dateObj = new Date(record.createdAt);
  const status = record.status === 'SINCRONIZADO' ? 'ok' : record.status === 'FALHA' ? 'alert' : 'warning';
  const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const tipo = record.payload.tipo;

  return {
    id: record.serverData?.id || record.id,
    dateLabel: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    status,
    statusLabel: record.status === 'SINCRONIZADO' ? 'Sincronizado' : record.status === 'FALHA' ? 'Não sincronizado' : 'Aguardando sincronização',
    tipo,
    entrada: tipo === 'ENTRADA' ? formattedTime : '--:--',
    saida: tipo === 'SAIDA' ? formattedTime : '--:--',
    almocoSaida: tipo === 'INTERVALO_INICIO' ? formattedTime : '--:--',
    almocoVolta: tipo === 'INTERVALO_FIM' ? formattedTime : '--:--',
    offline: true,
    // Só existe recibo em PDF pra marcação que já está de verdade no
    // servidor (o backend gera o PDF a partir do registro persistido) --
    // uma marcação ainda só na fila local (SINCRONIZADO viria com o id
    // real do servidor em `serverData.id`) não tem o que baixar ainda.
    podeBaixarRecibo: record.status === 'SINCRONIZADO' && !!record.serverData?.id,
  };
}

export const workerService = {
  /**
   * Obtém os dados de status do operário autenticado para a tela Home.
   * Rota da API: GET /api/usuarios/me/
   */
  async getHomeStatus() {
    const response = await api.get('/api/usuarios/me/');
    const data = response.data;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateLabelStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

    return {
      name: data?.nome_completo || data?.first_name || 'Operário',
      location: data?.perfil?.obra_nome || data?.obra_nome || 'Obra Padrão',
      obraId: data?.perfil?.obra || data?.obra || null,
      possuiBiometriaAtiva: data?.perfil?.possui_biometria_ativa ?? null,
      time: timeStr,
      dateLabel: dateLabelStr.charAt(0).toUpperCase() + dateLabelStr.slice(1),
      raw: data,
    };
  },

  /**
   * Baixa o embedding facial autorizado do PRÓPRIO operário logado e
   * guarda cifrado no aparelho (SecureStore), pra permitir validação
   * facial offline (ver secureBiometryStore/offlineFaceValidationService).
   * Chamado logo após o login e, de forma best-effort, sempre que a Home
   * carregar com internet disponível -- silencioso quando falha (ex.: sem
   * rede, ou operário ainda sem biometria cadastrada): a marcação online
   * continua funcionando normalmente, só a validação OFFLINE fica
   * indisponível até o próximo download bem-sucedido.
   * Rota: GET /api/biometria/minha/
   */
  async baixarBiometriaParaOffline() {
    const response = await api.get('/api/biometria/minha/');
    const { embedding, algoritmo, qualidade_amostra, limiar_confianca, capturado_em } = response.data;
    await secureBiometryStore.salvar({
      embedding,
      algoritmo,
      qualidadeAmostra: qualidade_amostra,
      limiarConfianca: limiar_confianca,
      capturadoEm: capturado_em,
    });
    return true;
  },

  /**
   * Registra uma batida de ponto (RF07-RF11), com o vetor facial já
   * extraído no dispositivo.
   * Rota: POST /api/marcacoes/
   *
   * Fluxo offline (sem internet no momento da batida): antes de só
   * enfileirar a marcação, o app valida a face AGORA MESMO contra o
   * embedding autorizado cacheado no aparelho (ver
   * offlineFaceValidationService) -- o operário sabe na hora se a
   * identidade foi confirmada, sem esperar a sincronização. A marcação só
   * é enfileirada se essa validação local passar; o backend REVALIDA tudo
   * de novo quando sincronizar (é ele quem decide de verdade e grava a
   * auditoria -- a validação local é só pra dar feedback imediato).
   *
   * Erros conhecidos, devolvidos com { status, codigo, message }:
   *  403 FORA_DO_PERIMETRO        -> operário fora do raio da obra
   *  412 BIOMETRIA_AUSENTE        -> operário sem biometria cadastrada
   *  401 IDENTIDADE_NAO_CONFIRMADA -> vetor não bateu com o cadastrado (online ou offline)
   */
  async registrarPonto({ obraId, latitude, longitude, precisaoGpsMetros, tipo, vetorFacial, dispositivoId, sistemaOperacional }) {
    const payload = buildPontoPayload({ obraId, latitude, longitude, precisaoGpsMetros, tipo, vetorFacial, dispositivoId, sistemaOperacional });
    try {
      return await postPonto(payload);
    } catch (error) {
      console.warn('Falha ao registrar ponto:', {
        status: error?.response?.status,
        codigo: error?.response?.data?.codigo,
        detalhe: error?.response?.data?.detail,
        rede: !error?.response,
      });

      if (offlinePunchService.isNetworkError(error)) {
        const validacaoLocal = await offlineFaceValidationService.validar(vetorFacial);

        if (validacaoLocal.semReferenciaCacheada) {
          const err = new Error(
            'Sem internet e sem biometria de referência salva neste aparelho ainda. ' +
              'Conecte-se à internet ao menos uma vez após o cadastro facial antes de bater ponto offline.'
          );
          err.codigo = 'BIOMETRIA_AUSENTE';
          throw err;
        }

        if (!validacaoLocal.identidadeConfirmada) {
          const err = new Error(
            `Não foi possível confirmar sua identidade offline (confiança ${validacaoLocal.confianca.toFixed(3)}). ` +
              'Centralize o rosto, garanta boa iluminação e tente novamente.'
          );
          err.codigo = 'IDENTIDADE_NAO_CONFIRMADA';
          throw err;
        }

        const localRecord = await offlinePunchService.savePending({
          ...payload,
          confianca_face_local: validacaoLocal.confianca,
        });
        return {
          offline: true,
          localId: localRecord.id,
          message: 'Identidade confirmada no aparelho (offline). Marcação salva e será enviada ao servidor quando houver internet.',
        };
      }

      const codigo = error?.response?.data?.codigo;
      const status = error?.response?.status;
      const message =
        getApiErrorMessage(error?.response?.data) ||
        (codigo === 'FORA_DO_PERIMETRO' && 'Você está fora do raio permitido para bater o ponto nesta obra.') ||
        (codigo === 'BIOMETRIA_AUSENTE' && 'Você ainda não tem biometria cadastrada. Procure seu gerente.') ||
        (codigo === 'IDENTIDADE_NAO_CONFIRMADA' && 'Não foi possível confirmar sua identidade. Tente novamente com boa iluminação.') ||
        'Não foi possível registrar o ponto. Tente novamente.';

      const err = new Error(message);
      err.status = status;
      err.codigo = codigo;
      throw err;
    }
  },

  async sincronizarMarcacoesPendentes() {
    return offlinePunchService.syncPending(postPonto);
  },

  /**
   * URL do recibo em PDF de uma marcação. É uma rota AUTENTICADA (exige
   * o Bearer token) -- não dá pra só abrir com `Linking.openURL` (o app
   * fazia isso antes: como a requisição saía sem o header de auth, a API
   * devolvia a tela de erro/login em vez do PDF). Use `baixarRecibo`
   * abaixo pra baixar de verdade.
   * Rota: GET /api/marcacoes/{id}/recibo/
   */
  reciboUrl(marcacaoId) {
    return `${api.defaults.baseURL}/api/marcacoes/${marcacaoId}/recibo/`;
  },

  /**
   * Baixa o PDF do recibo de uma marcação autenticado (anexa o Bearer
   * token manualmente via `FileSystem.downloadAsync`, que não passa pelos
   * interceptors do axios) e devolve o caminho do arquivo salvo no
   * aparelho, pronto pra abrir/compartilhar com `expo-sharing`
   * (ver WorkerHistoryScreen.js).
   */
  async baixarRecibo(marcacaoId) {
    const token = await authService.getToken();
    const destino = `${FileSystem.cacheDirectory}recibo-ponto-${marcacaoId}.pdf`;
    const resultado = await FileSystem.downloadAsync(this.reciboUrl(marcacaoId), destino, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (resultado.status !== 200) {
      throw new Error(
        resultado.status === 401 || resultado.status === 403
          ? 'Sua sessão expirou. Entre novamente para baixar o recibo.'
          : 'Não foi possível baixar o recibo agora.'
      );
    }
    return resultado.uri;
  },

  /**
   * Verifica a integridade de uma marcação (mesma tela pros três papéis).
   * Rota: GET /api/marcacoes/{id}/verificar-integridade/
   */
  async verificarIntegridade(marcacaoId) {
    const response = await api.get(`/api/marcacoes/${marcacaoId}/verificar-integridade/`);
    return response.data;
  },

  /**
   * Obtém o histórico de ponto do operário.
   * Rota da API: GET /api/marcacoes/historico/
   */
  async getHistory(page = 1) {
    await offlinePunchService.syncPending(postPonto);

    let response;
    try {
      response = await api.get('/api/marcacoes/historico/', { params: { page } });
    } catch (error) {
      const localEntries = (await offlinePunchService.getLocalHistory()).map(formatLocalEntry);
      if (!localEntries.length) throw error;
      return {
        month: {
          label: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          daysWorked: localEntries.length,
          extraHours: '0h',
        },
        entries: localEntries,
        offline: true,
      };
    }

    const results = response.data?.results || (Array.isArray(response.data) ? response.data : []);

    const formattedEntries = results.map((item) => {
      const dateObj = item.data_hora ? new Date(item.data_hora) : new Date();
      const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      return {
        id: item.id || String(Math.random()),
        dateLabel: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        status: item.sincronizado ? 'ok' : 'warning',
        tipo: item.tipo,
        entrada: item.tipo === 'ENTRADA' ? formattedTime : '--:--',
        saida: item.tipo === 'SAIDA' ? formattedTime : '--:--',
        almocoSaida: item.tipo === 'INTERVALO_INICIO' ? formattedTime : '--:--',
        almocoVolta: item.tipo === 'INTERVALO_FIM' ? formattedTime : '--:--',
        podeBaixarRecibo: !!item.id,
      };
    });

    const currentMonthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const localEntries = (await offlinePunchService.getLocalHistory())
      .filter((item) => item.status !== 'SINCRONIZADO')
      .map(formatLocalEntry);

    return {
      month: {
        label: currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1),
        daysWorked: response.data?.count || formattedEntries.length,
        extraHours: '0h',
      },
      entries: [...localEntries, ...formattedEntries],
    };
  },
};

export default workerService;
