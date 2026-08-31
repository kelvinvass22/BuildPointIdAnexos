import React from "react";
import FaceCheckInFlow from "../../components/FaceCheckInFlow";

// Passo 2 do cadastro de operário: captura o vetor facial e chama
// POST /api/biometria/cadastrar/. Navegado a partir de RegisterWorkerScreen
// logo depois que o Usuario + PerfilOperario já foram criados.
export default function EnrollBiometryScreen({ navigation, route }) {
  const { operarioId, operarioNome } = route?.params || {};
  return (
    <FaceCheckInFlow
      navigation={navigation}
      mode="enroll"
      operario={{ id: operarioId, nome_completo: operarioNome }}
    />
  );
}
