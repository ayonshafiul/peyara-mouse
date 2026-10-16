import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import TouchpadScreen from '../screens/TouchpadScreen';
import HelpScreen from '../screens/HelpScreen';

export type TouchpadStackParamList = {
  TouchpadScreen: {serverUrl?: string; fingerprint?: string; pair?: string};
  TouchpadHelp: undefined;
};

const Stack = createNativeStackNavigator<TouchpadStackParamList>();

export default function TouchpadNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={'TouchpadScreen'}
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="TouchpadScreen" component={TouchpadScreen} />
      <Stack.Screen name="TouchpadHelp" component={HelpScreen} />
    </Stack.Navigator>
  );
}
