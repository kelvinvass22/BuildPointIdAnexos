import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING } from "../../theme/theme";

export default function RegisterWorkerScreen({ navigation }) {
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cadastrar Operário</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg }}>
        <Text style={styles.sectionLabel}>DADOS DO OPERÁRIO</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nome completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome do operário"
            placeholderTextColor={COLORS.placeholder}
            value={nome}
            onChangeText={setNome}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Endereço</Text>
          <TextInput
            style={styles.input}
            placeholder="00.000.000/0000-0"
            placeholderTextColor={COLORS.placeholder}
            value={endereco}
            onChangeText={setEndereco}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: SPACING.sm }]}>
            <Text style={styles.fieldLabel}>Cargo / Função</Text>
            <View style={styles.selectInput}>
              <Text style={styles.selectPlaceholder}>Pedreiro</Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
            </View>
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Admissão</Text>
            <TextInput
              style={styles.input}
              placeholder="dd / mm / aaaa"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>ID Facial</Text>
        <TouchableOpacity style={styles.faceBox}>
          <Ionicons name="scan-outline" size={32} color={COLORS.primary} />
          <Text style={styles.faceBoxText}>Escanear Rosto para Cadastro</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.saveBtnText}>Concluir</Text>
        </TouchableOpacity>
      </ScrollView>
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
  sectionLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  field: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: 12, color: COLORS.textDark, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 13,
    color: COLORS.textDark,
  },
  selectInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectPlaceholder: { fontSize: 13, color: COLORS.textDark },
  row: { flexDirection: "row" },
  faceBox: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  faceBoxText: { fontSize: 12, color: COLORS.primary, marginTop: SPACING.sm, fontWeight: "600" },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 15 },
});
