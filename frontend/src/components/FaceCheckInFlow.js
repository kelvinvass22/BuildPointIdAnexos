import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { COLORS, RADIUS, SPACING, SHADOW } from "../theme/theme";

// step: "intro" | "camera" | "success"
export default function FaceCheckInFlow({ navigation, showSearchBar }) {
  const [step, setStep] = useState("intro");
  const [permission, requestPermission] = useCameraPermissions();

  const goCamera = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
    setStep("camera");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registro de Ponto</Text>
        <View style={{ width: 22 }} />
      </View>

      {step === "intro" && (
        <View style={styles.introBody}>
          <Text style={styles.introTitle}>Reconhecimento Facial</Text>
          <Text style={styles.introText}>
            Vamos utilizar uma ferramenta de reconhecimento facial para confirmar sua
            identidade. Garanta que seu rosto esteja iluminado.
          </Text>

          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.primaryBtn} onPress={goCamera}>
            <Text style={styles.primaryBtnText}>Continuar</Text>
          </TouchableOpacity>
          <Text style={styles.introFooter}>
            Sua imagem será utilizada apenas para confirmação do ponto
          </Text>
        </View>
      )}

      {step === "camera" && (
        <View style={styles.cameraBody}>
          <View style={styles.cameraTopBar}>
            <Text style={styles.cameraTopBarText}>Câmera do {showSearchBar ? "Gerente" : "Operário"}</Text>
          </View>

          {showSearchBar && (
            <View style={styles.searchBar}>
              <TextInput
                placeholder="Busca por Nome ou CPF"
                placeholderTextColor={COLORS.textMuted}
                style={styles.searchInput}
              />
              <Feather name="search" size={18} color={COLORS.textMuted} />
            </View>
          )}

          <View style={styles.cameraFrame}>
            {permission?.granted ? (
              <CameraView style={styles.camera} facing="front" />
            ) : (
              <View style={[styles.camera, styles.cameraFallback]}>
                <Ionicons name="camera-outline" size={40} color="#fff" />
                <Text style={styles.cameraFallbackText}>Permita o acesso à câmera</Text>
              </View>
            )}
            <View style={styles.faceOverlay} pointerEvents="none" />
          </View>

          <Text style={styles.cameraHint}>Posicione o rosto dentro da marcação</Text>

          <TouchableOpacity style={styles.registerBtn} onPress={() => setStep("success")}>
            <Text style={styles.registerBtnText}>Registre o Ponto</Text>
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
            O registro do ponto foi realizado com sucesso, consulte o histórico do operário
            para visualizar o comprovante.
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Concluir</Text>
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

  introBody: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.lg },
  introTitle: { fontSize: 20, fontWeight: "700", color: COLORS.textDark, marginBottom: SPACING.sm },
  introText: { fontSize: 14, color: COLORS.textMuted, lineHeight: 21 },
  introFooter: { fontSize: 12, color: COLORS.textMuted, textAlign: "center", marginTop: SPACING.sm },

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
