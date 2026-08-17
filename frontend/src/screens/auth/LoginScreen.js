import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING } from "../../theme/theme";
import authService from "../../services/authService";

const ROLE_ROUTES = {
  owner: "OwnerStack",
  manager: "ManagerStack",
  worker: "WorkerStack",
};

export default function LoginScreen({ navigation, route }) {
  const role = route?.params?.role || "worker";
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    console.log("Botão apertado! CPF:", cpf);

    // 1) Validação: CPF e password precisam estar preenchidos antes de
    // qualquer chamada à API.
    if (!cpf.trim() || !password.trim()) {
      Alert.alert("Erro", "Preencha o CPF e a Senha para entrar.");
      return;
    }

    setIsLoading(true);
    try {
      // 2) A navegação só acontece se este await resolver (sucesso 200/201).
      // Se a API retornar erro, authService.login lança uma exceção
      // e o código pula direto para o catch, sem navegar.
      await authService.login(cpf, password);

      navigation.reset({
        index: 0,
        routes: [{ name: ROLE_ROUTES[role] }],
      });
    } catch (error) {
      // 3) Mantém o usuário na tela de login e mostra o erro.
      console.error(error);
      Alert.alert("Erro de Login", "CPF ou senha inválidos, ou erro no servidor.");
    } finally {
      // 4) isLoading sempre é desligado, independente do resultado.
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={22} color={COLORS.textOnPrimary} />
      </TouchableOpacity>

      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <MaterialCommunityIcons name="hard-hat" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.appName}>BuildPoint ID</Text>
        <Text style={styles.appTagline}>Controle de acesso inteligente</Text>

        <Text style={styles.formLabel}>Faça seu login</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>CPF / CNPJ</Text>
          <TextInput
            style={styles.input}
            placeholder="000.000.000-00 / 00.000.000/0000-0"
            placeholderTextColor={COLORS.placeholder}
            value={cpf}
            onChangeText={setCpf}
            keyboardType="numeric"
            editable={!isLoading}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite sua senha"
            placeholderTextColor={COLORS.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
        </View>

        <TouchableOpacity
          style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.textOnPrimary} size="small" />
          ) : (
            <Text style={styles.loginBtnText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primary },
  backBtn: {
    marginTop: Platform.OS === "android" ? SPACING.lg : SPACING.sm,
    marginLeft: SPACING.md,
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  container: { flex: 1, alignItems: "center", paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  appName: { color: COLORS.textOnPrimary, fontSize: 22, fontWeight: "700" },
  appTagline: { color: COLORS.textOnPrimaryMuted, fontSize: 12, marginTop: 2, marginBottom: SPACING.xl },
  formLabel: { color: COLORS.textOnPrimary, fontSize: 14, fontWeight: "600", marginBottom: SPACING.md },
  field: { width: "100%", marginBottom: SPACING.md },
  fieldLabel: { color: COLORS.textOnPrimary, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    color: COLORS.textOnPrimary,
    fontSize: 14,
  },
  loginBtn: {
    width: "100%",
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: { color: COLORS.textOnPrimary, fontWeight: "700", fontSize: 15 },
});