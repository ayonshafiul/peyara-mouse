import {StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import React, {useEffect, useState} from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from '../navigation/SettingsNavigator';
import colors from '../constants/colors';
import {
  getBooleanValueFor,
  getValueFor,
  setBooleanValueFor,
  setValueFor,
} from '../utils/storage';
import {
  SETTINGS_TOUCHPAD_SCROLL_SENSITIVITY,
  SETTINGS_TOUCHPAD_SENSITIVITY,
  SETTINGS_TOUCHPAD_RESPONSE_RATE,
  settingsData,
  DEFAULT_TOUCHPAD_SENSITIVITY,
  DEFAULT_TOUCHPAD_SCROLL_SENSITIVITY,
  DEFAULT_TOUCHPAD_RESPONSE_RATE,
} from '../constants/settings';
import Background from '../components/Background';
import Orientation from 'react-native-orientation-locker';
import {
  Stepper,
  stepTune,
  type TuneValues,
} from '../components/QuickTuneRow';

function SwitchCard({item}: {item: {label: string; key: string}}) {
  const [isOn, setIsOn] = useState(false);

  useEffect(() => {
    const res = getBooleanValueFor(item?.key);
    setIsOn(res ?? false);
  }, [item?.key]);

  const handleChange = (value: boolean) => {
    setIsOn(value);
    setBooleanValueFor(item?.key, value);
  };

  return (
    <View style={styles.switchCardContainer}>
      <Text style={styles.switchCardText}>{item?.label}</Text>
      <Switch
        value={isOn}
        onValueChange={handleChange}
        trackColor={{true: colors.PRIM_ACCENT, false: '#555'}}
        thumbColor={colors.WHITE}
      />
    </View>
  );
}

// Same steps and bounds as the touchpad's quick-tune row.
const tuneEntries: Array<{
  key: keyof TuneValues;
  label: string;
  storageKey: string;
  format: (v: number) => string;
}> = [
  {
    key: 'touch',
    label: 'Touchpad sensitivity',
    storageKey: SETTINGS_TOUCHPAD_SENSITIVITY,
    format: v => v.toFixed(2),
  },
  {
    key: 'scroll',
    label: 'Scroll sensitivity',
    storageKey: SETTINGS_TOUCHPAD_SCROLL_SENSITIVITY,
    format: v => v.toFixed(2),
  },
  {
    key: 'rate',
    label: 'Touchpad response rate',
    storageKey: SETTINGS_TOUCHPAD_RESPONSE_RATE,
    format: v => `${v}ms`,
  },
];

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

export default function SettingsScreen({navigation}: Props) {
  const [tune, setTune] = useState<TuneValues>({
    touch: DEFAULT_TOUCHPAD_SENSITIVITY,
    scroll: DEFAULT_TOUCHPAD_SCROLL_SENSITIVITY,
    rate: DEFAULT_TOUCHPAD_RESPONSE_RATE,
  });

  useEffect(() => {
    Orientation.lockToPortrait();
    const ts = getValueFor(SETTINGS_TOUCHPAD_SENSITIVITY);
    const ss = getValueFor(SETTINGS_TOUCHPAD_SCROLL_SENSITIVITY);
    const rr = getValueFor(SETTINGS_TOUCHPAD_RESPONSE_RATE);
    setTune(prev => ({
      touch: ts ? Number(ts) : prev.touch,
      scroll: ss ? Number(ss) : prev.scroll,
      rate: rr ? Number(rr) : prev.rate,
    }));
  }, []);

  const step = (
    entry: (typeof tuneEntries)[number],
    direction: 1 | -1,
  ) => {
    const next = stepTune(entry.key, tune[entry.key], direction);
    if (next === tune[entry.key]) {
      return;
    }
    setTune(prev => ({...prev, [entry.key]: next}));
    setValueFor(entry.storageKey, String(next));
  };

  return (
    <Background>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.settingsHeader}>Settings</Text>
        {tuneEntries.map(entry => (
          <View key={entry.key} style={styles.switchCardContainer}>
            <Text style={styles.switchCardText}>{entry.label}</Text>
            <View style={styles.stepper}>
              <Stepper
                label={entry.label}
                display={entry.format(tune[entry.key])}
                hideLabel
                onDecrease={() => step(entry, -1)}
                onIncrease={() => step(entry, 1)}
              />
            </View>
          </View>
        ))}
        {settingsData.map(item => (
          <SwitchCard key={item.key} item={item} />
        ))}
        <TouchableOpacity
          style={styles.switchCardContainer}
          onPress={() => navigation.navigate('SettingsHelp')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Help">
          <Text style={styles.switchCardText}>Help</Text>
          <MaterialIcons name="chevron-right" size={24} color={colors.WHITE} />
        </TouchableOpacity>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
  },
  switchCardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  switchCardText: {
    color: colors.WHITE,
    fontFamily: 'Raleway-Regular',
  },
  settingsHeader: {
    color: colors.WHITE,
    fontSize: 18,
    marginVertical: 24,
    fontFamily: 'Raleway-Bold',
  },
  stepper: {
    width: 140,
    flexDirection: 'row',
  },
});
