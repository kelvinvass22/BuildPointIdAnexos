import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ManagerDashboardScreen from "../screens/manager/ManagerDashboardScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { COLORS, RADIUS } from "../theme/theme";

const Tab = createBottomTabNavigator();

function CenterIcon({ focused }) {
  return (
    <View style={[styles.centerBtn, focused && styles.centerBtnActive]}>
      <Ionicons name="home" size={22} color={COLORS.textOnPrimary} />
    </View>
  );
}

export default function ManagerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.textOnPrimary,
        tabBarInactiveTintColor: COLORS.textOnPrimaryMuted,
      }}
    >
      <Tab.Screen
        name="Obras"
        component={ManagerDashboardScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="office-building-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={ManagerDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <CenterIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Config"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.primary,
    borderTopWidth: 0,
    height: 64,
    paddingBottom: 10,
    paddingTop: 8,
  },
  centerBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  centerBtnActive: {
    backgroundColor: COLORS.primaryDark,
  },
});
