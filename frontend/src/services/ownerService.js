import api from './api';

export const ownerService = {
  /**
   * Lista as obras do Dono autenticado.
   * Rota: GET /api/obras/
   */
  async listObras(page = 1) {
    const response = await api.get('/api/obras/', { params: { page } });
    const data = response.data;
    return {
      results: data?.results || (Array.isArray(data) ? data : []),
      count: data?.count ?? (Array.isArray(data) ? data.length : 0),
    };
  },

  /**
   * Detalhe de uma obra (traz vinculos_gerente e total_operarios).
   * Rota: GET /api/obras/{id}/
   */
  async getObra(obraId) {
    const response = await api.get(`/api/obras/${obraId}/`);
    return response.data;
  },

  /**
   * Cria uma obra nova. Não envia mais "gerente" nem "cnpj" — o vínculo do
   * gerente é feito depois, numa chamada separada (ver vincularGerente*).
   * Rota: POST /api/obras/
   */
  async createObra({ nome, endereco, numeroArt, latitude_centro, longitude_centro, raio_metros, status }) {
    const response = await api.post('/api/obras/', {
      nome,
      endereco,
      numero_art: numeroArt || '',
      latitude_centro,
      longitude_centro,
      raio_metros,
      status: status || 'ATIVA',
    });
    return response.data;
  },

  /**
   * Atualiza dados cadastrais da obra.
   * Rota: PATCH /api/obras/{id}/
   */
  async updateObra(obraId, payload) {
    const response = await api.patch(`/api/obras/${obraId}/`, payload);
    return response.data;
  },

  /**
   * Apaga uma obra. O backend recusa (409) se já existir alguma marcação
   * de ponto registrada nela -- nesse caso a alternativa é encerrar a
   * obra (status ENCERRADA via updateObra) em vez de apagar, pra não
   * perder o histórico de ponto.
   * Rota: DELETE /api/obras/{id}/
   */
  async deleteObra(obraId) {
    await api.delete(`/api/obras/${obraId}/`);
  },

  /**
   * Configura o geofence (RF04): centro + raio do ponto.
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
   * Vincula um gerente JÁ CADASTRADO a uma obra, com especialidade (Opção A).
   * Rota: POST /api/obras/{id}/vincular_gerente/
   */
  async vincularGerenteExistente(obraId, { gerenteId, especialidade }) {
    const response = await api.post(`/api/obras/${obraId}/vincular_gerente/`, {
      especialidade,
      gerente_id: gerenteId,
    });
    return response.data;
  },

  /**
   * Cadastra um gerente novo e já vincula à obra na mesma chamada (Opção B).
   * Rota: POST /api/obras/{id}/vincular_gerente/
   */
  async vincularGerenteNovo(obraId, { especialidade, tipoGerente, nomeCompleto, cpf, email, telefone, senhaInicial }) {
    const response = await api.post(`/api/obras/${obraId}/vincular_gerente/`, {
      especialidade,
      ...(tipoGerente ? { tipo_gerente: tipoGerente } : {}),
      nome_completo: nomeCompleto,
      cpf,
      email,
      ...(telefone ? { telefone } : {}),
      ...(senhaInicial ? { senha_inicial: senhaInicial } : {}),
    });
    return response.data;
  },

  /**
   * Cadastra um Gerente avulso, sem vincular a nenhuma obra ainda.
   * Rota: POST /api/usuarios/gerentes/cadastrar/
   */
  async cadastrarGerenteAvulso({ nomeCompleto, cpf, email, telefone, senhaInicial }) {
    const response = await api.post('/api/usuarios/gerentes/cadastrar/', {
      nome_completo: nomeCompleto,
      cpf,
      email,
      telefone,
      senha_inicial: senhaInicial,
    });
    return response.data;
  },
};

export default ownerService;
