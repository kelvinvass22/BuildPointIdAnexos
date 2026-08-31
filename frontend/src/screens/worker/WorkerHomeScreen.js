import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING, SHADOW } from "../../theme/theme";
import { workerService } from "../../services/workerService";
import authService from "../../services/authService";

export default function WorkerHomeScreen({ navigation }) {
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHomeStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Ajustar rota ou tipo com o backend se necessário
      const data = await workerService.getHomeStatus();
      setWorker(data);
    } catch (err) {
      console.error("Erro ao carregar dados do operário:", err);
      // TODO: Ajustar tratamento de erro com o backend
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja realmente sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await authService.logout();
          navigation.getParent()?.reset({ index: 0, routes: [{ name: "Auth", params: { screen: "ProfileSelect" } }] });
        },
      },
    ]);
  };

  useEffect(() => {
    loadHomeStatus();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: SPACING.md, color: COLORS.textMuted, fontSize: 14 }}>
          Carregando...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !worker) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center", paddingHorizontal: SPACING.lg }]}>
        <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: SPACING.md }}>
          {error || "Não foi possível carregar seus dados."}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadHomeStatus}>
          <Text style={styles.retryBtnText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá , {worker.name}</Text>
          <View style={styles.locationRow}>
            <MaterialIcons name="restaurant" size={14} color={COLORS.textMuted} />
            <Text style={styles.locationText}>{worker.location}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.avatarWrap} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.center}>
        <Text style={styles.clock}>{worker.time}</Text>
        <Text style={styles.dateLabel}>{worker.dateLabel}</Text>

        <TouchableOpacity
          style={styles.bigButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("WorkerCamera", { obraId: worker.obraId })}
        >
          <Ionicons name="scan-outline" size={40} color={COLORS.textOnPrimary} />
          <Text style={styles.bigButtonText}>BATER PONTO{"\n"}AGORA</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.bottomBarItem}>
          <Ionicons name="camera-outline" size={22} color={COLORS.textOnPrimary} />
          <Text style={styles.bottomBarLabel}>Bater Ponto</Text>
        </View>
        <TouchableOpacity style={styles.bottomBarItem} onPress={() => navigation.navigate("WorkerHistory")}>
          <Ionicons name="time-outline" size={22} color={COLORS.textOnPrimaryMuted} />
          <Text style={[styles.bottomBarLabel, { color: COLORS.textOnPrimaryMuted }]}>Histórico</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  greeting: { fontSize: 18, fontWeight: "700", color: COLORS.textDark },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  locationText: { fontSize: 12, color: COLORS.textMuted, marginLeft: 4 },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.lg },
  clock: { fontSize: 46, fontWeight: "700", color: COLORS.textDark },
  dateLabel: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.xl },
  bigButton: {
    width: 200,
    height: 200,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  bigButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
    marginTop: SPACING.sm,
    letterSpacing: 0.5,
  },
  bottomBar: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
  },
  bottomBarItem: { flex: 1, alignItems: "center" },
  bottomBarLabel: { color: COLORS.textOnPrimary, fontSize: 11, marginTop: 2, fontWeight: "600" },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.sm },
  retryBtnText: { color: COLORS.textOnPrimary, fontSize: 13, fontWeight: "700" },
});