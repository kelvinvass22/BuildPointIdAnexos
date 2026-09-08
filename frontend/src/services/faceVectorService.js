/**
 * faceVectorService — extração de EMBEDDING facial real no dispositivo,
 * via rede neural treinada para reconhecimento (MobileFaceNet, treinado
 * com ArcFace loss), rodando em TFLite nativo através de
 * `react-native-fast-tflite`.
 * ============================================================================
 * SUBSTITUI a versão anterior (vetor de PROPORÇÕES GEOMÉTRICAS do rosto,
 * via TensorFlow.js + MediaPipe FaceMesh, runtime 100% JS/WebGL). Aquele
 * caminho funcionava no Expo Go sem rebuild, mas não é adequado pra
 * IDENTIFICAÇÃO de pessoas: rostos diferentes tendem a ter proporções
 * gerais parecidas, então a similaridade de cosseno entre pessoas
 * diferentes já vinha alta por padrão (pouca margem de segurança).
 *
 * Arquitetura nova (precisa de Development Build via EAS -- NÃO roda no
 * Expo Go, porque `react-native-fast-tflite` é um módulo nativo):
 *   1) Detecção do rosto: continua em TensorFlow.js (`@tensorflow-models/
 *      face-detection`, runtime "tfjs", modelo BlazeFace) -- só pra achar
 *      a CAIXA do rosto na foto, não mais os 468 pontos do FaceMesh.
 *   2) Recorte + normalização da caixa pra 112x112 (entrada padrão de
 *      MobileFaceNet/ArcFace).
 *   3) O recorte alinhado passa pelo modelo `.tflite`
 *      (MobileFaceNet/ArcFace) via `react-native-fast-tflite`, que devolve
 *      um EMBEDDING (vetor de características aprendido pela rede --
 *      não mais distância geométrica entre pontos do rosto).
 *   4) O embedding é normalizado (L2) antes de virar o `vetor_facial`
 *      enviado ao backend (ou comparado localmente offline -- ver
 *      `offlineFaceValidationService.js`).
 *
 * MODELO EM USO: `frontend/assets/models/mobilefacenet.tflite` --
 * MobileFaceNet (saída "embeddings", 192 dimensões, entrada "input"
 * 1x112x112x3 float32 -- confirmado inspecionando o próprio arquivo)
 * vindo do repositório MCarlomagno/FaceRecognitionAuth (BSD-3-Clause,
 * (c) 2020 Marcos Carlomagno -- ver `frontend/assets/models/NOTICE.md`
 * pra atribuição). A normalização abaixo, `(pixel - 128) / 128`, é a
 * mesma usada na implementação de referência daquele repositório (Flutter
 * + tflite_flutter) -- reproduzida aqui pra bater com a calibração do
 * modelo. Se um dia trocarem de modelo, ver
 * `frontend/assets/models/README.md` pros requisitos de formato.
 * ============================================================================
 */
import * as FileSystem from 'expo-file-system';

const INPUT_SIZE = 112; // entrada padrão de MobileFaceNet/ArcFace (112x112 RGB)
const MODEL_ASSET = require('../../assets/models/mobilefacenet.tflite');

let tf = null;
let decodeJpeg = null;
let faceDetection = null;
let loadTensorflowModelFn = null;

function ensureNativeNavigator() {
  if (typeof global.navigator === 'undefined') global.navigator = {};
  if (typeof global.navigator.platform !== 'string') global.navigator.platform = '';
  if (typeof global.navigator.userAgent !== 'string') global.navigator.userAgent = '';
}

async function loadRuntime() {
  if (!tf) {
    ensureNativeNavigator();
    const tfModule = await import('@tensorflow/tfjs');
    await import('@tensorflow/tfjs-react-native');
    const tfReactNative = await import('@tensorflow/tfjs-react-native');
    const detectionModule = await import('@tensorflow-models/face-detection');
    let tflite;
    try {
      tflite = await import('react-native-fast-tflite');
    } catch (err) {
      throw new Error(
        'react-native-fast-tflite não está disponível. Este recurso exige um Development Build ' +
          '(EAS) -- não funciona no Expo Go, pois depende de um módulo nativo.'
      );
    }
    tf = tfModule;
    decodeJpeg = tfReactNative.decodeJpeg;
    faceDetection = detectionModule;
    loadTensorflowModelFn = tflite.loadTensorflowModel;
  }
  return { tf, decodeJpeg, faceDetection, loadTensorflowModelFn };
}

let detectorPromise = null;
let modelPromise = null;

/** Detector de ROSTO (caixa + poucos pontos-guia), leve, 100% tfjs -- não é mais usado pra extrair o vetor. */
function loadDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await loadRuntime();
      await tf.ready();
      return faceDetection.createDetector(faceDetection.SupportedModels.MediaPipeFaceDetector, {
        runtime: 'tfjs',
        modelType: 'short',
        maxFaces: 1,
      });
    })().catch((err) => {
      detectorPromise = null;
      throw err;
    });
  }
  return detectorPromise;
}

/** Modelo de reconhecimento (embedding) em TFLite. Idempotente -- só carrega uma vez. */
function loadEmbeddingModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadRuntime();
      try {
        return await loadTensorflowModelFn(MODEL_ASSET);
      } catch (err) {
        throw new Error(
          'Não foi possível carregar o modelo de reconhecimento facial (mobilefacenet.tflite). ' +
            'Verifique se o arquivo real do modelo foi colocado em frontend/assets/models/ ' +
            '(veja o README.md dessa pasta) e se o app foi rebuildado após adicioná-lo.'
        );
      }
    })().catch((err) => {
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
}

async function photoUriToTensor(uri) {
  await loadRuntime();
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const raw = new Uint8Array(tf.util.encodeString(base64, 'base64').buffer);
  return decodeJpeg(raw); // tf.Tensor3D (uint8, HxWx3)
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function l2Normalize(vetor) {
  const norma = Math.sqrt(vetor.reduce((soma, v) => soma + v * v, 0)) || 1;
  return vetor.map((v) => Number((v / norma).toFixed(6)));
}

/**
 * Recorta a caixa do rosto (com margem, pra não cortar queixo/testa),
 * redimensiona pra 112x112 e normaliza os pixels pro range esperado pelo
 * modelo ([-1, 1]). Retorna um tf.Tensor3D pronto pra virar entrada do
 * TFLite -- quem chama é responsável por `.dispose()`.
 */
function prepararEntradaModelo(imageTensor, box) {
  return tf.tidy(() => {
    const [imgHeight, imgWidth] = imageTensor.shape;
    const margem = 0.35; // extra ao redor da caixa detectada (BlazeFace tende a marcar só olhos/nariz/boca)
    const cx = box.xMin + box.width / 2;
    const cy = box.yMin + box.height / 2;
    const lado = Math.max(box.width, box.height) * (1 + margem);

    let x0 = Math.round(cx - lado / 2);
    let y0 = Math.round(cy - lado / 2);
    let tamanho = Math.round(lado);

    x0 = Math.max(0, Math.min(x0, imgWidth - 1));
    y0 = Math.max(0, Math.min(y0, imgHeight - 1));
    tamanho = Math.max(1, Math.min(tamanho, Math.min(imgWidth - x0, imgHeight - y0)));

    const recorte = tf.slice(imageTensor, [y0, x0, 0], [tamanho, tamanho, 3]);
    const redimensionado = tf.image.resizeBilinear(recorte, [INPUT_SIZE, INPUT_SIZE]);
    // (pixel - 128) / 128 -- normalização usada no MobileFaceNet.tflite de
    // referência (MCarlomagno/FaceRecognitionAuth, BSD-3-Clause), a mesma
    // que veio com o modelo em assets/models/mobilefacenet.tflite.
    return redimensionado.toFloat().sub(128).div(128.0); // [-1, 1) aprox., shape [112,112,3]
  });
}

// Resolução fixa só pra medir nitidez -- ver comentário em estimarNitidezEBrilho
// sobre por que isso importa (não é o tamanho da entrada do modelo, que é 112).
const NITIDEZ_SAMPLE_SIZE = 64;

function estimarNitidezEBrilho(imageTensor, box, imgWidth, imgHeight) {
  const x = Math.max(0, Math.floor(box.xMin));
  const y = Math.max(0, Math.floor(box.yMin));
  const width = Math.min(imgWidth - x, Math.max(1, Math.floor(box.width)));
  const height = Math.min(imgHeight - y, Math.max(1, Math.floor(box.height)));

  return tf.tidy(() => {
    const cropOriginal = tf.slice(imageTensor, [y, x, 0], [height, width, 3]).toFloat().div(255);
    // Redimensiona pra um tamanho FIXO antes de medir o gradiente entre
    // pixels vizinhos. Sem isso, a métrica de nitidez fica dependente da
    // resolução da câmera do aparelho: um rosto recortado em altíssima
    // resolução (câmeras modernas fazem 4000px+ de lado) tem muito mais
    // pixels "iguais" ao vizinho (pele lisa) proporcionalmente às bordas
    // reais (olhos, sobrancelha, contorno), então a média do gradiente
    // desaba conforme a resolução sobe -- o mesmo rosto, com o mesmo foco
    // perfeito, dava uma pontuação de nitidez artificialmente baixa em
    // aparelhos com câmera melhor. Redimensionar pra um tamanho fixo antes
    // de medir resolve isso (era a causa da qualidade nunca passar de
    // ~0.70 mesmo com fotos nítidas -- ver conversa/relato do time).
    const crop = tf.image.resizeBilinear(cropOriginal, [NITIDEZ_SAMPLE_SIZE, NITIDEZ_SAMPLE_SIZE]);
    const gray = crop.mean(2);
    const horizontal = gray.slice([0, 1], [NITIDEZ_SAMPLE_SIZE, NITIDEZ_SAMPLE_SIZE - 1])
      .sub(gray.slice([0, 0], [NITIDEZ_SAMPLE_SIZE, NITIDEZ_SAMPLE_SIZE - 1])).abs().mean().dataSync()[0];
    const vertical = gray.slice([1, 0], [NITIDEZ_SAMPLE_SIZE - 1, NITIDEZ_SAMPLE_SIZE])
      .sub(gray.slice([0, 0], [NITIDEZ_SAMPLE_SIZE - 1, NITIDEZ_SAMPLE_SIZE])).abs().mean().dataSync()[0];
    const brightness = gray.mean().dataSync()[0];
    const sharpness = Math.min(1, ((horizontal + vertical) / 2) / 0.08);
    const brightnessScore = Math.max(0, 1 - Math.abs(brightness - 0.5) / 0.5);
    return { sharpness, brightnessScore };
  });
}

/**
 * Qualidade baseada em enquadramento, nitidez e iluminação (sem mais os 468
 * pontos do FaceMesh). Retorna também o detalhamento (`detalhe`) de cada
 * sub-métrica -- não é usado na comparação em si, só pra diagnóstico
 * (aparece na mensagem de erro quando a qualidade fica abaixo do mínimo,
 * ver FaceCheckInFlow.js) já que é uma heurística aproximada e pode
 * precisar de mais calibração depois de testar em mais aparelhos.
 */
function estimarQualidade(face, imgWidth, imgHeight, imageTensor) {
  const box = face.box;
  const boxAreaRatio = ((box.width * box.height) / (imgWidth * imgHeight)) || 0;
  const tamanhoScore = Math.min(1, boxAreaRatio / 0.15); // espera rosto ocupando ~15%+ da foto

  const keypoints = face.keypoints || [];
  const leftEye = keypoints.find((k) => k.name === 'leftEye');
  const rightEye = keypoints.find((k) => k.name === 'rightEye');
  let simetria = 1;
  if (leftEye && rightEye) {
    const olhosDist = dist(leftEye, rightEye);
    const esperado = box.width * 0.45; // heurística: olhos ~45% da largura da caixa num rosto de frente
    simetria = Math.max(0, 1 - Math.abs(olhosDist - esperado) / esperado);
  }

  const { sharpness, brightnessScore } = estimarNitidezEBrilho(imageTensor, box, imgWidth, imgHeight);

  const score = 0.35 * tamanhoScore + 0.20 * simetria + 0.30 * sharpness + 0.15 * brightnessScore;
  return {
    score: Number(Math.max(0, Math.min(1, score)).toFixed(2)),
    detalhe: {
      tamanho: Number(tamanhoScore.toFixed(2)),
      simetria: Number(simetria.toFixed(2)),
      nitidez: Number(sharpness.toFixed(2)),
      brilho: Number(brightnessScore.toFixed(2)),
    },
  };
}

export const faceVectorService = {
  /** Dimensão do embedding -- só é conhecida depois do modelo carregar (varia com o modelo escolhido). */
  VECTOR_SIZE: null,

  /** Chame cedo (ex.: ao abrir a tela de câmera) pra esconder a latência do 1º load do detector + modelo. */
  async preload() {
    await Promise.all([loadDetector(), loadEmbeddingModel()]);
  },

  /**
   * @param {{ uri: string, width?: number, height?: number }} photo - resultado de CameraView.takePictureAsync()
   * @returns {Promise<{ vetor_facial: number[], qualidade_amostra: number }>}
   */
  async extractFromPhoto(photo) {
    if (!photo?.uri) {
      throw new Error('Não foi possível capturar a foto. Tente novamente.');
    }

    const [detector, modelo] = await Promise.all([loadDetector(), loadEmbeddingModel()]);
    const imageTensor = await photoUriToTensor(photo.uri);

    try {
      const [imgHeight, imgWidth] = imageTensor.shape;
      const faces = await detector.estimateFaces(imageTensor, { flipHorizontal: false });

      if (!faces.length) {
        throw new Error('Nenhum rosto detectado. Centralize o rosto e garanta boa iluminação.');
      }

      const face = faces[0];
      const { score: qualidade_amostra, detalhe: qualidade_detalhe } = estimarQualidade(face, imgWidth, imgHeight, imageTensor);

      if (qualidade_amostra < 0.55) {
        const err = new Error('Imagem sem qualidade suficiente. Mantenha o celular firme, melhore a iluminação e tente novamente.');
        err.qualidadeDetalhe = qualidade_detalhe;
        throw err;
      }

      const entradaTensor = prepararEntradaModelo(imageTensor, face.box);
      const entradaArray = entradaTensor.dataSync();
      entradaTensor.dispose();

      const saidas = await modelo.run([Float32Array.from(entradaArray)]);
      const embeddingBruto = Array.from(saidas[0]);
      const vetor_facial = l2Normalize(embeddingBruto);
      faceVectorService.VECTOR_SIZE = vetor_facial.length;

      return { vetor_facial, qualidade_amostra, qualidade_detalhe };
    } finally {
      imageTensor.dispose(); // tensores TFJS precisam ser liberados manualmente (evita vazamento de memória)
    }
  },
};

export default faceVectorService;
