import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING } from "../../theme/theme";
import { managerService } from "../../services/managerService";

const CARGOS = ["Pedreiro", "Mestre de Obras", "Servente", "Eletricista", "Encanador"];

// Edição dos dados cadastrais de um operário já existente (RF05 -- antes
// só dava pra cadastrar, não pra corrigir um cadastro feito errado).
// CPF não é editável aqui de propósito (é a credencial de login/username
// e o identificador de auditoria da pessoa -- ver AtualizarOperarioSerializer
// no backend); pra trocar um CPF errado, use o Django Admin.
export default function EditWorkerScreen({ navigation, route }) {
  const { operarioId } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cpf, setCpf] = useState("");

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cargo, setCargo] = useState("Pedreiro");
  const [tipoVinculo, setTipoVinculo] = useState("PROPRIO");
  const [empresaTerceirizada, setEmpresaTerceirizada] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState(""); // dd/mm/aaaa

  const toISODate = (value) => {
    const parts = value.split("/");
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    if (!dd || !mm || !yyyy) return null;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  };

  const toBRDate = (isoValue) => {
    if (!isoValue) return "";
    const [yyyy, mm, dd] = isoValue.split("-");
    if (!yyyy || !mm || !dd) return "";
    return `${dd}/${mm}/${yyyy}`;
  };

  const loadOperario = useCallback(async () => {
    if (!operarioId) return;
    try {
      setLoading(true);
      // Não existe GET de um operário só -- a lista já traz tudo que
      // precisamos (é a mesma que alimenta o painel do Gerente).
      const { results } = await managerService.listOperarios();
      const perfil = (results || []).find((op) => op.usuario?.id === operarioId);
      if (!perfil) {
        Alert.alert("Não encontrado", "Não foi possível localizar este operário.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        return;
      }
      setNomeCompleto(perfil.usuario?.nome_completo || "");
      setCpf(perfil.usuario?.cpf || "");
      setEmail(perfil.usuario?.email || "");
      setEndereco(perfil.endereco || "");
      setCargo(perfil.cargo || "Pedreiro");
      setTipoVinculo(perfil.tipo_vinculo || "PROPRIO");
      setEmpresaTerceirizada(perfil.empresa_terceirizada || "");
      setDataAdmissao(toBRDate(perfil.data_admissao));
    } catch (err) {
      console.error("Erro ao carregar operário:", err);
      Alert.alert("Erro", "Não foi possível carregar os dados do operário.");
    } finally {
      setLoading(false);
    }
  }, [operarioId, navigation]);

  useEffect(() => {
    loadOperario();
  }, [loadOperario]);

  const handleSave = async () => {
    if (!nomeCompleto.trim()) {
      Alert.alert("Erro", "O nome não pode ficar em branco.");
      return;
    }
    const dataAdmissaoISO = dataAdmissao.trim() ? toISODate(dataAdmissao.trim()) : null;
    if (dataAdmissao.trim() && !dataAdmissaoISO) {
      Alert.alert("Erro", "Data de admissão inválida. Use o formato dd/mm/aaaa.");
      return;
    }

    try {
      setSaving(true);
      await managerService.atualizarOperario(operarioId, {
        nomeCompleto: nomeCompleto.trim(),
        email: email.trim(),
        cargo: cargo || "",
        tipoVinculo,
        empresaTerceirizada: empresaTerceirizada.trim(),
        endereco: endereco.trim(),
        dataAdmissao: dataAdmissaoISO || null,
      });
      Alert.alert("Cadastro atualizado", "Os dados do operário foram salvos com sucesso.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error("Erro ao atualizar operário:", err);
      const backendMessage = err?.response?.data?.detail || err?.response?.data?.email?.[0];
      Alert.alert("Erro", backendMessage || "Não foi possível salvar as alterações no momento.");
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
        <Text style={styles.headerTitle}>Editar Operário</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg }}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nome completo</Text>
          <TextInput style={styles.input} value={nomeCompleto} onChangeText={setNomeCompleto} placeholderTextColor={COLORS.placeholder} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>CPF (não editável)</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>{cpf}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Vínculo profissional</Text>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => Alert.alert("Selecionar vínculo", "", [
              { text: "Próprio", onPress: () => setTipoVinculo("PROPRIO") },
              { text: "Terceirizado", onPress: () => setTipoVinculo("TERCEIRIZADO") },
            ])}
          >
            <Text style={styles.selectPlaceholder}>{tipoVinculo === "TERCEIRIZADO" ? "Terceirizado" : "Próprio"}</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {tipoVinculo === "TERCEIRIZADO" && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Empresa terceirizada</Text>
            <TextInput style={styles.input} placeholderTextColor={COLORS.placeholder} value={empresaTerceirizada} onChangeText={setEmpresaTerceirizada} />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={COLORS.placeholder}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Endereço</Text>
          <TextInput style={styles.input} value={endereco} onChangeText={setEndereco} placeholderTextColor={COLORS.placeholder} />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: SPACING.sm }]}>
            <Text style={styles.fieldLabel}>Cargo / Função</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => {
                Alert.alert("Selecionar Cargo", "", CARGOS.map((c) => ({ text: c, onPress: () => setCargo(c) })));
              }}
            >
              <Text style={styles.selectPlaceholder}>{cargo}</Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Admissão</Text>
            <TextInput
              style={styles.input}
              placeholder="dd/mm/aaaa"
              placeholderTextColor={COLORS.placeholder}
              value={dataAdmissao}
              onChangeText={setDataAdmissao}
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={COLORS.textOnPrimary} /> : <Text style={styles.saveBtnText}>Salvar alterações</Text>}
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
  inputDisabled: { backgroundColor: COLORS.background, justifyContent: "center" },
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
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: "center", marginTop: SPACING.sm },
  saveBtnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 15 },
});
