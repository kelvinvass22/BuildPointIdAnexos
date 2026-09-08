import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, RADIUS, SPACING, SHADOW } from "../../theme/theme";
import { ownerService } from "../../services/ownerService";
import authService from "../../services/authService";
import clockService from "../../services/clockService";

export default function OwnerDashboardScreen({ navigation }) {
  const [nome, setNome] = useState("Dono");
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const storedNome = await AsyncStorage.getItem("@BuildPoint:nome");
      if (storedNome) setNome(storedNome);

      const { results } = await ownerService.listObras();
      setObras(results);
    } catch (err) {
      console.error("Erro ao carregar obras:", err);
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadData);
    clockService.sync().then(setCurrentTime).catch(() => setCurrentTime(clockService.now()));
    const timer = setInterval(() => setCurrentTime(clockService.now()), 1000);
    return () => { unsubscribe(); clearInterval(timer); };
  }, [navigation, loadData]);

  const activeWorks = obras.filter((o) => o.status === "ATIVA").length;
  const managers = new Set(
    obras.flatMap((o) => (o.vinculos_gerente || []).map((v) => v.gerente))
  ).size;
  const workersTotal = obras.reduce((sum, o) => sum + (o.total_operarios || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Text style={styles.welcomeText}>Bem-vindo,</Text>
          <Text style={styles.userName}>{nome}</Text>
                  <Text style={styles.clock}>{currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="notifications-outline" size={18} color={COLORS.textOnPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerIcon, { marginLeft: SPACING.sm }]}
          onPress={async () => {
            await authService.logout();
            navigation.getParent()?.navigate("Auth", { screen: "ProfileSelect" });
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.textOnPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Visão Geral</Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statCardWide}>
          <Text style={styles.statLabel}>Obras ativas</Text>
          <Text style={styles.statValueBig}>{activeWorks}</Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Gerentes</Text>
            <Text style={styles.statValue}>{managers}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Operários</Text>
            <Text style={styles.statValue}>{workersTotal}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Minhas Obras</Text>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
        ) : (
          <FlatList
            data={obras}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 90 }}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", color: COLORS.textMuted, marginTop: SPACING.lg }}>
                Nenhuma obra cadastrada ainda.
              </Text>
            }
            renderItem={({ item }) => {
              const gerentesNomes = (item.vinculos_gerente || []).map((v) => v.gerente_nome).join(", ");
              return (
                <TouchableOpacity
                  style={styles.workCard}
                  onPress={() => navigation.navigate("ObraDetail", { obraId: item.id })}
                >
                  <View style={styles.workIcon}>
                    <MaterialCommunityIcons name="office-building-outline" size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={styles.workName} numberOfLines={2}>{item.nome}</Text>
                    <View style={styles.workLocRow}>
                      <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.workLoc}>{item.endereco}</Text>
                    </View>
                    <Text style={styles.workManager}>
                      Gerente: <Text style={{ fontWeight: "700" }}>{gerentesNomes || "Não vinculado"}</Text>
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("RegisterConstruction")}
      >
        <Ionicons name="add" size={26} color={COLORS.textOnPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeText: { color: COLORS.textOnPrimaryMuted, fontSize: 12 },
  userName: { color: COLORS.textOnPrimary, fontSize: 15, fontWeight: "700" },
  clock: { color: COLORS.textOnPrimaryMuted, fontSize: 12, marginTop: 2 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textDark, marginBottom: SPACING.sm },
  errorBanner: {
    backgroundColor: "#FADBD8",
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: { color: "#78281F", fontSize: 12, fontWeight: "600", flex: 1, marginRight: SPACING.xs },
  retryBtn: { backgroundColor: "#E74C3C", paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.xs },
  retryBtnText: { color: COLORS.textOnPrimary, fontSize: 11, fontWeight: "700" },
  statCardWide: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW,
  },
  statLabel: { fontSize: 12, color: COLORS.textMuted },
  statValueBig: { fontSize: 26, fontWeight: "700", color: COLORS.primary, marginTop: 2 },
  statRow: { flexDirection: "row", marginBottom: SPACING.md },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginRight: SPACING.sm,
    ...SHADOW,
  },
  statValue: { fontSize: 20, fontWeight: "700", color: COLORS.primary, marginTop: 2 },
  workCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW,
  },
  workIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: "#E7F1FA",
    alignItems: "center",
    justifyContent: "center",
  },
  workName: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  workLocRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  workLoc: { fontSize: 11, color: COLORS.textMuted, marginLeft: 4 },
  workManager: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  fab: {
    position: "absolute",
    right: SPACING.lg,
    bottom: 90,
    width: 50,
    height: 50,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
});
