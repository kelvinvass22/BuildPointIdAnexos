import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING, SHADOW } from "../../theme/theme";
import { managerService } from "../../services/managerService";
import clockService from "../../services/clockService";

export default function ManagerDashboardScreen({ navigation }) {
  const [obra, setObra] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const obraData = await managerService.getObraAtual();
      setObra(obraData);

      if (obraData) {
        const attendanceData = await managerService.getDailyAttendance();
        setAttendance(attendanceData);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do painel:", err);
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWorker = (item) => {
    Alert.alert("Remover operário", `Remover ${item.name} da equipe?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            await managerService.removerOperario(item.id);
            await loadDashboardData();
            Alert.alert("Operário removido", "O acesso foi desativado e o histórico foi preservado.");
          } catch (err) {
            Alert.alert("Erro", err?.response?.data?.detail || "Não foi possível remover o operário.");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    loadDashboardData();
    clockService.sync().then(setCurrentTime).catch(() => setCurrentTime(clockService.now()));
    const timer = setInterval(() => setCurrentTime(clockService.now()), 1000);
    return () => clearInterval(timer);
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
          <Text style={styles.headerTitle}>{obra?.nome || "Nenhuma obra vinculada"}</Text>
                    <Text style={styles.headerClock}>{currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</Text>
          <View style={styles.headerAddrRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textOnPrimaryMuted} />
            <Text style={styles.headerAddr}>{obra?.endereco || "--"}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Ações Rápidas</Text>
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate("RadiusConfig", { obraId: obra?.id })}
          disabled={!obra}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="locate-outline" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.quickActionText}>Configurar Distância do Ponto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate("RegisterWorker", { obraId: obra?.id })}
          disabled={!obra}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.quickActionText}>Cadastrar Novo Operário</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.registerTeamBtn}
        onPress={() => navigation.navigate("ManagerCamera", { obraId: obra?.id })}
        disabled={!obra}
      >
        <Ionicons name="camera-outline" size={18} color={COLORS.textOnPrimary} />
        <View style={{ marginLeft: SPACING.sm }}>
          <Text style={styles.registerTeamText}>Registrar Ponto da Equipe</Text>
          <Text style={styles.registerTeamSub}>Usar câmera</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.teamLink}
        onPress={() => navigation.navigate("Teams", { obraId: obra?.id })}
        disabled={!obra}
      >
        <Ionicons name="people-outline" size={18} color={COLORS.primary} />
        <Text style={styles.teamLinkText}>Organizar equipes</Text>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
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
              {!item.possuiBiometria && (
                <TouchableOpacity
                  style={styles.pendingBadge}
                  onPress={() => navigation.navigate("EnrollBiometry", { operarioId: item.id, operarioNome: item.name })}
                >
                  <Ionicons name="alert-circle-outline" size={12} color={COLORS.warning} />
                  <Text style={styles.pendingBadgeText}>Biometria pendente -- toque para concluir</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.attendanceTime}>{item.time}</Text>
              <Text style={styles.attendanceStatus}>{item.status}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("EditWorker", { operarioId: item.id })}
              style={styles.removeButton}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemoveWorker(item)} style={styles.removeButton}>
              <Ionicons name="person-remove-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
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
    headerClock: { color: COLORS.textOnPrimary, fontSize: 13, fontWeight: "700", marginTop: 4 },
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
  teamLink: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card, marginHorizontal: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.md },
  teamLinkText: { flex: 1, color: COLORS.textDark, fontWeight: "600", marginLeft: SPACING.sm },

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
  removeButton: { marginLeft: SPACING.sm, padding: SPACING.xs },
  pendingBadge: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  pendingBadgeText: { fontSize: 10, color: COLORS.warning, marginLeft: 4, fontWeight: "600" },
});
