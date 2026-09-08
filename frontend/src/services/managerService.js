import api from './api';

export const managerService = {
  /**
   * Obtém a(s) obra(s) vinculada(s) ao Gerente autenticado.
   * Não existe um endpoint de "obra atual" no backend: GET /api/obras/ já
   * volta filtrado pelas obras do Gerente logado, então usamos a primeira
   * como "obra atual" do painel.
   * Rota: GET /api/obras/
   */
  async getObraAtual() {
    const response = await api.get('/api/obras/', { params: { page: 1 } });
    const results = response.data?.results || (Array.isArray(response.data) ? response.data : []);
    return results[0] || null;
  },

  /**
   * Detalhe de uma obra específica.
   * Rota: GET /api/obras/{id}/
   */
  async getObra(obraId) {
    const response = await api.get(`/api/obras/${obraId}/`);
    return response.data;
  },

  /**
   * Configura o geofence da obra (RF04): centro (lat/long) e raio em metros.
   * Rota: POST /api/obras/{id}/configurar_geofence/
   */
  async configurarGeofence(obraId, { latitude, longitude, raio_metros, precisao_gps_metros }) {
    const response = await api.post(`/api/obras/${obraId}/configurar_geofence/`, {
      latitude,
      longitude,
      raio_metros,
      ...(precisao_gps_metros != null ? { precisao_gps_metros } : {}),
    });
    return response.data;
  },

  /**
   * Lista os operários das obras do Gerente/Dono autenticado.
   * Rota: GET /api/usuarios/operarios/
   */
  async listOperarios(page = 1) {
    const response = await api.get('/api/usuarios/operarios/', { params: { page } });
    const data = response.data;
    return {
      results: data?.results || (Array.isArray(data) ? data : []),
      count: data?.count ?? (Array.isArray(data) ? data.length : 0),
    };
  },

  /**
   * Presença do dia: deriva da lista de operários + histórico de marcações
   * de hoje (não existe um endpoint dedicado de "presença diária").
   */
  async getDailyAttendance() {
    const [operariosData, historicoResponse] = await Promise.all([
      this.listOperarios(),
      api.get('/api/marcacoes/historico/', { params: { page: 1 } }),
    ]);

    const operarios = operariosData.results || [];
    const marcacoes = historicoResponse.data?.results || (Array.isArray(historicoResponse.data) ? historicoResponse.data : []);

    const todayStr = new Date().toDateString();
    const todaysMarcacoes = marcacoes.filter((m) => m.data_hora && new Date(m.data_hora).toDateString() === todayStr);

    // Última marcação de hoje por operário.
    const lastByOperario = {};
    todaysMarcacoes.forEach((m) => {
      const existing = lastByOperario[m.operario];
      if (!existing || new Date(m.data_hora) > new Date(existing.data_hora)) {
        lastByOperario[m.operario] = m;
      }
    });

    return operarios.map((op) => {
      const usuario = op.usuario || {};
      const marcacao = lastByOperario[usuario.id];
      const time = marcacao
        ? new Date(marcacao.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '--:--';

      return {
        id: usuario.id || String(Math.random()),
        name: usuario.nome_completo || 'Operário',
        role: op.cargo || 'Operário',
        time,
        status: marcacao ? 'Verificado' : 'Sem registro hoje',
        // RF05: cadastro só "conta" como completo com dados + biometria --
        // a Home do Gerente usa isso pra sinalizar quem ainda falta
        // terminar (ver `possui_biometria_ativa` em PerfilOperario).
        possuiBiometria: !!op.possui_biometria_ativa,
      };
    });
  },

  /**
   * Cadastra um novo operário (só os dados cadastrais — Usuario + PerfilOperario).
   * A biometria é enviada depois, numa chamada separada (ver cadastrarBiometria).
   * Rota: POST /api/usuarios/operarios/cadastrar/
   */
  async cadastrarOperario({ nomeCompleto, cpf, email, cargo, tipoVinculo, empresaTerceirizada, endereco, dataAdmissao, senhaInicial, obraId }) {
    const response = await api.post('/api/usuarios/operarios/cadastrar/', {
      nome_completo: nomeCompleto,
      cpf,
      ...(email ? { email } : {}),
      ...(cargo ? { cargo } : {}),
      tipo_vinculo: tipoVinculo || 'PROPRIO',
      ...(empresaTerceirizada ? { empresa_terceirizada: empresaTerceirizada } : {}),
      ...(endereco ? { endereco } : {}),
      ...(dataAdmissao ? { data_admissao: dataAdmissao } : {}),
      senha_inicial: senhaInicial,
      obra_id: obraId,
    });
    return response.data;
  },

  /**
   * Corrige os dados cadastrais de um operário já existente (CPF e senha
   * não são editáveis por aqui -- ver AtualizarOperarioSerializer no
   * backend).
   * Rota: PATCH /api/usuarios/operarios/{id}/atualizar/
   */
  async atualizarOperario(operarioId, { nomeCompleto, email, cargo, tipoVinculo, empresaTerceirizada, endereco, dataAdmissao }) {
    const response = await api.patch(`/api/usuarios/operarios/${operarioId}/atualizar/`, {
      ...(nomeCompleto ? { nome_completo: nomeCompleto } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(cargo !== undefined ? { cargo } : {}),
      ...(tipoVinculo ? { tipo_vinculo: tipoVinculo } : {}),
      ...(empresaTerceirizada !== undefined ? { empresa_terceirizada: empresaTerceirizada } : {}),
      ...(endereco !== undefined ? { endereco } : {}),
      ...(dataAdmissao !== undefined ? { data_admissao: dataAdmissao } : {}),
    });
    return response.data;
  },

  async removerOperario(operarioId) {
    const response = await api.post(`/api/usuarios/operarios/${operarioId}/remover/`);
    return response.data;
  },

  async listarEquipes() {
    const response = await api.get('/api/obras/equipes/');
    return response.data?.results || (Array.isArray(response.data) ? response.data : []);
  },

  async criarEquipe({ obraId, nome, gerenteId, membros }) {
    const response = await api.post('/api/obras/equipes/', {
      obra: obraId,
      nome,
      gerente: gerenteId,
      membros: membros || [],
    });
    return response.data;
  },

  /**
   * Cadastra a biometria facial do operário a partir do vetor extraído on-device.
   * Rota: POST /api/biometria/cadastrar/
   */
  async cadastrarBiometria({ operarioId, vetorFacial, qualidadeAmostra }) {
    try {
      const response = await api.post('/api/biometria/cadastrar/', {
        operario_id: operarioId,
        vetor_facial: vetorFacial,
        qualidade_amostra: qualidadeAmostra,
      });
      return response.data;
    } catch (error) {
      const data = error?.response?.data;
      const detailValue = data?.detail || data?.message || (Array.isArray(data) ? data[0] : null);
      const detail = Array.isArray(detailValue) ? detailValue[0] : detailValue;
      const validation = Object.entries(data || {}).find(([, value]) => Array.isArray(value) && value.length);
      const validationMessage = validation ? (Array.isArray(validation[1][0]) ? validation[1][0][0] : validation[1][0]) : null;
      const message = detail || validationMessage || null;
      const normalized = new Error(message || 'Não foi possível cadastrar a biometria.');
      normalized.status = error?.response?.status;
      normalized.codigo = data?.codigo;
      throw normalized;
    }
  },

  /**
   * Registra uma marcação em contingência: o Gerente confirma a identidade
   * do operário no local (sem vetor facial).
   * Rota: POST /api/marcacoes/contingencia/
   */
  async registrarContingencia({ operarioId, obraId, latitude, longitude, precisaoGpsMetros, tipo, dispositivoId }) {
    const response = await api.post('/api/marcacoes/contingencia/', {
      operario_id: operarioId,
      obra_id: obraId,
      latitude,
      longitude,
      precisao_gps_metros: precisaoGpsMetros,
      tipo,
      ...(dispositivoId ? { dispositivo_id: dispositivoId } : {}),
    });
    return response.data;
  },

  /**
   * Lançamento retroativo de uma batida feita em papel (operário totalmente offline).
   * Rota: POST /api/marcacoes/contingencia-papel/
   */
  async registrarContingenciaPapel({ operarioId, obraId, dataHora, tipo, observacao }) {
    const response = await api.post('/api/marcacoes/contingencia-papel/', {
      operario_id: operarioId,
      obra_id: obraId,
      data_hora: dataHora,
      tipo,
      ...(observacao ? { observacao } : {}),
    });
    return response.data;
  },
};

export default managerService;
