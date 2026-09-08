import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING, SHADOW } from "../../theme/theme";
import managerService from "../../services/managerService";

export default function TeamsScreen({ navigation, route }) {
  const obraId = route?.params?.obraId;
  const [teams, setTeams] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [teamData, workerData] = await Promise.all([managerService.listarEquipes(), managerService.listOperarios()]);
      setTeams(teamData);
      setWorkers(workerData.results || []);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar as equipes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleWorker = (id) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const createTeam = async () => {
    if (!name.trim() || !obraId) {
      Alert.alert("Dados incompletos", "Informe o nome da equipe e selecione uma obra.");
      return;
    }
    try {
      setSaving(true);
      await managerService.criarEquipe({ obraId, nome: name.trim(), membros: selected });
      setName("");
      setSelected([]);
      await load();
      Alert.alert("Equipe criada", "A equipe foi registrada com sucesso.");
    } catch (error) {
      Alert.alert("Erro", error?.response?.data?.detail || "Não foi possível criar a equipe.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={22} color={COLORS.textDark} /></TouchableOpacity>
        <Text style={styles.title}>Equipes</Text>
        <View style={{ width: 22 }} />
      </View>
      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Nova equipe</Text>
            <TextInput style={styles.input} placeholder="Nome da equipe" placeholderTextColor={COLORS.placeholder} value={name} onChangeText={setName} />
            <Text style={styles.label}>Membros</Text>
            {workers.map((worker) => {
              const id = worker.usuario?.id;
              const checked = selected.includes(id);
              return (
                <TouchableOpacity key={id} style={styles.workerRow} onPress={() => toggleWorker(id)}>
                  <Ionicons name={checked ? "checkbox" : "square-outline"} size={21} color={checked ? COLORS.primary : COLORS.textMuted} />
                  <Text style={styles.workerName}>{worker.usuario?.nome_completo || "Operário"}</Text>
                  <Text style={styles.workerType}>{worker.tipo_vinculo === "TERCEIRIZADO" ? "Terceirizado" : worker.cargo}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.saveButton} onPress={createTeam} disabled={saving}>
              {saving ? <ActivityIndicator color={COLORS.textOnPrimary} /> : <Text style={styles.saveText}>Criar equipe</Text>}
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Equipes cadastradas</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.teamCard}>
            <View style={styles.icon}><Ionicons name="people-outline" size={20} color={COLORS.primary} /></View>
            <View style={{ flex: 1, marginLeft: SPACING.sm }}><Text style={styles.teamName}>{item.nome}</Text><Text style={styles.teamMeta}>{item.total_membros || 0} membro(s) · {item.gerente_nome || "Gerente"}</Text></View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Nenhuma equipe cadastrada.</Text> : <ActivityIndicator color={COLORS.primary} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.md },
  title: { fontSize: 16, fontWeight: "700", color: COLORS.textDark },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  form: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOW, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textDark, marginBottom: SPACING.sm },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.sm, color: COLORS.textDark, marginBottom: SPACING.md },
  label: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted, marginBottom: SPACING.xs },
  workerRow: { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  workerName: { flex: 1, marginLeft: SPACING.sm, color: COLORS.textDark, fontSize: 13 },
  workerType: { color: COLORS.textMuted, fontSize: 11 },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, alignItems: "center", padding: SPACING.sm, marginVertical: SPACING.md },
  saveText: { color: COLORS.textOnPrimary, fontWeight: "700" },
  teamCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW },
  icon: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: "#E7F1FA", alignItems: "center", justifyContent: "center" },
  teamName: { color: COLORS.textDark, fontWeight: "700" },
  teamMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
  empty: { color: COLORS.textMuted, textAlign: "center", marginTop: SPACING.md },
});
