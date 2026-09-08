const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('tflite');

// `@tensorflow-models/face-detection` importa incondicionalmente tanto o
// detector "mediapipe" quanto o "tfjs" no seu index -- só usamos o "tfjs"
// (ver faceVectorService.js), mas o Metro ainda precisa RESOLVER
// `@mediapipe/face_detection` pra empacotar o app. Ver
// `metro-stubs/mediapipe-face-detection.js`.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@mediapipe/face_detection': path.resolve(__dirname, 'metro-stubs/mediapipe-face-detection.js'),
};

module.exports = config;
