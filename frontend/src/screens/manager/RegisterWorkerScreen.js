import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING } from "../../theme/theme";
import { managerService } from "../../services/managerService";

const CARGOS = ["Pedreiro", "Mestre de Obras", "Servente", "Eletricista", "Encanador"];

export default function RegisterWorkerScreen({ navigation, route }) {
  const { obraId } = route?.params || {};

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cargo, setCargo] = useState("Pedreiro");
  const [tipoVinculo, setTipoVinculo] = useState("PROPRIO");
  const [empresaTerceirizada, setEmpresaTerceirizada] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState(""); // dd/mm/aaaa (convertido antes de enviar)
  const [senhaInicial, setSenhaInicial] = useState("");
  const [saving, setSaving] = useState(false);

  const toISODate = (value) => {
    // Converte "dd/mm/aaaa" -> "aaaa-mm-dd" (formato exigido pelo backend).
    const parts = value.split("/");
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    if (!dd || !mm || !yyyy) return null;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  };

  const handleSave = async () => {
    if (!nomeCompleto.trim() || !cpf.trim() || !senhaInicial.trim()) {
      Alert.alert("Erro", "Por favor, preencha ao menos Nome, CPF e Senha inicial.");
      return;
    }
    if (!obraId) {
      Alert.alert("Erro", "Não foi possível identificar a obra atual. Volte e tente novamente.");
      return;
    }

    const dataAdmissaoISO = dataAdmissao.trim() ? toISODate(dataAdmissao.trim()) : null;
    if (dataAdmissao.trim() && !dataAdmissaoISO) {
      Alert.alert("Erro", "Data de admissão inválida. Use o formato dd/mm/aaaa.");
      return;
    }

    try {
      setSaving(true);
      const operario = await managerService.cadastrarOperario({
        nomeCompleto: nomeCompleto.trim(),
        cpf: cpf.trim(),
        email: email.trim() || undefined,
        cargo: cargo || undefined,
        tipoVinculo,
        empresaTerceirizada: empresaTerceirizada.trim() || undefined,
        endereco: endereco.trim() || undefined,
        dataAdmissao: dataAdmissaoISO || undefined,
        senhaInicial: senhaInicial.trim(),
        obraId,
      });

      const operarioId = operario?.id || operario?.usuario?.id;

      Alert.alert("Cadastro criado", "Agora vamos capturar a biometria facial do operário.", [
        {
          text: "Continuar",
          onPress: () =>
            navigation.replace("EnrollBiometry", {
              operarioId,
              operarioNome: nomeCompleto.trim(),
            }),
        },
      ]);
    } catch (err) {
      console.error("Erro ao cadastrar operário:", err);
      const backendMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.cpf?.[0] ||
        err?.response?.data?.email?.[0] ||
        err?.response?.data?.senha_inicial?.[0];
      Alert.alert("Erro", backendMessage || "Não foi possível salvar o cadastro no momento. Deseja tentar novamente?");
    } finally {
      setSaving(false);
    }
  };

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
            value={nomeCompleto}
            onChangeText={setNomeCompleto}
          />
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
            <TextInput style={styles.input} placeholder="Nome da empresa" placeholderTextColor={COLORS.placeholder} value={empresaTerceirizada} onChangeText={setEmpresaTerceirizada} />
          </View>
        )}

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
          <Text style={styles.fieldLabel}>E-mail (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="email@exemplo.com"
            placeholderTextColor={COLORS.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Endereço (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Rua, Número, Bairro, Cidade"
            placeholderTextColor={COLORS.placeholder}
            value={endereco}
            onChangeText={setEndereco}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: SPACING.sm }]}>
            <Text style={styles.fieldLabel}>Cargo / Função</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => {
                Alert.alert(
                  "Selecionar Cargo",
                  "",
                  CARGOS.map((c) => ({ text: c, onPress: () => setCargo(c) }))
                );
              }}
            >
              <Text style={styles.selectPlaceholder}>{cargo}</Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Admissão (opcional)</Text>
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

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Senha inicial</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={COLORS.placeholder}
            value={senhaInicial}
            onChangeText={setSenhaInicial}
            secureTextEntry
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.infoBoxText}>
            Depois de salvar, você vai capturar o rosto do operário para cadastrar a biometria facial dele.
          </Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
          ) : (
            <Text style={styles.saveBtnText}>Salvar e continuar</Text>
          )}
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
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(46,134,193,0.08)",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoBoxText: { flex: 1, marginLeft: SPACING.sm, fontSize: 12, color: COLORS.textMuted },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 15 },
});
