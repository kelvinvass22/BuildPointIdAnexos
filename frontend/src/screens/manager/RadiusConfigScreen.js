import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { COLORS, RADIUS, SPACING } from "../../theme/theme";
import { managerService } from "../../services/managerService";
import { geoService } from "../../services/geoService";

export default function RadiusConfigScreen({ navigation, route }) {
  const { obraId: obraIdParam } = route?.params || {};

  const [obraId, setObraId] = useState(obraIdParam || null);
  const [radius, setRadius] = useState(127);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Carrega o raio atual da obra (não existe endpoint separado -- o valor
  // já vem em Obra.raio_metros).
  useEffect(() => {
    const fetchObra = async () => {
      try {
        setLoading(true);
        setError(null);
        const obra = obraIdParam ? await managerService.getObra(obraIdParam) : await managerService.getObraAtual();
        if (obra) {
          setObraId(obra.id);
          if (typeof obra.raio_metros === "number") {
            setRadius(obra.raio_metros);
          }
        } else {
          setError("Nenhuma obra vinculada ao seu usuário foi encontrada.");
        }
      } catch (err) {
        console.error("Erro ao obter raio do ponto:", err);
        setError("Não foi possível obter a configuração de raio. Usando valor padrão.");
      } finally {
        setLoading(false);
      }
    };

    fetchObra();
  }, [obraIdParam]);

  // Envia a nova configuração de raio para o backend, usando a localização
  // atual do dispositivo do gerente como centro do geofence (RF04).
  const handleSave = async () => {
    if (!obraId) {
      Alert.alert("Erro", "Não foi possível identificar a obra.");
      return;
    }

    try {
      setSaving(true);
      const position = await geoService.getCurrentPosition();

      if (position.precisao_gps_metros > 10) {
        Alert.alert(
          "Sinal de GPS fraco",
          `A precisão atual é de ${Math.round(position.precisao_gps_metros)}m. O servidor exige até 10m de precisão para configurar o geofence. Tente em um local mais aberto.`
        );
        return;
      }

      await managerService.configurarGeofence(obraId, {
        latitude: position.latitude,
        longitude: position.longitude,
        raio_metros: Math.round(radius),
        precisao_gps_metros: position.precisao_gps_metros,
      });
      Alert.alert("Sucesso", "Configuração do raio salva com sucesso!");
      navigation.goBack();
    } catch (err) {
      console.error("Erro ao salvar raio do ponto:", err);
      const backendMessage = err?.response?.data?.detail || err?.message;
      Alert.alert(
        "Erro",
        backendMessage || "Não foi possível salvar o novo raio no servidor. Deseja sair mesmo assim?",
        [
          { text: "Permanecer e tentar novamente", style: "cancel" },
          { text: "Sair sem salvar", onPress: () => navigation.goBack(), style: "destructive" },
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
              minimumValue={5}
              maximumValue={300}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
            <View style={styles.sliderRange}>
              <Text style={styles.sliderRangeText}>5 m</Text>
              <Text style={styles.sliderRangeText}>300 m</Text>
            </View>
            <Text style={styles.helperText}>
              Ao salvar, sua localização atual será usada como o centro da obra.
            </Text>
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
  helperText: { fontSize: 11, color: COLORS.textMuted, marginTop: SPACING.sm, textAlign: "center" },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 15 },
});
