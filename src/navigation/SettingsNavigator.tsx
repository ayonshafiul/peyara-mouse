import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';

export type SettingsStackParamList = {
  SettingsHome: undefined;
  SettingsHelp: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="SettingsHome"
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="SettingsHome" component={SettingsScreen} />
      <Stack.Screen name="SettingsHelp" component={HelpScreen} />
    </Stack.Navigator>
  );
}
