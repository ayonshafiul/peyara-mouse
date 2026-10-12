import {Dimensions, StyleSheet, Switch, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import React, {useEffect, useState} from 'react';
import colors from '../constants/colors';
import {
  getBooleanValueFor,
  getValueFor,
  setBooleanValueFor,
  setValueFor,
} from '../utils/storage';
import Slider from '@react-native-community/slider';
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

const width = Dimensions.get('window').width;

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

export default function SettingsScreen() {
  const [touchSens, setTouchSens] = useState(DEFAULT_TOUCHPAD_SENSITIVITY);
  const [scrollSens, setScrollSens] = useState(
    DEFAULT_TOUCHPAD_SCROLL_SENSITIVITY,
  );
  const [responseRate, setResponseRate] = useState(
    DEFAULT_TOUCHPAD_RESPONSE_RATE,
  );

  useEffect(() => {
    Orientation.lockToPortrait();
    const ts = getValueFor(SETTINGS_TOUCHPAD_SENSITIVITY);
    const ss = getValueFor(SETTINGS_TOUCHPAD_SCROLL_SENSITIVITY);
    const rr = getValueFor(SETTINGS_TOUCHPAD_RESPONSE_RATE);
    if (ts) {
      setTouchSens(Number(ts));
    }
    if (ss) {
      setScrollSens(Number(ss));
    }
    if (rr) {
      setResponseRate(Number(rr));
    }
  }, []);

  return (
    <Background>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.settingsHeader}>Settings</Text>
        <Text style={styles.switchCardText}>
          Touchpad Sensitivity : {touchSens.toFixed(2)}
        </Text>
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0.05}
            maximumValue={5}
            step={0.05}
            value={touchSens}
            onValueChange={setTouchSens}
            maximumTrackTintColor={colors.PRIM_ACCENT}
            minimumTrackTintColor={colors.PRIM_ACCENT}
            thumbTintColor={colors.PRIM_ACCENT}
            onSlidingComplete={async value => {
              setValueFor(SETTINGS_TOUCHPAD_SENSITIVITY, String(value));
            }}
          />
        </View>
        <Text style={styles.switchCardText}>
          Scroll Sensitivity: {scrollSens.toFixed(2)}
        </Text>
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0.05}
            maximumValue={2}
            step={0.05}
            value={scrollSens}
            onValueChange={setScrollSens}
            maximumTrackTintColor={colors.PRIM_ACCENT}
            minimumTrackTintColor={colors.PRIM_ACCENT}
            thumbTintColor={colors.PRIM_ACCENT}
            onSlidingComplete={async value => {
              setValueFor(
                SETTINGS_TOUCHPAD_SCROLL_SENSITIVITY,
                String(value),
              );
            }}
          />
        </View>
        <Text style={styles.switchCardText}>
          Touchpad Response rate: {responseRate}ms
        </Text>
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={4}
            maximumValue={120}
            step={4}
            value={responseRate}
            onValueChange={setResponseRate}
            maximumTrackTintColor={colors.PRIM_ACCENT}
            minimumTrackTintColor={colors.PRIM_ACCENT}
            thumbTintColor={colors.PRIM_ACCENT}
            onSlidingComplete={async value => {
              setValueFor(SETTINGS_TOUCHPAD_RESPONSE_RATE, String(value));
            }}
          />
        </View>
        {settingsData.map(item => (
          <SwitchCard key={item.key} item={item} />
        ))}
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
  sliderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  slider: {width: width - 32, height: 40},
});
