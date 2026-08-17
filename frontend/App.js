import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AuthStack from "./src/navigation/AuthStack";
import WorkerStack from "./src/navigation/WorkerStack";
import ManagerStack from "./src/navigation/ManagerStack";
import OwnerStack from "./src/navigation/OwnerStack";

const RootStack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Auth" component={AuthStack} />
          <RootStack.Screen name="WorkerStack" component={WorkerStack} />
          <RootStack.Screen name="ManagerStack" component={ManagerStack} />
          <RootStack.Screen name="OwnerStack" component={OwnerStack} />
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
