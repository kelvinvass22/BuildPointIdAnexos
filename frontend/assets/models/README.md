# Modelo de reconhecimento facial (MobileFaceNet / ArcFace, `.tflite`)

Este app espera encontrar aqui o arquivo:

```
frontend/assets/models/mobilefacenet.tflite
```

Ele **não está incluído no repositório** (é um binário de modelo treinado,
não código-fonte, e o time deve escolher/validar a licença da fonte antes
de embarcar no app). Enquanto ele não existir de verdade, o app builda e
abre normalmente — só a extração do vetor facial falha com uma mensagem
clara ("Não foi possível carregar o modelo de reconhecimento facial...")
em vez de travar o bundler ou dar um erro nativo confuso.

## O que colocar aqui

Um modelo **MobileFaceNet** (treinado com ArcFace loss) convertido para
TensorFlow Lite:

- Entrada: imagem RGB `112x112x3`.
- Saída: embedding de ~128–256 dimensões (não use variantes ArcFace de
  512 dimensões como ResNet50 — além de mais lentas no celular, o cache
  offline em `secureBiometryStore.js` usa o SecureStore do sistema
  operacional, que tem limite de ~2KB por item no Android).
- Pré-processamento assumido pelo código (`faceVectorService.js`):
  pixel normalizado para o intervalo `[-1, 1]` via `(pixel - 127.5) / 128.0`.
  Se o modelo escolhido esperar outra normalização (ex.: `[0, 1]`), ajuste
  a função `prepararEntradaModelo` nesse arquivo.

## Onde conseguir/gerar

1. **Modelos públicos já convertidos** — várias implementações Android de
   reconhecimento facial em código aberto distribuem um
   `mobilefacenet.tflite` pronto (verifique a licença de cada repositório
   antes de usar em produção).
2. **Converter você mesmo** — a partir de um checkpoint MobileFaceNet
   público (ex.: treinado com InsightFace/ArcFace), usando
   `tf.lite.TFLiteConverter` (se o modelo já estiver em SavedModel/Keras)
   ou passando por ONNX → TensorFlow → TFLite com `onnx-tf` (se a fonte
   estiver em ONNX/PyTorch).
3. Depois de validar a licença e converter, **teste antes de embarcar**:
   rode o `.tflite` num script Python (`tf.lite.Interpreter`) com duas
   fotos da mesma pessoa e duas de pessoas diferentes, conferindo que a
   similaridade de cosseno separa bem os dois casos — isso também ajuda a
   calibrar `FACE_LIMIAR_CONFIANCA` no backend (`core/settings.py`) antes
   de liberar pra uso real.

## Depois de colocar o arquivo real

- Rode `npx expo install` / `npm install` no `frontend/` (o `package.json`
  já lista `react-native-fast-tflite` e `expo-secure-store`).
- Gere um novo **Development Build** (não dá pra testar no Expo Go, pois
  `react-native-fast-tflite` é um módulo nativo):
  ```
  eas build --profile development --platform android
  ```
- Instale o APK gerado no aparelho e rode `npx expo start --dev-client`.
