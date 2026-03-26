// src/navigation/Tabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import AdvisoryScreen from '../screens/AdvisoryScreen';
import MarketScreen from '../screens/MarketScreen';
import CommunityScreen from '../screens/CommunityScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthScreen from '../screens/AuthScreen';

// Theme
import { colors } from '../theme/colors';

// -------------------------
// ✅ Define Tab Param Types
// -------------------------
export type RootTabParamList = {
  HomeScreen: undefined;
  AdvisoryScreen: undefined;
  MarketScreen: undefined;
  CommunityScreen: undefined;
  AnalyticsScreen: undefined;
  ProfileScreen: undefined;
  AuthScreen: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// -------------------------
// ✅ Tab Navigator Component
// -------------------------
export default function Tabs() {
  return (
    <Tab.Navigator
      initialRouteName="HomeScreen"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0.4,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 6,
        },
      }}
    >
      {/* 🏠 Home */}
      <Tab.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="home-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* 🌿 Advisory */}
      <Tab.Screen
        name="AdvisoryScreen"
        component={AdvisoryScreen}
        options={{
          tabBarLabel: 'Advisory',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="sprout-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* 🛒 Market */}
      <Tab.Screen
        name="MarketScreen"
        component={MarketScreen}
        options={{
          tabBarLabel: 'Market',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="storefront-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* 👥 Community */}
      <Tab.Screen
        name="CommunityScreen"
        component={CommunityScreen}
        options={{
          tabBarLabel: 'Community',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-group-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* 📊 Analytics */}
      <Tab.Screen
        name="AnalyticsScreen"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chart-line"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* 👤 Profile */}
      <Tab.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-circle-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* 🔒 Hidden Auth Route */}
      <Tab.Screen
        name="AuthScreen"
        component={AuthScreen}
        options={{
          tabBarButton: () => null, // hide from bar
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}
