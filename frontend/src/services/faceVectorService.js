/**
 * ⚠️ IMPORTANTE — LEIA ANTES DE USAR EM PRODUÇÃO
 * ============================================================================
 * O backend agora só aceita o VETOR facial extraído no dispositivo (nunca a
 * imagem) — ver "1. Mudança que mais afeta o app" no resumo do backend. Isso
 * exige integrar um SDK on-device de verdade, por exemplo:
 *   - Google ML Kit Face Detection: https://developers.google.com/ml-kit/vision/face-detection
 *   - MediaPipe Face Landmarker:   https://developers.google.com/mediapipe/solutions/vision/face_landmarker
 *
 * Nenhum desses SDKs está incluído neste projeto Expo hoje (não há um módulo
 * nativo de landmarks faciais nas dependências do package.json). Por isso,
 * esta função gera um vetor de PLACEHOLDER — determinístico e com o formato
 * certo (array de floats, tamanho mínimo 8, qualidade entre 0 e 1) só para
 * que o restante do fluxo (câmera -> vetor -> chamada de API -> resposta do
 * backend) fique de fato conectado e testável de ponta a ponta.
 *
 * Ele NÃO reconhece rostos de verdade: duas fotos de pessoas diferentes vão
 * gerar vetores "parecidos" o bastante para não ter nenhum valor biométrico
 * real. Antes de ir pra produção, troque `extractFromPhoto` por uma chamada
 * ao SDK on-device escolhido.
 * ============================================================================
 */

const VECTOR_SIZE = 128;

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const faceVectorService = {
  VECTOR_SIZE,

  /**
   * @param {{ uri: string, width?: number, height?: number }} photo - resultado de CameraView.takePictureAsync()
   * @returns {Promise<{ vetor_facial: number[], qualidade_amostra: number }>}
   */
  async extractFromPhoto(photo) {
    const seedSource = `${photo?.uri || ''}-${photo?.width || 0}x${photo?.height || 0}-${Date.now()}`;
    const rand = seededRandom(hashString(seedSource));

    const vetor_facial = Array.from({ length: VECTOR_SIZE }, () => Number((rand() * 2 - 1).toFixed(6)));
    const qualidade_amostra = Number((0.75 + rand() * 0.2).toFixed(2));

    return { vetor_facial, qualidade_amostra };
  },
};

export default faceVectorService;
