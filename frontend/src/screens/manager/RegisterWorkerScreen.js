import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING } from "../../theme/theme";
import { managerService } from "../../services/managerService";

export default function RegisterWorkerScreen({ navigation }) {
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cargo, setCargo] = useState("Pedreiro");
  const [admissao, setAdmissao] = useState("");
  const [faceId, setFaceId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Simula o escaneamento facial de cadastro
  const handleFaceScan = () => {
    // TODO: Integrar com câmera ou fluxo nativo de detecção facial do backend
    const simulatedFaceId = `face_${Date.now()}`;
    setFaceId(simulatedFaceId);
    Alert.alert("ID Facial Capturado", "Dados biométricos do rosto escaneados com sucesso.");
  };

  const handleSave = async () => {
    if (!nome.trim() || !endereco.trim()) {
      Alert.alert("Erro", "Por favor, preencha o Nome e o Endereço.");
      return;
    }

    try {
      setSaving(true);
      // TODO: Ajustar rota ou tipo com o backend se necessário, enviando dados e arquivos necessários
      await managerService.registerWorker({
        nome,
        endereco,
        cargo,
        admissao,
        faceId,
      });

      Alert.alert("Sucesso", "Operário cadastrado com sucesso!");
      navigation.goBack();
    } catch (err) {
      console.error("Erro ao cadastrar operário:", err);
      // TODO: Tratar erros e retornar mensagens amigáveis baseadas na resposta da API
      Alert.alert(
        "Erro",
        "Não foi possível salvar o cadastro no momento. Deseja tentar novamente?"
      );
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
            value={nome}
            onChangeText={setNome}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Endereço / CNPJ</Text>
          <TextInput
            style={styles.input}
            placeholder="00.000.000/0000-0 ou Endereço"
            placeholderTextColor={COLORS.placeholder}
            value={endereco}
            onChangeText={setEndereco}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: SPACING.sm }]}>
            <Text style={styles.fieldLabel}>Cargo / Função</Text>
            {/* TODO: Ajustar seletor dinâmico de cargos a partir do backend */}
            <TouchableOpacity 
              style={styles.selectInput} 
              onPress={() => {
                Alert.alert("Selecionar Cargo", "Funcionalidade de escolha de cargo mocado.", [
                  { text: "Pedreiro", onPress: () => setCargo("Pedreiro") },
                  { text: "Mestre de Obras", onPress: () => setCargo("Mestre de Obras") },
                  { text: "Servente", onPress: () => setCargo("Servente") }
                ]);
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
              placeholder="dd / mm / aaaa"
              placeholderTextColor={COLORS.placeholder}
              value={admissao}
              onChangeText={setAdmissao}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>ID Facial</Text>
        <TouchableOpacity 
          style={[
            styles.faceBox, 
            faceId ? { borderColor: COLORS.success, backgroundColor: "rgba(46,204,113,0.05)" } : null
          ]} 
          onPress={handleFaceScan}
        >
          <Ionicons 
            name={faceId ? "checkmark-circle-outline" : "scan-outline"} 
            size={32} 
            color={faceId ? COLORS.success : COLORS.primary} 
          />
          <Text style={[styles.faceBoxText, faceId ? { color: COLORS.success } : null]}>
            {faceId ? "ID Facial Cadastrado" : "Escanear Rosto para Cadastro"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
          ) : (
            <Text style={styles.saveBtnText}>Concluir</Text>
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
