import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import TouchpadScreen from '../screens/TouchpadScreen';

export type TouchpadStackParamList = {
  TouchpadScreen: {serverUrl?: string; fingerprint?: string; pair?: string};
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
    </Stack.Navigator>
  );
}
