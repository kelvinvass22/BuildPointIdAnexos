/**
 * Stub pra `@mediapipe/face_detection`.
 * ============================================================================
 * O app NÃO usa o detector "mediapipe" de `@tensorflow-models/face-detection`
 * -- só o detector "tfjs" (ver `faceVectorService.js:loadDetector`, runtime:
 * 'tfjs'). Mas o pacote importa os dois incondicionalmente no seu
 * `dist/index.js`, então o Metro precisa conseguir RESOLVER
 * `@mediapipe/face_detection` mesmo esse caminho nunca sendo executado em
 * tempo de execução. Em vez de instalar o pacote de verdade (pesado, feito
 * pra web/WASM, não roda em React Native), redirecionamos essa resolução
 * pra este módulo vazio -- ver `metro.config.js` (`resolver.extraNodeModules`).
 */
module.exports = {};
