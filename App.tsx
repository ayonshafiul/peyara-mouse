import React, {useEffect, useState} from 'react';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {KeyboardProvider} from 'react-native-keyboard-controller';
import RootNavigator from './src/navigation/RootNavigator';
import type {RootStackParamList} from './src/navigation/RootNavigator';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {initializeDefaultSettings} from './src/utils/settings';
import {ActivityIndicator} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';
import colors from './src/constants/colors';

initializeDefaultSettings();

const NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.PRIM_ACCENT,
    background: colors.PRIM_BG,
    card: colors.PRIM_BG,
    text: colors.WHITE,
    border: colors.TOUCHPAD,
  },
};

export default function App() {
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList | ''>('');

  useEffect(() => {
    setInitialRoute('Tabs');
    BootSplash.hide({fade: true});
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <KeyboardProvider>
        <SafeAreaProvider>
        <NavigationContainer theme={NavigationTheme}>
          <BottomSheetModalProvider>
            {!initialRoute && (
              <ActivityIndicator size={'large'} color={colors.PRIM_ACCENT} />
            )}
            {initialRoute !== '' && (
              <RootNavigator initialRoute={initialRoute} />
            )}
          </BottomSheetModalProvider>
        </NavigationContainer>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
