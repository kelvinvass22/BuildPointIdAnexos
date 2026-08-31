import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING, SHADOW } from "../../theme/theme";
import { ownerService } from "../../services/ownerService";

// Tela de detalhe de uma obra já existente. Resolve o caso que faltava:
// o Dono só conseguia vincular um Gerente NO MOMENTO da criação da obra
// (RegisterConstructionScreen). Aqui ele pode vincular um gerente (novo)
// a qualquer momento -- inclusive adicionar mais de um, já que o backend
// aceita vários vinculos_gerente por obra (um por especialidade).
export default function ObraDetailScreen({ navigation, route }) {
  const { obraId } = route?.params || {};

  const [obra, setObra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [especialidade, setEspecialidade] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senhaInicial, setSenhaInicial] = useState("");

  const loadObra = useCallback(async () => {
    if (!obraId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await ownerService.getObra(obraId);
      setObra(data);
    } catch (err) {
      console.error("Erro ao carregar obra:", err);
      setError("Não foi possível carregar os dados da obra.");
    } finally {
      setLoading(false);
    }
  }, [obraId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadObra);
    return unsubscribe;
  }, [navigation, loadObra]);

  const resetForm = () => {
    setEspecialidade("");
    setNomeCompleto("");
    setCpf("");
    setEmail("");
    setTelefone("");
    setSenhaInicial("");
  };

  const handleVincular = async () => {
    if (!especialidade.trim() || !nomeCompleto.trim() || !cpf.trim() || !email.trim()) {
      Alert.alert("Erro", "Preencha Especialidade, Nome, CPF e E-mail do gerente.");
      return;
    }
    try {
      setSaving(true);
      await ownerService.vincularGerenteNovo(obraId, {
        especialidade: especialidade.trim(),
        nomeCompleto: nomeCompleto.trim(),
        cpf: cpf.trim(),
        email: email.trim(),
        telefone: telefone.trim() || undefined,
        senhaInicial: senhaInicial.trim() || undefined,
      });
      resetForm();
      setShowForm(false);
      await loadObra();
      Alert.alert("Sucesso", "Gerente vinculado à obra com sucesso!");
    } catch (err) {
      console.error("Erro ao vincular gerente:", err);
      const backendMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.cpf?.[0] ||
        err?.response?.data?.email?.[0] ||
        err?.response?.data?.especialidade?.[0];
      Alert.alert("Erro", backendMessage || "Não foi possível vincular o gerente no momento.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{obra?.nome || "Obra"}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg }}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadObra} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {obra && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.infoText}>{obra.endereco}</Text>
            </View>
            {!!obra.numero_art && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="file-certificate-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.infoText}>ART: {obra.numero_art}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.infoText}>{obra.total_operarios ?? 0} operário(s)</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Gerentes vinculados</Text>
          <TouchableOpacity onPress={() => setShowForm((v) => !v)}>
            <Ionicons name={showForm ? "close-circle-outline" : "add-circle-outline"} size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {(obra?.vinculos_gerente || []).length === 0 && !showForm && (
          <Text style={styles.emptyText}>Nenhum gerente vinculado ainda. Toque em "+" para vincular um.</Text>
        )}

        {(obra?.vinculos_gerente || []).map((v) => (
          <View key={v.id} style={styles.managerCard}>
            <View style={styles.managerAvatar}>
              <Ionicons name="person" size={18} color={COLORS.primary} />
            </View>
            <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
              <Text style={styles.managerName}>{v.gerente_nome}</Text>
              <Text style={styles.managerSub}>{v.especialidade}</Text>
            </View>
          </View>
        ))}

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Vincular novo gerente</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Especialidade</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: Civil, Elétrica, Hidráulica"
                placeholderTextColor={COLORS.placeholder}
                value={especialidade}
                onChangeText={setEspecialidade}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nome completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do gerente"
                placeholderTextColor={COLORS.placeholder}
                value={nomeCompleto}
                onChangeText={setNomeCompleto}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CPF</Text>
              <TextInput
                style={styles.input}
                placeholder="000.000.000-00"
                placeholderTextColor={COLORS.placeholder}
                value={cpf}
                onChangeText={setCpf}
                keyboardType="numeric"
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
              <Text style={styles.fieldLabel}>WhatsApp (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="(00) 0000-0000"
                placeholderTextColor={COLORS.placeholder}
                value={telefone}
                onChangeText={setTelefone}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Senha inicial (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Deixe em branco para o sistema gerar uma"
                placeholderTextColor={COLORS.placeholder}
                value={senhaInicial}
                onChangeText={setSenhaInicial}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleVincular} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
              ) : (
                <Text style={styles.saveBtnText}>Vincular Gerente</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textDark, flex: 1, textAlign: "center" },
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
  infoCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOW },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  infoText: { fontSize: 12, color: COLORS.textMuted, marginLeft: 6 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textDark },
  emptyText: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.md },
  managerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW,
  },
  managerAvatar: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: "#E7F1FA",
    alignItems: "center",
    justifyContent: "center",
  },
  managerName: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  managerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    ...SHADOW,
  },
  formTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textDark, marginBottom: SPACING.md },
  field: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: 12, color: COLORS.primary, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 13,
    color: COLORS.textDark,
  },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 14 },
});
