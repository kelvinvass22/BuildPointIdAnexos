import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { COLORS, RADIUS, SPACING } from "../theme/theme";

/**
 * ErrorBoundary — sem isso, QUALQUER erro do React não tratado em
 * qualquer tela do app (não só na captura facial) virava uma TELA BRANCA
 * sem nenhuma informação, em builds de preview/produção (sem o red box de
 * desenvolvimento). Isso tornava praticamente impossível diagnosticar
 * problemas relatados por quem está testando fora do ambiente de dev.
 *
 * Mostra a mensagem e a stack do erro na tela (útil enquanto o app ainda
 * está em fase de testes internos -- antes de ir pra operários de verdade,
 * vale trocar por algo mais discreto/sem stack técnico) e um botão
 * "Tentar novamente" que reseta a árvore de componentes filha.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Erro não tratado capturado pelo ErrorBoundary:", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Algo deu errado</Text>
            <Text style={styles.subtitle}>
              Ocorreu um erro inesperado. Tire um print desta tela e envie pro time -- isso ajuda muito a
              encontrar a causa.
            </Text>
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{String(this.state.error?.message || this.state.error)}</Text>
              {!!this.state.error?.stack && (
                <Text style={styles.stackText}>{this.state.error.stack}</Text>
              )}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.btn} onPress={this.handleReset}>
            <Text style={styles.btnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.textDark, marginBottom: SPACING.sm },
  subtitle: { fontSize: 14, color: COLORS.textMuted, lineHeight: 21, marginBottom: SPACING.md },
  errorBox: {
    backgroundColor: "#FDECEC",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  errorText: { color: COLORS.danger || "#C0392B", fontSize: 13, fontWeight: "700", marginBottom: SPACING.sm },
  stackText: { color: "#8a3b3b", fontSize: 10, fontFamily: "monospace" },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  btnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 15 },
});
