import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {NavigatorScreenParams} from '@react-navigation/native';
import OnboardingScreen from '../screens/OnboardingScreen';
import QRCodeScreen from '../screens/QRCodeScreen';
import PairingCodeScreen from '../screens/PairingCodeScreen';
import TabsNavigator, {type TabParamList} from './TabNavigator';

export type RootStackParamList = {
  Onboarding: undefined;
  QRCode: undefined;
  PairingCode: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator({
  initialRoute,
}: {
  initialRoute: keyof RootStackParamList;
}) {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="QRCode" component={QRCodeScreen} />
      <Stack.Screen name="PairingCode" component={PairingCodeScreen} />
      <Stack.Screen name="Tabs" component={TabsNavigator} />
    </Stack.Navigator>
  );
}
