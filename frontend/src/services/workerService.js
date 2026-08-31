import api from './api';

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
   * Registra uma batida de ponto (RF07-RF11), com o vetor facial já
   * extraído no dispositivo.
   * Rota: POST /api/marcacoes/
   *
   * Erros conhecidos, devolvidos com { status, codigo, message }:
   *  403 FORA_DO_PERIMETRO        -> operário fora do raio da obra
   *  412 BIOMETRIA_AUSENTE        -> operário sem biometria cadastrada
   *  401 IDENTIDADE_NAO_CONFIRMADA -> vetor não bateu com o cadastrado
   */
  async registrarPonto({ obraId, latitude, longitude, precisaoGpsMetros, tipo, vetorFacial, dispositivoId, sistemaOperacional }) {
    try {
      const response = await api.post('/api/marcacoes/', {
        obra_id: obraId,
        latitude,
        longitude,
        precisao_gps_metros: precisaoGpsMetros,
        tipo,
        vetor_facial: vetorFacial,
        ...(dispositivoId ? { dispositivo_id: dispositivoId } : {}),
        ...(sistemaOperacional ? { sistema_operacional: sistemaOperacional } : {}),
      });
      return response.data;
    } catch (error) {
      const codigo = error?.response?.data?.codigo;
      const status = error?.response?.status;
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
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

  /**
   * Baixa a URL de recibo em PDF de uma marcação (o app abre/baixa a resposta como PDF).
   * Rota: GET /api/marcacoes/{id}/recibo/
   */
  reciboUrl(marcacaoId) {
    return `${api.defaults.baseURL}/api/marcacoes/${marcacaoId}/recibo/`;
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
    const response = await api.get('/api/marcacoes/historico/', {
      params: { page },
    });

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
      };
    });

    const currentMonthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return {
      month: {
        label: currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1),
        daysWorked: response.data?.count || formattedEntries.length,
        extraHours: '0h',
      },
      entries: formattedEntries,
    };
  },
};

export default workerService;