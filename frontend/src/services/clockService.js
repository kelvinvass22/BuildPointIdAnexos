import api from './api';

let offsetMs = 0;

export const clockService = {
  async sync() {
    const startedAt = Date.now();
    const response = await api.get('/api/horario/');
    const finishedAt = Date.now();
    const serverTime = new Date(response.data.agora).getTime();
    offsetMs = serverTime - Math.round((startedAt + finishedAt) / 2);
    return this.now();
  },

  now() {
    return new Date(Date.now() + offsetMs);
  },
};

export default clockService;
