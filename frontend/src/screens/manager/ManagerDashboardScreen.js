import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING, SHADOW } from "../../theme/theme";
import { currentObra, dailyAttendance } from "../../data/mockData";
import { managerService } from "../../services/managerService";

export default function ManagerDashboardScreen({ navigation }) {
  const [obra, setObra] = useState(currentObra);
  const [attendance, setAttendance] = useState(dailyAttendance);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Ajustar rotas ou tipos com o backend
      const [obraData, attendanceData] = await Promise.all([
        managerService.getCurrentObra(),
        managerService.getDailyAttendance()
      ]);
      
      if (obraData) setObra(obraData);
      if (attendanceData) setAttendance(attendanceData);
    } catch (err) {
      console.error("Erro ao carregar dados do painel:", err);
      // TODO: Ajustar tratamento de erro e exibição de alertas
      setError("Não foi possível conectar ao servidor. Exibindo dados locais.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: SPACING.md, color: COLORS.textMuted, fontSize: 14 }}>
          Carregando informações do painel...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadDashboardData} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.headerCard}>
        <View style={styles.headerIconWrap}>
          <MaterialCommunityIcons name="office-building-outline" size={18} color={COLORS.textOnPrimary} />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Text style={styles.headerLabel}>OBRA ATUAL</Text>
          <Text style={styles.headerTitle}>{obra.name}</Text>
          <View style={styles.headerAddrRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textOnPrimaryMuted} />
            <Text style={styles.headerAddr}>{obra.address}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Ações Rápidas</Text>
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate("RadiusConfig")}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="locate-outline" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.quickActionText}>Configurar Distância do Ponto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate("RegisterWorker")}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.quickActionText}>Cadastrar Novo Operário</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.registerTeamBtn} onPress={() => navigation.navigate("ManagerCamera")}>
        <Ionicons name="camera-outline" size={18} color={COLORS.textOnPrimary} />
        <View style={{ marginLeft: SPACING.sm }}>
          <Text style={styles.registerTeamText}>Registrar Ponto da Equipe</Text>
          <Text style={styles.registerTeamSub}>Usar câmera</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Presença Diária</Text>
      <FlatList
        data={attendance}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md }}
        renderItem={({ item }) => (
          <View style={styles.attendanceRow}>
            <View style={styles.attendanceAvatar}>
              <Ionicons name="person" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={styles.attendanceName}>{item.name}</Text>
              <Text style={styles.attendanceRole}>{item.role}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.attendanceTime}>{item.time}</Text>
              <Text style={styles.attendanceStatus}>{item.status}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  errorBanner: {
    backgroundColor: "#FADBD8",
    padding: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: { color: "#78281F", fontSize: 12, fontWeight: "600", flex: 1, marginRight: SPACING.xs },
  retryBtn: { backgroundColor: "#E74C3C", paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.xs },
  retryBtnText: { color: COLORS.textOnPrimary, fontSize: 11, fontWeight: "700" },
  headerCard: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    margin: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: { color: COLORS.textOnPrimaryMuted, fontSize: 10, fontWeight: "700" },
  headerTitle: { color: COLORS.textOnPrimary, fontSize: 16, fontWeight: "700", marginTop: 2 },
  headerAddrRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  headerAddr: { color: COLORS.textOnPrimaryMuted, fontSize: 11, marginLeft: 4, flexShrink: 1 },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textDark, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, marginTop: SPACING.xs },

  quickActionsRow: { flexDirection: "row", paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginRight: SPACING.sm,
    ...SHADOW,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: "#E7F1FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  quickActionText: { fontSize: 12, fontWeight: "600", color: COLORS.textDark },

  registerTeamBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  registerTeamText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 13 },
  registerTeamSub: { color: COLORS.textOnPrimaryMuted, fontSize: 11 },

  attendanceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOW,
  },
  attendanceAvatar: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: "#E7F1FA",
    alignItems: "center",
    justifyContent: "center",
  },
  attendanceName: { fontSize: 13, fontWeight: "600", color: COLORS.textDark },
  attendanceRole: { fontSize: 11, color: COLORS.textMuted },
  attendanceTime: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  attendanceStatus: { fontSize: 10, color: COLORS.success },
});
