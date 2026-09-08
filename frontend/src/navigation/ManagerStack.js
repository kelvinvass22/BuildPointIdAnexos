import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ManagerTabs from "./ManagerTabs";
import RadiusConfigScreen from "../screens/manager/RadiusConfigScreen";
import RegisterWorkerScreen from "../screens/manager/RegisterWorkerScreen";
import ManagerCameraScreen from "../screens/manager/ManagerCameraScreen";
import EnrollBiometryScreen from "../screens/manager/EnrollBiometryScreen";
import TeamsScreen from "../screens/manager/TeamsScreen";
import EditWorkerScreen from "../screens/manager/EditWorkerScreen";

const Stack = createNativeStackNavigator();

export default function ManagerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ManagerTabs" component={ManagerTabs} />
      <Stack.Screen name="RadiusConfig" component={RadiusConfigScreen} />
      <Stack.Screen name="RegisterWorker" component={RegisterWorkerScreen} />
      <Stack.Screen name="ManagerCamera" component={ManagerCameraScreen} />
      <Stack.Screen name="EnrollBiometry" component={EnrollBiometryScreen} />
      <Stack.Screen name="Teams" component={TeamsScreen} />
      <Stack.Screen name="EditWorker" component={EditWorkerScreen} />
    </Stack.Navigator>
  );
}
