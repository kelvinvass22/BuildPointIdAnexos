import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { COLORS, RADIUS, SPACING, SHADOW } from "../../theme/theme";
import { workerService } from "../../services/workerService";

const STATUS_ICON = {
  ok: { name: "checkmark-circle", color: COLORS.success },
  warning: { name: "alert-circle", color: COLORS.warning },
  alert: { name: "person-remove", color: COLORS.danger },
};

const STATUS_RANK = { alert: 2, warning: 1, ok: 0 };

const TIPO_ABREV = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  INTERVALO_INICIO: "Saída almoço",
  INTERVALO_FIM: "Volta almoço",
};

// Antes cada marcação virava um card próprio no histórico -- batia ponto
// 4x num dia (entrada/saída-almoço/volta-almoço/saída) e apareciam 4
// cards iguais só com um horário preenchido cada. Agrupa por dia (mesmo
// `dateLabel`) num card só, mesclando os 4 horários e guardando cada
// marcação individual (`punches`) só pra saber de qual delas dá pra
// baixar o recibo.
function agruparPorDia(entries) {
  const porDia = new Map();

  for (const entry of entries) {
    if (!porDia.has(entry.dateLabel)) {
      porDia.set(entry.dateLabel, {
        dateLabel: entry.dateLabel,
        entrada: "--:--",
        saida: "--:--",
        almocoSaida: "--:--",
        almocoVolta: "--:--",
        status: entry.status,
        statusLabel: entry.statusLabel,
        punches: [],
      });
    }

    const dia = porDia.get(entry.dateLabel);
    if (entry.entrada !== "--:--") dia.entrada = entry.entrada;
    if (entry.saida !== "--:--") dia.saida = entry.saida;
    if (entry.almocoSaida !== "--:--") dia.almocoSaida = entry.almocoSaida;
    if (entry.almocoVolta !== "--:--") dia.almocoVolta = entry.almocoVolta;

    // O ícone/status do card do dia reflete o pior status entre as
    // marcações daquele dia (ex.: 3 sincronizadas + 1 pendente -> mostra
    // "pendente", não esconde atrás das outras 3 que já foram).
    if ((STATUS_RANK[entry.status] ?? 0) > (STATUS_RANK[dia.status] ?? 0)) {
      dia.status = entry.status;
      dia.statusLabel = entry.statusLabel;
    }

    dia.punches.push({ id: entry.id, tipo: entry.tipo, podeBaixarRecibo: entry.podeBaixarRecibo });
  }

  return Array.from(porDia.values());
}

function DayCard({ day, onOpenRecibo, baixandoId }) {
  const icon = STATUS_ICON[day.status] || STATUS_ICON.ok;
  const comprovantes = day.punches.filter((p) => p.podeBaixarRecibo);

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{day.dateLabel}</Text>
        <Ionicons name={icon.name} size={18} color={icon.color} />
      </View>
      {day.statusLabel && <Text style={styles.statusLabel}>{day.statusLabel}</Text>}
      <View style={styles.entryRow}>
        <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
        <Text style={styles.entryLabel}>Entrada: </Text>
        <Text style={styles.entryValue}>{day.entrada}</Text>
        <View style={{ width: SPACING.md }} />
        <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
        <Text style={styles.entryLabel}>Saída: </Text>
        <Text style={styles.entryValue}>{day.saida}</Text>
      </View>
      <View style={styles.entryRow}>
        <View style={[styles.dot, { backgroundColor: COLORS.warning }]} />
        <Text style={styles.entryLabel}>Saída para almoço: </Text>
        <Text style={styles.entryValue}>{day.almocoSaida}</Text>
      </View>
      <View style={styles.entryRow}>
        <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
        <Text style={styles.entryLabel}>Volta: </Text>
        <Text style={styles.entryValue}>{day.almocoVolta}</Text>
      </View>

      {comprovantes.length > 0 && (
        <View style={styles.receiptsWrap}>
          <Text style={styles.receiptsLabel}>Comprovantes:</Text>
          <View style={styles.receiptsRow}>
            {comprovantes.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.receiptChip}
                onPress={() => onOpenRecibo(p.id)}
                disabled={baixandoId === p.id}
              >
                {baixandoId === p.id ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons name="document-text-outline" size={14} color={COLORS.primary} />
                )}
                <Text style={styles.receiptChipText}>{TIPO_ABREV[p.tipo] || p.tipo}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function WorkerHistoryScreen({ navigation }) {
  const [historyMonth, setHistoryMonth] = useState(null);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [baixandoId, setBaixandoId] = useState(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workerService.getHistory();
      setHistoryMonth(data?.month || null);
      setHistoryEntries(data?.entries || []);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const historyDays = useMemo(() => agruparPorDia(historyEntries), [historyEntries]);

  const handleOpenRecibo = async (marcacaoId) => {
    if (baixandoId) return;
    try {
      setBaixandoId(marcacaoId);
      const uri = await workerService.baixarRecibo(marcacaoId);
      const podeCompartilhar = await Sharing.isAvailableAsync();
      if (podeCompartilhar) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Recibo de ponto", UTI: "com.adobe.pdf" });
      } else {
        Alert.alert("Recibo baixado", "O recibo foi salvo no aparelho, mas não foi possível abri-lo automaticamente por aqui.");
      }
    } catch (err) {
      console.error("Erro ao baixar recibo:", err);
      Alert.alert("Erro", err?.message || "Não foi possível baixar o recibo. Tente novamente.");
    } finally {
      setBaixandoId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Histórico</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: SPACING.md, color: COLORS.textMuted }}>Carregando histórico...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: SPACING.lg }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: SPACING.md }}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadHistory}>
            <Text style={styles.retryBtnText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {historyMonth && (
            <View style={styles.summaryCard}>
              <Text style={styles.monthLabel}>{historyMonth.label}</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Dias trabalhados</Text>
                  <Text style={styles.summaryValue}>{historyDays.length}</Text>
                </View>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Horas extras</Text>
                  <Text style={styles.summaryValue}>{historyMonth.extraHours}</Text>
                </View>
              </View>
            </View>
          )}

          <FlatList
            data={historyDays}
            keyExtractor={(item) => item.dateLabel}
            contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg }}
            renderItem={({ item }) => <DayCard day={item} onOpenRecibo={handleOpenRecibo} baixandoId={baixandoId} />}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", color: COLORS.textMuted, marginTop: SPACING.lg }}>
                Nenhum registro encontrado.
              </Text>
            }
          />
        </>
      )}

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
  statusLabel: { fontSize: 11, color: COLORS.warning, marginTop: 4, fontWeight: "600" },
  receiptsWrap: { marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  receiptsLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 6 },
  receiptsRow: { flexDirection: "row", flexWrap: "wrap" },
  receiptChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  receiptChipText: { fontSize: 11, color: COLORS.primary, fontWeight: "600", marginLeft: 4 },
  bottomBar: { flexDirection: "row", backgroundColor: COLORS.primary, paddingVertical: SPACING.sm },
  bottomBarItem: { flex: 1, alignItems: "center" },
  bottomBarLabel: { color: COLORS.textOnPrimary, fontSize: 11, marginTop: 2, fontWeight: "600" },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.sm },
  retryBtnText: { color: COLORS.textOnPrimary, fontSize: 13, fontWeight: "700" },
});
