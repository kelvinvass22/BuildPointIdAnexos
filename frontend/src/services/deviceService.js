import { Platform } from "react-native";
import * as Application from "expo-application";

/**
 * Resolve o `dispositivo_id`/`sistema_operacional` que faltavam nas
 * marcações de ponto (o backend já tinha os dois campos prontos em
 * `MarcacaoPonto` -- ninguém no app enviava valor de verdade).
 *
 * Android: `getAndroidId()` -- síncrono, sem permissão especial, muda se
 * o app for desinstalado e reinstalado (aceitável: é só rastreabilidade
 * de qual aparelho bateu o ponto, não uma trava de licença).
 * iOS: `getIosIdForVendorAsync()` -- também some/muda se TODOS os apps do
 * mesmo vendor forem desinstalados.
 *
 * Cacheado em memória (não muda durante a sessão do app) pra não repetir
 * a chamada nativa a cada marcação.
 */
let cachedDispositivoId = null;

async function getDispositivoId() {
  if (cachedDispositivoId) return cachedDispositivoId;

  try {
    if (Platform.OS === "android") {
      cachedDispositivoId = Application.getAndroidId() || null;
    } else if (Platform.OS === "ios") {
      cachedDispositivoId = await Application.getIosIdForVendorAsync();
    }
  } catch (err) {
    console.warn("Não foi possível obter o ID do dispositivo:", err?.message || err);
  }

  if (!cachedDispositivoId) {
    // Fallback -- nunca deixar o campo vazio (melhor um valor genérico
    // rastreável nos logs do que nada) quando o SDK nativo não devolver
    // nada (ex.: emulador sem Google Play Services).
    cachedDispositivoId = `desconhecido-${Platform.OS}-${Date.now()}`;
  }
  return cachedDispositivoId;
}

function getSistemaOperacional() {
  return `${Platform.OS} ${Platform.Version}`;
}

export const deviceService = { getDispositivoId, getSistemaOperacional };
export default deviceService;
