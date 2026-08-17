import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { COLORS, RADIUS, SPACING } from "../../theme/theme";
import { managerService } from "../../services/managerService";

export default function RadiusConfigScreen({ navigation }) {
  const [radius, setRadius] = useState(127);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Carrega a configuração inicial do raio a partir do backend
  useEffect(() => {
    const fetchRadius = async () => {
      try {
        setLoading(true);
        setError(null);
        // TODO: Ajustar rota ou tipo com o backend se necessário
        const data = await managerService.getRadiusConfig();
        if (data && typeof data.radius === "number") {
          setRadius(data.radius);
        }
      } catch (err) {
        console.error("Erro ao obter raio do ponto:", err);
        // TODO: Ajustar tratamento de erro com o backend
        setError("Não foi possível obter a configuração de raio. Usando valor padrão.");
      } finally {
        setLoading(false);
      }
    };

    fetchRadius();
  }, []);

  // Envia a nova configuração de raio para o backend
  const handleSave = async () => {
    try {
      setSaving(true);
      // TODO: Ajustar rota ou tipo com o backend se necessário
      await managerService.updateRadiusConfig(Math.round(radius));
      Alert.alert("Sucesso", "Configuração do raio salva com sucesso!");
      navigation.goBack();
    } catch (err) {
      console.error("Erro ao salvar raio do ponto:", err);
      // TODO: Ajustar tratamento de erro e mensagens amigáveis para o usuário
      Alert.alert(
        "Erro",
        "Não foi possível salvar o novo raio no servidor. Deseja sair mesmo assim?",
        [
          { text: "Permanecer e tentar novamente", style: "cancel" },
          { text: "Sair sem salvar", onPress: () => navigation.goBack(), style: "destructive" }
        ]
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raio do Ponto</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: SPACING.md, color: COLORS.textMuted }}>Carregando configuração...</Text>
        </View>
      ) : (
        <>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.mapCard}>
            <View style={styles.mapCircleOuter}>
              <View style={styles.mapCircleInner}>
                <View style={styles.mapDot} />
              </View>
            </View>
          </View>

          <View style={styles.sliderSection}>
            <Text style={styles.sliderTitle}>Definir tamanho do raio</Text>
            <Text style={styles.sliderLabel}>Distância do raio</Text>
            <Text style={styles.sliderValue}>{Math.round(radius)} m</Text>
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={10}
              maximumValue={300}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
            <View style={styles.sliderRange}>
              <Text style={styles.sliderRangeText}>10 m</Text>
              <Text style={styles.sliderRangeText}>300 m</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
            ) : (
              <Text style={styles.saveBtnText}>Salvar Raio</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.md },
  errorBanner: {
    backgroundColor: "#FADBD8",
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  errorText: { color: "#78281F", fontSize: 12, fontWeight: "600", textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: SPACING.sm },
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textDark },
  mapCard: {
    backgroundColor: "#E7ECEF",
    borderRadius: RADIUS.lg,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  mapCircleOuter: {
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: "rgba(46,134,193,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapCircleInner: {
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: "rgba(46,134,193,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.primaryDark },
  sliderSection: { marginBottom: SPACING.lg },
  sliderTitle: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", marginBottom: SPACING.md },
  sliderLabel: { fontSize: 12, color: COLORS.textMuted },
  sliderValue: { fontSize: 20, fontWeight: "700", color: COLORS.textDark, marginBottom: SPACING.xs },
  sliderRange: { flexDirection: "row", justifyContent: "space-between" },
  sliderRangeText: { fontSize: 11, color: COLORS.textMuted },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 15 },
});
