import api from './api';

// TODO: Ajustar as rotas ou os tipos dos retornos com as especificações do backend

export const managerService = {
  /**
   * Obtém as informações da obra atual gerenciada.
   * Retorna objeto com: name, address
   */
  async getCurrentObra() {
    // TODO: Ajustar rota final com o backend
    const response = await api.get('/manager/current-obra');
    return response.data;
  },

  /**
   * Obtém a lista de presença diária dos funcionários.
   * Retorna array de objetos com: id, name, role, time, status
   */
  async getDailyAttendance() {
    // TODO: Ajustar rota final com o backend
    const response = await api.get('/manager/daily-attendance');
    return response.data;
  },

  /**
   * Obtém a configuração atual do raio de marcação do ponto (em metros).
   */
  async getRadiusConfig() {
    // TODO: Ajustar rota final com o backend
    const response = await api.get('/manager/radius-config');
    return response.data;
  },

  /**
   * Salva a configuração do raio de marcação do ponto (em metros).
   */
  async updateRadiusConfig(radius) {
    // TODO: Ajustar rota final com o backend
    const response = await api.put('/manager/radius-config', { radius });
    return response.data;
  },

  /**
   * Cadastra um novo operário com biometria facial.
   * Dados esperados: nome, endereco, cargo, admissao, faceId
   */
  async registerWorker(workerData) {
    // TODO: Ajustar rota final ou tipagens com o backend
    const response = await api.post('/manager/workers', workerData);
    return response.data;
  }
};
