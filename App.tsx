import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';

import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import OTPScreen from './src/screens/auth/OTPScreen';
import ClientHomeScreen from './src/screens/client/ClientHomeScreen';
import RidesScreen from './src/screens/client/RidesScreen';
import AccountScreen from './src/screens/client/AccountScreen';
import EditProfileScreen from './src/screens/client/EditProfileScreen';
import SavedPlacesScreen from './src/screens/client/SavedPlacesScreen';
import HelpScreen from './src/screens/client/HelpScreen';
import LegalScreen from './src/screens/client/LegalScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AccountStack = createNativeStackNavigator();

const AccountNavigator = () => (
  <AccountStack.Navigator screenOptions={{ headerShown: false }}>
    <AccountStack.Screen name="AccountMain" component={AccountScreen} />
    <AccountStack.Screen name="EditProfile" component={EditProfileScreen} />
    <AccountStack.Screen name="SavedPlaces" component={SavedPlacesScreen} />
    <AccountStack.Screen name="Help" component={HelpScreen} />
    <AccountStack.Screen name="Legal" component={LegalScreen} />
  </AccountStack.Navigator>
);

const ClientTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#bbb',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'car-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'Rides') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={ClientHomeScreen} />
      <Tab.Screen name="Rides" component={RidesScreen} />
      <Tab.Screen name="Account" component={AccountNavigator} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="OTP" component={OTPScreen} />
        </>
      ) : (
        <Stack.Screen name="ClientTabs" component={ClientTabs} />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
