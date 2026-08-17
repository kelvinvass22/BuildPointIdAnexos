import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING, SHADOW } from "../../theme/theme";
import { currentWorker } from "../../data/mockData";

export default function WorkerHomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá , {currentWorker.name}</Text>
          <View style={styles.locationRow}>
            <MaterialIcons name="restaurant" size={14} color={COLORS.textMuted} />
            <Text style={styles.locationText}>{currentWorker.location}</Text>
          </View>
        </View>
        <View style={styles.avatarWrap}>
          <Ionicons name="qr-code-outline" size={18} color={COLORS.primary} />
        </View>
      </View>

      <View style={styles.center}>
        <Text style={styles.clock}>{currentWorker.time}</Text>
        <Text style={styles.dateLabel}>{currentWorker.dateLabel}</Text>

        <TouchableOpacity
          style={styles.bigButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("WorkerCamera")}
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
});
