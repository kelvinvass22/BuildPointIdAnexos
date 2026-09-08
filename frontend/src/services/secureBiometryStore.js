/**
 * secureBiometryStore — cache local, cifrado pelo SO (Keychain no iOS,
 * Keystore no Android via `expo-secure-store`), do EMBEDDING FACIAL
 * AUTORIZADO do operário que está logado neste aparelho.
 * ============================================================================
 * Existe pra permitir VALIDAÇÃO FACIAL 100% OFFLINE (ver
 * `offlineFaceValidationService.js`): assim que o operário loga com
 * internet, o app baixa o próprio embedding de referência (o mesmo que o
 * Gerente cadastrou no UC05) via `GET /api/biometria/minha/` e guarda
 * aqui. Numa batida sem internet, o app compara a face capturada com
 * este cache -- sem precisar esperar a sincronização pra saber se a
 * identidade bate.
 *
 * Um único "slot": só existe um operário logado por aparelho de cada vez
 * (ver authService.logout, que limpa este cache no logout).
 *
 * ⚠️ Mudança de postura de privacidade (LGPD/RS02): antes, o vetor
 * facial cifrado nunca saía do backend pra lugar nenhum (nem de volta
 * pro app) -- API só aceitava escrita, nunca devolvia o vetor. Agora, a
 * validação offline exige que o PRÓPRIO DONO do dado tenha uma cópia no
 * SEU aparelho. Por isso: (1) o backend só devolve o embedding pro dono
 * dele (`MinhaBiometriaEmbeddingView`, nunca pra Gerente/Dono
 * consultarem terceiros); (2) fica em SecureStore (cifrado pelo SO, não
 * AsyncStorage puro); (3) é limpo no logout.
 */
import * as SecureStore from 'expo-secure-store';

const STORE_KEY = '@BuildPoint:minhaBiometriaOffline';

function embeddingParaBase64(embedding) {
  const floatArray = Float32Array.from(embedding);
  const bytes = new Uint8Array(floatArray.buffer);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 1) binario += String.fromCharCode(bytes[i]);
  return global.btoa ? global.btoa(binario) : Buffer.from(binario, 'binary').toString('base64');
}

function base64ParaEmbedding(base64) {
  const binario = global.atob ? global.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return Array.from(new Float32Array(bytes.buffer));
}

export const secureBiometryStore = {
  /**
   * @param {{ embedding: number[], algoritmo: string, qualidadeAmostra: number, limiarConfianca: number, capturadoEm: string }} dados
   */
  async salvar({ embedding, algoritmo, qualidadeAmostra, limiarConfianca, capturadoEm }) {
    const payload = JSON.stringify({
      e: embeddingParaBase64(embedding),
      alg: algoritmo,
      q: qualidadeAmostra,
      lim: limiarConfianca,
      em: capturadoEm,
      v: 1, // versão do formato do cache, pra evolução futura sem quebrar caches antigos
    });

    // O Keystore do Android historicamente limita ~2KB por item -- modelos
    // do tipo MobileFaceNet (embeddings pequenos, ~128-256 dimensões) ficam
    // bem abaixo disso. Se o modelo escolhido tiver um embedding muito
    // maior (ex.: ArcFace ResNet, 512 dimensões), esse limite pode estourar.
    if (payload.length > 1900) {
      throw new Error(
        `Embedding grande demais para o armazenamento seguro do aparelho (${payload.length} bytes). ` +
          'Prefira um modelo com embedding menor (ex.: MobileFaceNet, ~128-256 dimensões).'
      );
    }

    await SecureStore.setItemAsync(STORE_KEY, payload, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  },

  /** @returns {Promise<{ embedding: number[], algoritmo: string, qualidadeAmostra: number, limiarConfianca: number, capturadoEm: string } | null>} */
  async carregar() {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (!raw) return null;
    try {
      const dados = JSON.parse(raw);
      return {
        embedding: base64ParaEmbedding(dados.e),
        algoritmo: dados.alg,
        qualidadeAmostra: dados.q,
        limiarConfianca: dados.lim,
        capturadoEm: dados.em,
      };
    } catch (err) {
      console.error('Cache de biometria offline corrompido, descartando:', err);
      await secureBiometryStore.limpar();
      return null;
    }
  },

  async limpar() {
    await SecureStore.deleteItemAsync(STORE_KEY);
  },
};

export default secureBiometryStore;
