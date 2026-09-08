import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AuthStack from "./src/navigation/AuthStack";
import WorkerStack from "./src/navigation/WorkerStack";
import ManagerStack from "./src/navigation/ManagerStack";
import OwnerStack from "./src/navigation/OwnerStack";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { navigationRef } from "./src/navigation/navigationRef";
import { STORAGE_KEYS } from "./src/services/api";
import { ROLE_TO_STACK } from "./src/services/authService";
import { COLORS } from "./src/theme/theme";

const RootStack = createNativeStackNavigator();

export default function App() {
  // Login em cache: antes disto, o app SEMPRE abria na tela de Login,
  // mesmo já havendo um access/refresh token válido salvo (authService.login
  // já persistia os dois em AsyncStorage desde antes -- só faltava alguém
  // ler isso na inicialização). Enquanto decide, mostra um loading em vez
  // de "piscar" a tela de Login antes de trocar de rota.
  const [initialRouteName, setInitialRouteName] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [access, refresh, papel] = await AsyncStorage.multiGet([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.PAPEL,
        ]).then((pairs) => pairs.map(([, value]) => value));

        const stack = papel && ROLE_TO_STACK[papel];
        // Não valida o access token aqui (ex.: chamando /api/usuarios/me/) --
        // se ele já tiver expirado, o interceptor de resposta da api (ver
        // services/api.ts) já sabe renovar via refresh token automaticamente
        // na primeira chamada real, ou mandar de volta pro Login
        // (navigationRef.resetToAuth) se nem o refresh servir mais.
        if (access && refresh && stack) {
          setInitialRouteName(stack);
        } else {
          setInitialRouteName("Auth");
        }
      } catch (err) {
        console.warn("Não foi possível verificar a sessão salva:", err?.message || err);
        setInitialRouteName("Auth");
      }
    })();
  }, []);

  if (!initialRouteName) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer ref={navigationRef}>
          <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
            <RootStack.Screen name="Auth" component={AuthStack} />
            <RootStack.Screen name="WorkerStack" component={WorkerStack} />
            <RootStack.Screen name="ManagerStack" component={ManagerStack} />
            <RootStack.Screen name="OwnerStack" component={OwnerStack} />
          </RootStack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
