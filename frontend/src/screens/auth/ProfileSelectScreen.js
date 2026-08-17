import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING } from "../../theme/theme";

const PROFILES = [
  {
    key: "owner",
    title: "Dono / Construtora",
    subtitle: "Visão geral e cadastro",
    icon: "person-outline",
  },
  {
    key: "manager",
    title: "Gerente da Construção",
    subtitle: "Gestão de equipe e pontos",
    icon: "person-circle-outline",
  },
  {
    key: "worker",
    title: "Operário",
    subtitle: "Bater ponto e histórico",
    icon: "hand-left-outline",
  },
];

export default function ProfileSelectScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <MaterialCommunityIcons name="hard-hat" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.appName}>BuildPoint ID</Text>
        <Text style={styles.appTagline}>Controle de acesso inteligente</Text>

        <Text style={styles.selectLabel}>Selecione seu perfil de acesso:</Text>

        <View style={{ width: "100%", marginTop: SPACING.md }}>
          {PROFILES.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={styles.profileCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("Login", { role: p.key })}
            >
              <View style={styles.profileIconWrap}>
                <Ionicons name={p.icon} size={20} color={COLORS.primary} />
              </View>
              <View style={{ marginLeft: SPACING.sm }}>
                <Text style={styles.profileTitle}>{p.title}</Text>
                <Text style={styles.profileSubtitle}>{p.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primary },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl * 1.4,
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  appName: { color: COLORS.textOnPrimary, fontSize: 24, fontWeight: "700" },
  appTagline: { color: COLORS.textOnPrimaryMuted, fontSize: 13, marginTop: 4, marginBottom: SPACING.xl },
  selectLabel: { color: COLORS.textOnPrimary, fontSize: 14, fontWeight: "600", alignSelf: "center" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  profileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  profileTitle: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 15 },
  profileSubtitle: { color: COLORS.textOnPrimaryMuted, fontSize: 12, marginTop: 2 },
});
