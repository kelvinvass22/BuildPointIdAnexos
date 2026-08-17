import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WorkerHomeScreen from "../screens/worker/WorkerHomeScreen";
import WorkerHistoryScreen from "../screens/worker/WorkerHistoryScreen";
import WorkerCameraScreen from "../screens/worker/WorkerCameraScreen";

const Stack = createNativeStackNavigator();

export default function WorkerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkerHome" component={WorkerHomeScreen} />
      <Stack.Screen name="WorkerHistory" component={WorkerHistoryScreen} />
      <Stack.Screen name="WorkerCamera" component={WorkerCameraScreen} />
    </Stack.Navigator>
  );
}
