import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING } from "../../theme/theme";

export default function RegisterConstructionScreen({ navigation }) {
  const [nomeObra, setNomeObra] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [gerenteNome, setGerenteNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cadastrar nova Obra</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg }}>
        <Text style={styles.sectionLabel}>DADOS DA OBRA</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nome da Obra</Text>
          <TextInput
            style={styles.input}
            placeholder="Refeitório IFCE Boa Viagem"
            placeholderTextColor={COLORS.placeholder}
            value={nomeObra}
            onChangeText={setNomeObra}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Endereço</Text>
          <TextInput
            style={styles.input}
            placeholder="Rua, Número, Bairro, Cidade"
            placeholderTextColor={COLORS.placeholder}
            value={endereco}
            onChangeText={setEndereco}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>CPNJ</Text>
          <TextInput
            style={styles.input}
            placeholder="00.000.000/0000-0"
            placeholderTextColor={COLORS.placeholder}
            value={cnpj}
            onChangeText={setCnpj}
            keyboardType="numeric"
          />
        </View>

        <Text style={styles.sectionLabel}>DADOS DO GERENTE</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nome completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do gerente responsável"
            placeholderTextColor={COLORS.placeholder}
            value={gerenteNome}
            onChangeText={setGerenteNome}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="email.gerente@gmail.com"
            placeholderTextColor={COLORS.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>WhatsApp</Text>
          <TextInput
            style={styles.input}
            placeholder="(00) 0000-0000"
            placeholderTextColor={COLORS.placeholder}
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.saveBtnText}>Salvar e Ativar a Obra</Text>
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
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.primary },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, marginTop: SPACING.md, marginBottom: SPACING.sm },
  field: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: 12, color: COLORS.primary, fontWeight: "600", marginBottom: 6 },
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
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: SPACING.md,
  },
  saveBtnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 15 },
});
