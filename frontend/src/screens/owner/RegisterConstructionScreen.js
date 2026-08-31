import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING } from "../../theme/theme";
import { ownerService } from "../../services/ownerService";
import { geoService } from "../../services/geoService";

export default function RegisterConstructionScreen({ navigation }) {
  const [nomeObra, setNomeObra] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numeroArt, setNumeroArt] = useState("");
  const [raioMetros, setRaioMetros] = useState("50");
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [locating, setLocating] = useState(false);

  const [especialidade, setEspecialidade] = useState("");
  const [gerenteNome, setGerenteNome] = useState("");
  const [gerenteCpf, setGerenteCpf] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [senhaInicial, setSenhaInicial] = useState("");

  const [saving, setSaving] = useState(false);

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);
      const position = await geoService.getCurrentPosition();
      setCoords({ latitude: position.latitude, longitude: position.longitude });
    } catch (err) {
      Alert.alert("Erro de localização", err?.message || "Não foi possível obter sua localização.");
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!nomeObra.trim() || !endereco.trim()) {
      Alert.alert("Erro", "Por favor, preencha o Nome e o Endereço da obra.");
      return;
    }
    if (!coords) {
      Alert.alert("Localização necessária", "Toque em \"Usar minha localização atual\" para marcar o centro da obra.");
      return;
    }
    if (!especialidade.trim() || !gerenteNome.trim() || !gerenteCpf.trim() || !email.trim()) {
      Alert.alert("Erro", "Preencha Especialidade, Nome, CPF e E-mail do gerente.");
      return;
    }

    try {
      setSaving(true);

      const obra = await ownerService.createObra({
        nome: nomeObra.trim(),
        endereco: endereco.trim(),
        numeroArt: numeroArt.trim(),
        latitude_centro: coords.latitude,
        longitude_centro: coords.longitude,
        raio_metros: Number(raioMetros) || 50,
        status: "ATIVA",
      });

      await ownerService.vincularGerenteNovo(obra.id, {
        especialidade: especialidade.trim(),
        nomeCompleto: gerenteNome.trim(),
        cpf: gerenteCpf.trim(),
        email: email.trim(),
        telefone: whatsapp.trim() || undefined,
        senhaInicial: senhaInicial.trim() || undefined,
      });

      Alert.alert("Sucesso", "Obra criada e gerente vinculado com sucesso!");
      navigation.goBack();
    } catch (err) {
      console.error("Erro ao cadastrar obra:", err);
      const backendMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.cpf?.[0] ||
        err?.response?.data?.email?.[0] ||
        err?.response?.data?.nome?.[0];
      Alert.alert("Erro", backendMessage || "Não foi possível salvar a obra no momento.");
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
          <Text style={styles.fieldLabel}>Número da ART/RRT (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Não é preciso CNPJ para cadastrar"
            placeholderTextColor={COLORS.placeholder}
            value={numeroArt}
            onChangeText={setNumeroArt}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Raio do ponto (metros)</Text>
          <TextInput
            style={styles.input}
            placeholder="50"
            placeholderTextColor={COLORS.placeholder}
            value={raioMetros}
            onChangeText={setRaioMetros}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity style={styles.locationBtn} onPress={handleUseCurrentLocation} disabled={locating}>
          {locating ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <Ionicons name="locate-outline" size={18} color={COLORS.primary} />
              <Text style={styles.locationBtnText}>
                {coords ? "Localização marcada — toque para atualizar" : "Usar minha localização atual"}
              </Text>
            </>
          )}
        </TouchableOpacity>
        {coords && (
          <Text style={styles.coordsText}>
            Lat {coords.latitude.toFixed(6)}, Long {coords.longitude.toFixed(6)}
          </Text>
        )}

        <Text style={styles.sectionLabel}>DADOS DO GERENTE</Text>

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
            placeholder="Nome do gerente responsável"
            placeholderTextColor={COLORS.placeholder}
            value={gerenteNome}
            onChangeText={setGerenteNome}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>CPF</Text>
          <TextInput
            style={styles.input}
            placeholder="000.000.000-00"
            placeholderTextColor={COLORS.placeholder}
            value={gerenteCpf}
            onChangeText={setGerenteCpf}
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
            value={whatsapp}
            onChangeText={setWhatsapp}
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

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
          ) : (
            <Text style={styles.saveBtnText}>Salvar e Ativar a Obra</Text>
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
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xs,
  },
  locationBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: "600", marginLeft: SPACING.sm },
  coordsText: { fontSize: 11, color: COLORS.textMuted, textAlign: "center", marginBottom: SPACING.md },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: SPACING.md,
  },
  saveBtnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 15 },
});
