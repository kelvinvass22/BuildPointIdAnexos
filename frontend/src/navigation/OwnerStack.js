import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OwnerTabs from "./OwnerTabs";
import RegisterConstructionScreen from "../screens/owner/RegisterConstructionScreen";

const Stack = createNativeStackNavigator();

export default function OwnerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
      <Stack.Screen name="RegisterConstruction" component={RegisterConstructionScreen} />
    </Stack.Navigator>
  );
}
