/**
 * offlineFaceValidationService — compara, NO PRÓPRIO APARELHO e sem
 * internet, o embedding facial recém-capturado com o embedding autorizado
 * cacheado em `secureBiometryStore`. Usa a MESMA matemática do backend
 * (similaridade de cosseno, `biometria/services.py:_similaridade_cosseno`)
 * pra que o resultado offline seja consistente com o que o servidor diria
 * quando a marcação sincronizar.
 *
 * Isso é o que permite ao Operário saber NA HORA, mesmo sem internet, se a
 * identidade foi confirmada -- em vez de só enfileirar a marcação "às
 * cegas" e descobrir depois (quando sincronizar) que a face não bateu.
 */
import secureBiometryStore from './secureBiometryStore';

// Só usado se o cache local nunca chegou a receber `limiarConfianca` do
// backend (ex.: primeiro uso, ainda sem sincronizar). Mantenha alinhado
// com o valor padrão de `FACE_LIMIAR_CONFIANCA` em core/settings.py
// (0.875 -- derivado do limiar de referência do mobilefacenet.tflite em
// uso, convertendo distância euclidiana <= 0.5 pra similaridade de
// cosseno em vetores L2-normalizados).
const LIMIAR_PADRAO_FALLBACK = 0.875;

function similaridadeCosseno(vetorA, vetorB) {
  const tamanho = Math.min(vetorA.length, vetorB.length);
  let produtoEscalar = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < tamanho; i += 1) {
    produtoEscalar += vetorA[i] * vetorB[i];
    normaA += vetorA[i] * vetorA[i];
    normaB += vetorB[i] * vetorB[i];
  }
  const denominador = (Math.sqrt(normaA) || 1) * (Math.sqrt(normaB) || 1);
  return Math.max(0, Math.min(produtoEscalar / denominador, 1));
}

export const offlineFaceValidationService = {
  /** @returns {Promise<boolean>} se existe um embedding autorizado cacheado neste aparelho. */
  async possuiReferenciaCacheada() {
    return (await secureBiometryStore.carregar()) !== null;
  },

  /**
   * Compara o embedding recém-capturado (da câmera, offline) com o
   * embedding autorizado cacheado.
   * @param {number[]} embeddingCapturado
   * @returns {Promise<{ identidadeConfirmada: boolean, confianca: number, semReferenciaCacheada?: boolean }>}
   */
  async validar(embeddingCapturado) {
    const referencia = await secureBiometryStore.carregar();
    if (!referencia) {
      return { identidadeConfirmada: false, confianca: 0, semReferenciaCacheada: true };
    }

    const confianca = similaridadeCosseno(embeddingCapturado, referencia.embedding);
    const limiar = typeof referencia.limiarConfianca === 'number' ? referencia.limiarConfianca : LIMIAR_PADRAO_FALLBACK;

    return { identidadeConfirmada: confianca >= limiar, confianca: Number(confianca.toFixed(3)) };
  },
};

export default offlineFaceValidationService;
