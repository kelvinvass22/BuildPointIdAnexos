import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileSelectScreen from "../screens/auth/ProfileSelectScreen";
import LoginScreen from "../screens/auth/LoginScreen";

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileSelect" component={ProfileSelectScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
