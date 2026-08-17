import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ManagerTabs from "./ManagerTabs";
import RadiusConfigScreen from "../screens/manager/RadiusConfigScreen";
import RegisterWorkerScreen from "../screens/manager/RegisterWorkerScreen";
import ManagerCameraScreen from "../screens/manager/ManagerCameraScreen";

const Stack = createNativeStackNavigator();

export default function ManagerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ManagerTabs" component={ManagerTabs} />
      <Stack.Screen name="RadiusConfig" component={RadiusConfigScreen} />
      <Stack.Screen name="RegisterWorker" component={RegisterWorkerScreen} />
      <Stack.Screen name="ManagerCamera" component={ManagerCameraScreen} />
    </Stack.Navigator>
  );
}
