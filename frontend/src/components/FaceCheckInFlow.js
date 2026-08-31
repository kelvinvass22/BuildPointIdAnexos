import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { COLORS, RADIUS, SPACING, SHADOW } from "../theme/theme";
import geoService from "../services/geoService";
import faceVectorService from "../services/faceVectorService";
import workerService from "../services/workerService";
import managerService from "../services/managerService";

const TIPOS = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saída" },
  { value: "INTERVALO_INICIO", label: "Início do intervalo" },
  { value: "INTERVALO_FIM", label: "Fim do intervalo" },
];

/**
 * Fluxo de câmera unificado, usado em três contextos (prop `mode`):
 *  - "checkin"      : Operário bate o próprio ponto -> extrai o vetor facial
 *                      no dispositivo e chama POST /api/marcacoes/.
 *  - "enroll"       : Gerente cadastra a biometria de um Operário -> extrai
 *                      o vetor e chama POST /api/biometria/cadastrar/.
 *  - "contingencia" : Gerente bate o ponto por um Operário cuja face falhou
 *                      (ou sem app) -> sem vetor facial, só confirma a
 *                      identidade no local via POST /api/marcacoes/contingencia/.
 *
 * Props:
 *  - obraId  : uuid da obra (obrigatório em "checkin" e "contingencia")
 *  - operario: { id, nome_completo } já selecionado (obrigatório em "enroll";
 *               opcional em "contingencia" -- se ausente, mostra busca)
 *  - onDone(result): chamado com a resposta da API quando o fluxo é concluído
 */
export default function FaceCheckInFlow({
  navigation,
  mode = "checkin",
  obraId = null,
  operario = null,
  onDone = null,
}) {
  const needsOperarioSearch = mode === "contingencia" && !operario;

  const [step, setStep] = useState(needsOperarioSearch ? "search" : "intro");
  const [permission, requestPermission] = useCameraPermissions();
  const [tipo, setTipo] = useState("ENTRADA");
  const [selectedOperario, setSelectedOperario] = useState(operario);
  const [search, setSearch] = useState("");
  const [operariosList, setOperariosList] = useState([]);
  const [loadingOperarios, setLoadingOperarios] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);

  useEffect(() => {
    if (step === "search") {
      loadOperarios();
    }
  }, [step]);

  const loadOperarios = async () => {
    try {
      setLoadingOperarios(true);
      const { results } = await managerService.listOperarios();
      setOperariosList(results);
    } catch (err) {
      console.error("Erro ao buscar operários:", err);
    } finally {
      setLoadingOperarios(false);
    }
  };

  const filteredOperarios = useMemo(() => {
    if (!search.trim()) return operariosList;
    const term = search.trim().toLowerCase();
    return operariosList.filter((op) => {
      const usuario = op.usuario || {};
      return (
        (usuario.nome_completo || "").toLowerCase().includes(term) ||
        (usuario.cpf || "").includes(term)
      );
    });
  }, [operariosList, search]);

  const goCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result?.granted) {
        Alert.alert("Câmera necessária", "Permita o acesso à câmera para continuar.");
        return;
      }
    }
    setErrorMessage(null);
    setStep("camera");
  };

  const handleSelectOperario = (op) => {
    setSelectedOperario({ id: op.usuario?.id, nome_completo: op.usuario?.nome_completo });
    setStep("intro");
  };

  const handleCapture = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      setErrorMessage(null);

      if (mode === "contingencia") {
        // Sem vetor facial: só GPS + confirmação visual do gerente no local.
        const position = await geoService.getCurrentPosition();
        const result = await managerService.registrarContingencia({
          operarioId: selectedOperario.id,
          obraId,
          latitude: position.latitude,
          longitude: position.longitude,
          precisaoGpsMetros: position.precisao_gps_metros,
          tipo,
        });
        setStep("success");
        onDone?.(result);
        return;
      }

      let photo = null;
      if (cameraRef) {
        try {
          photo = await cameraRef.takePictureAsync({ quality: 0.5, skipProcessing: true });
        } catch (photoErr) {
          console.warn("Não foi possível capturar a foto, seguindo com vetor mesmo assim:", photoErr);
        }
      }
      const { vetor_facial, qualidade_amostra } = await faceVectorService.extractFromPhoto(photo || {});

      let result;
      if (mode === "enroll") {
        result = await managerService.cadastrarBiometria({
          operarioId: selectedOperario.id,
          vetorFacial: vetor_facial,
          qualidadeAmostra: qualidade_amostra,
        });
      } else {
        const position = await geoService.getCurrentPosition();
        result = await workerService.registrarPonto({
          obraId,
          latitude: position.latitude,
          longitude: position.longitude,
          precisaoGpsMetros: position.precisao_gps_metros,
          tipo,
          vetorFacial: vetor_facial,
          sistemaOperacional: `${Platform.OS} ${Platform.Version}`,
        });
      }

      setStep("success");
      onDone?.(result);
    } catch (err) {
      console.error("Erro no fluxo de câmera:", err);
      setErrorMessage(err?.message || "Não foi possível concluir. Tente novamente.");
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  const headerTitle =
    mode === "enroll" ? "Cadastro de Biometria" : mode === "contingencia" ? "Registro da Equipe" : "Registro de Ponto";

  const introTitle = mode === "enroll" ? "Cadastro Facial do Operário" : "Reconhecimento Facial";
  const introText =
    mode === "enroll"
      ? "Vamos capturar o rosto do operário para cadastrar a biometria dele. Garanta boa iluminação e peça para ele olhar para a câmera."
      : mode === "contingencia"
      ? `Confirme presencialmente a identidade de ${selectedOperario?.nome_completo || "do operário"} antes de registrar o ponto.`
      : "Vamos utilizar reconhecimento facial para confirmar sua identidade. Garanta que seu rosto esteja iluminado.";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 22 }} />
      </View>

      {step === "search" && (
        <View style={styles.searchBody}>
          <View style={styles.searchBar}>
            <TextInput
              placeholder="Busca por Nome ou CPF"
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
            <Feather name="search" size={18} color={COLORS.textMuted} />
          </View>

          {loadingOperarios ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
          ) : (
            <FlatList
              data={filteredOperarios}
              keyExtractor={(item) => item.usuario?.id || String(Math.random())}
              contentContainerStyle={{ paddingBottom: SPACING.lg }}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: COLORS.textMuted, marginTop: SPACING.lg }}>
                  Nenhum operário encontrado.
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.operarioRow} onPress={() => handleSelectOperario(item)}>
                  <View style={styles.operarioAvatar}>
                    <Ionicons name="person" size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
                    <Text style={styles.operarioName}>{item.usuario?.nome_completo}</Text>
                    <Text style={styles.operarioSub}>{item.cargo || "Operário"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {step === "intro" && (
        <View style={styles.introBody}>
          <Text style={styles.introTitle}>{introTitle}</Text>
          <Text style={styles.introText}>{introText}</Text>

          {mode !== "enroll" && (
            <View style={styles.tipoWrap}>
              <Text style={styles.tipoLabel}>Tipo de marcação</Text>
              <View style={styles.tipoRow}>
                {TIPOS.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.tipoChip, tipo === t.value && styles.tipoChipActive]}
                    onPress={() => setTipo(t.value)}
                  >
                    <Text style={[styles.tipoChipText, tipo === t.value && styles.tipoChipTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.primaryBtn} onPress={goCamera}>
            <Text style={styles.primaryBtnText}>Continuar</Text>
          </TouchableOpacity>
          <Text style={styles.introFooter}>
            {mode === "contingencia"
              ? "Nenhuma imagem é enviada nesse fluxo — só a sua confirmação e a localização."
              : "Sua imagem é processada no aparelho; só o vetor facial é enviado ao servidor."}
          </Text>
        </View>
      )}

      {step === "camera" && (
        <View style={styles.cameraBody}>
          <View style={styles.cameraTopBar}>
            <Text style={styles.cameraTopBarText}>
              {mode === "contingencia" || mode === "enroll" ? "Câmera do Gerente" : "Câmera do Operário"}
            </Text>
          </View>

          <View style={styles.cameraFrame}>
            {permission?.granted && mode !== "contingencia" ? (
              <CameraView ref={setCameraRef} style={styles.camera} facing="front" />
            ) : permission?.granted ? (
              <CameraView style={styles.camera} facing="back" />
            ) : (
              <View style={[styles.camera, styles.cameraFallback]}>
                <Ionicons name="camera-outline" size={40} color="#fff" />
                <Text style={styles.cameraFallbackText}>Permita o acesso à câmera</Text>
              </View>
            )}
            <View style={styles.faceOverlay} pointerEvents="none" />
          </View>

          <Text style={styles.cameraHint}>
            {mode === "contingencia" ? "Confirme visualmente o rosto do operário" : "Posicione o rosto dentro da marcação"}
          </Text>

          <TouchableOpacity style={styles.registerBtn} onPress={handleCapture} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={COLORS.textOnPrimary} size="small" />
            ) : (
              <Text style={styles.registerBtnText}>
                {mode === "enroll" ? "Cadastrar Biometria" : "Registre o Ponto"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {step === "success" && (
        <View style={styles.introBody}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark" size={40} color={COLORS.card} />
          </View>
          <Text style={styles.introTitle}>Tudo certo</Text>
          <Text style={styles.introText}>
            {mode === "enroll"
              ? "A biometria do operário foi cadastrada com sucesso."
              : "O registro do ponto foi realizado com sucesso, consulte o histórico para visualizar o comprovante."}
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Concluir</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === "error" && (
        <View style={styles.introBody}>
          <View style={[styles.successIconWrap, { backgroundColor: COLORS.danger }]}>
            <Ionicons name="close" size={40} color={COLORS.card} />
          </View>
          <Text style={styles.introTitle}>Não foi possível concluir</Text>
          <Text style={styles.introText}>{errorMessage}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep("camera")}>
            <Text style={styles.primaryBtnText}>Tentar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: SPACING.sm, alignItems: "center" }} onPress={() => navigation.goBack()}>
            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textDark },

  searchBody: { flex: 1, paddingHorizontal: SPACING.md },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    marginBottom: SPACING.sm,
    ...SHADOW,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textDark },
  operarioRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW,
  },
  operarioAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: "#E7F1FA",
    alignItems: "center",
    justifyContent: "center",
  },
  operarioName: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  operarioSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  introBody: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.lg },
  introTitle: { fontSize: 20, fontWeight: "700", color: COLORS.textDark, marginBottom: SPACING.sm },
  introText: { fontSize: 14, color: COLORS.textMuted, lineHeight: 21 },
  introFooter: { fontSize: 12, color: COLORS.textMuted, textAlign: "center", marginTop: SPACING.sm },

  tipoWrap: { marginTop: SPACING.lg },
  tipoLabel: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted, marginBottom: SPACING.sm },
  tipoRow: { flexDirection: "row", flexWrap: "wrap" },
  tipoChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tipoChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tipoChipText: { fontSize: 12, color: COLORS.textDark, fontWeight: "600" },
  tipoChipTextActive: { color: COLORS.textOnPrimary },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 15 },

  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },

  cameraBody: { flex: 1, paddingHorizontal: SPACING.md },
  cameraTopBar: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    alignSelf: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    marginBottom: SPACING.sm,
  },
  cameraTopBarText: { color: COLORS.textOnPrimary, fontSize: 12, fontWeight: "600" },
  cameraFrame: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  camera: { flex: 1, width: "100%" },
  cameraFallback: { alignItems: "center", justifyContent: "center" },
  cameraFallbackText: { color: "#fff", marginTop: SPACING.sm, fontSize: 12 },
  faceOverlay: {
    position: "absolute",
    top: "18%",
    left: "22%",
    right: "22%",
    bottom: "28%",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#fff",
    borderStyle: "dashed",
  },
  cameraHint: { textAlign: "center", color: COLORS.textMuted, fontSize: 12, marginVertical: SPACING.sm },
  registerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  registerBtnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 14 },
});
