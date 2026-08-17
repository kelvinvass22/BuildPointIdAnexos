import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING, SHADOW } from "../../theme/theme";
import { ownerProfile, myWorks } from "../../data/mockData";

export default function OwnerDashboardScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Text style={styles.welcomeText}>Bem-vindo,</Text>
          <Text style={styles.userName}>{ownerProfile.name}</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="notifications-outline" size={18} color={COLORS.textOnPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerIcon, { marginLeft: SPACING.sm }]}
          onPress={() => navigation.getParent()?.navigate("Auth", { screen: "ProfileSelect" })}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.textOnPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Visão Geral</Text>

        <View style={styles.statCardWide}>
          <Text style={styles.statLabel}>Obras ativas</Text>
          <Text style={styles.statValueBig}>{ownerProfile.activeWorks}</Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Gerentes</Text>
            <Text style={styles.statValue}>{ownerProfile.managers}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Operários Hoje</Text>
            <Text style={styles.statValue}>{ownerProfile.workersToday}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Minhas Obras</Text>
        <FlatList
          data={myWorks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 90 }}
          renderItem={({ item }) => (
            <View style={styles.workCard}>
              <View style={styles.workIcon}>
                <MaterialCommunityIcons name="office-building-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={styles.workName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.workLocRow}>
                  <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.workLoc}>{item.location}</Text>
                </View>
                <Text style={styles.workManager}>
                  Gerente: <Text style={{ fontWeight: "700" }}>{item.manager}</Text>
                </Text>
              </View>
            </View>
          )}
        />
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
