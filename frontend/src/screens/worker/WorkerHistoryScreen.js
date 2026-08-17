import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING, SHADOW } from "../../theme/theme";
import { historyMonth, historyEntries } from "../../data/mockData";

const STATUS_ICON = {
  ok: { name: "checkmark-circle", color: COLORS.success },
  warning: { name: "alert-circle", color: COLORS.warning },
  alert: { name: "person-remove", color: COLORS.danger },
};

function EntryRow({ entry }) {
  const icon = STATUS_ICON[entry.status];
  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{entry.dateLabel}</Text>
        <Ionicons name={icon.name} size={18} color={icon.color} />
      </View>
      <View style={styles.entryRow}>
        <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
        <Text style={styles.entryLabel}>Entrada: </Text>
        <Text style={styles.entryValue}>{entry.entrada}</Text>
        <View style={{ width: SPACING.md }} />
        <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
        <Text style={styles.entryLabel}>Saída: </Text>
        <Text style={styles.entryValue}>{entry.saida}</Text>
      </View>
      <View style={styles.entryRow}>
        <View style={[styles.dot, { backgroundColor: COLORS.warning }]} />
        <Text style={styles.entryLabel}>Saída para almoço: </Text>
        <Text style={styles.entryValue}>{entry.almocoSaida}</Text>
      </View>
      <View style={styles.entryRow}>
        <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
        <Text style={styles.entryLabel}>Volta: </Text>
        <Text style={styles.entryValue}>{entry.almocoVolta}</Text>
      </View>
    </View>
  );
}

export default function WorkerHistoryScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Histórico</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.monthLabel}>{historyMonth.label}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Dias trabalhados</Text>
            <Text style={styles.summaryValue}>{historyMonth.daysWorked}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Horas extras</Text>
            <Text style={styles.summaryValue}>{historyMonth.extraHours}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={historyEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg }}
        renderItem={({ item }) => <EntryRow entry={item} />}
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomBarItem} onPress={() => navigation.navigate("WorkerHome")}>
          <Ionicons name="camera-outline" size={22} color={COLORS.textOnPrimaryMuted} />
          <Text style={[styles.bottomBarLabel, { color: COLORS.textOnPrimaryMuted }]}>Bater Ponto</Text>
        </TouchableOpacity>
        <View style={styles.bottomBarItem}>
          <Ionicons name="time-outline" size={22} color={COLORS.textOnPrimary} />
          <Text style={styles.bottomBarLabel}>Histórico</Text>
        </View>
      </View>
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
  summaryCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  monthLabel: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 14, marginBottom: SPACING.sm },
  summaryRow: { flexDirection: "row" },
  summaryBox: { flex: 1 },
  summaryLabel: { color: COLORS.textOnPrimaryMuted, fontSize: 12 },
  summaryValue: { color: COLORS.textOnPrimary, fontSize: 20, fontWeight: "700", marginTop: 2 },
  entryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW,
  },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.sm },
  entryDate: { fontWeight: "700", color: COLORS.textDark, fontSize: 13 },
  entryRow: { flexDirection: "row", alignItems: "center", marginBottom: 4, flexWrap: "wrap" },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  entryLabel: { fontSize: 12, color: COLORS.textMuted },
  entryValue: { fontSize: 12, color: COLORS.textDark, fontWeight: "600" },
  bottomBar: { flexDirection: "row", backgroundColor: COLORS.primary, paddingVertical: SPACING.sm },
  bottomBarItem: { flex: 1, alignItems: "center" },
  bottomBarLabel: { color: COLORS.textOnPrimary, fontSize: 11, marginTop: 2, fontWeight: "600" },
});
