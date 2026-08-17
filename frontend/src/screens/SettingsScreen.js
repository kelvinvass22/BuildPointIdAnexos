import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING, SHADOW } from "../theme/theme";

const ITEMS = [
  { icon: "person-outline", label: "Meu Perfil" },
  { icon: "notifications-outline", label: "Notificações" },
  { icon: "shield-checkmark-outline", label: "Privacidade e Segurança" },
  { icon: "help-circle-outline", label: "Ajuda e Suporte" },
];

export default function SettingsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Configurações</Text>
      <View style={{ paddingHorizontal: SPACING.md }}>
        {ITEMS.map((item) => (
          <TouchableOpacity key={item.label} style={styles.row}>
            <Ionicons name={item.icon} size={20} color={COLORS.primary} />
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.row, { marginTop: SPACING.lg }]}
          onPress={() => navigation.getParent()?.navigate("Auth", { screen: "ProfileSelect" })}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={[styles.rowLabel, { color: COLORS.danger }]}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.textDark, padding: SPACING.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW,
  },
  rowLabel: { flex: 1, marginLeft: SPACING.sm, fontSize: 14, color: COLORS.textDark, fontWeight: "600" },
});
