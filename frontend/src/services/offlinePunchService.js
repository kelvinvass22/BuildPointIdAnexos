import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@BuildPoint:punchQueue';
const HISTORY_KEY = '@BuildPoint:localPunchHistory';

function createLocalId() {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readJson(key, fallback) {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Erro ao ler armazenamento local (${key}):`, error);
    return fallback;
  }
}

async function writeJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function isNetworkError(error) {
  return !error?.response && (!error?.code || ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code));
}

export const offlinePunchService = {
  isNetworkError,

  async savePending(payload) {
    const id = createLocalId();
    const createdAt = new Date().toISOString();
    const queue = await readJson(QUEUE_KEY, []);
    const history = await readJson(HISTORY_KEY, []);
    const record = {
      id,
      createdAt,
      status: 'PENDENTE',
      payload: { ...payload, data_hora: createdAt, offline: true },
      errorMessage: null,
    };

    await writeJson(QUEUE_KEY, [...queue, record]);
    await writeJson(HISTORY_KEY, [record, ...history]);
    return record;
  },

  async getLocalHistory() {
    return readJson(HISTORY_KEY, []);
  },

  async syncPending(send) {
    const queue = await readJson(QUEUE_KEY, []);
    if (!queue.length) return { synced: 0, failed: 0 };

    const remaining = [];
    const history = await readJson(HISTORY_KEY, []);
    let synced = 0;
    let failed = 0;

    for (const record of queue) {
      try {
        const response = await send(record.payload);
        const updatedHistory = history.map((item) =>
          item.id === record.id
            ? { ...item, status: 'SINCRONIZADO', serverData: response, errorMessage: null }
            : item
        );
        history.splice(0, history.length, ...updatedHistory);
        synced += 1;
      } catch (error) {
        if (isNetworkError(error)) {
          remaining.push(record);
          continue;
        }

        const updatedHistory = history.map((item) =>
          item.id === record.id
            ? { ...item, status: 'FALHA', errorMessage: error.message || 'A marcação foi recusada pelo servidor.' }
            : item
        );
        history.splice(0, history.length, ...updatedHistory);
        failed += 1;
      }
    }

    await writeJson(QUEUE_KEY, remaining);
    await writeJson(HISTORY_KEY, history);
    return { synced, failed };
  },
};

export default offlinePunchService;
