import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { COLORS, RADIUS, SPACING } from "../../theme/theme";

export default function RadiusConfigScreen({ navigation }) {
  const [radius, setRadius] = useState(127);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raio do Ponto</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.mapCard}>
        <View style={styles.mapCircleOuter}>
          <View style={styles.mapCircleInner}>
            <View style={styles.mapDot} />
          </View>
        </View>
      </View>

      <View style={styles.sliderSection}>
        <Text style={styles.sliderTitle}>Deferir tamanho do raio</Text>
        <Text style={styles.sliderLabel}>Distância do raio</Text>
        <Text style={styles.sliderValue}>{Math.round(radius)} m</Text>
        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={10}
          maximumValue={300}
          value={radius}
          onValueChange={setRadius}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
        <View style={styles.sliderRange}>
          <Text style={styles.sliderRangeText}>10 m</Text>
          <Text style={styles.sliderRangeText}>300 m</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.saveBtnText}>Salvar Raio</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: SPACING.sm },
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textDark },
  mapCard: {
    backgroundColor: "#E7ECEF",
    borderRadius: RADIUS.lg,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  mapCircleOuter: {
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: "rgba(46,134,193,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapCircleInner: {
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: "rgba(46,134,193,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.primaryDark },
  sliderSection: { marginBottom: SPACING.lg },
  sliderTitle: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", marginBottom: SPACING.md },
  sliderLabel: { fontSize: 12, color: COLORS.textMuted },
  sliderValue: { fontSize: 20, fontWeight: "700", color: COLORS.textDark, marginBottom: SPACING.xs },
  sliderRange: { flexDirection: "row", justifyContent: "space-between" },
  sliderRangeText: { fontSize: 11, color: COLORS.textMuted },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 15 },
});
