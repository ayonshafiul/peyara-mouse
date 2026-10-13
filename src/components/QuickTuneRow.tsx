import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React from 'react';
import colors from '../constants/colors';

export interface TuneValues {
  touch: number;
  scroll: number;
  rate: number;
}

interface QuickTuneRowProps {
  values: TuneValues;
  onChange: (values: TuneValues) => void;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

function Stepper({
  label,
  display,
  onDecrease,
  onIncrease,
}: {
  label: string;
  display: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.group}>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={onDecrease}
        hitSlop={8}
        accessibilityLabel={`Decrease ${label}`}>
        <Text style={styles.stepBtnText}>-</Text>
      </TouchableOpacity>
      <Text style={styles.label} numberOfLines={1}>
        {label} {display}
      </Text>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={onIncrease}
        hitSlop={8}
        accessibilityLabel={`Increase ${label}`}>
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function QuickTuneRow({values, onChange}: QuickTuneRowProps) {
  const tune = (key: keyof TuneValues, delta: number, min: number, max: number) => {
    const next = Math.min(max, Math.max(min, round2(values[key] + delta)));
    if (next !== values[key]) {
      onChange({...values, [key]: next});
    }
  };

  return (
    <View style={styles.row}>
      <Stepper
        label="Touch"
        display={values.touch.toFixed(2)}
        onDecrease={() => tune('touch', -0.05, 0.05, 5)}
        onIncrease={() => tune('touch', 0.05, 0.05, 5)}
      />
      <Stepper
        label="Scroll"
        display={values.scroll.toFixed(2)}
        onDecrease={() => tune('scroll', -0.05, 0.05, 2)}
        onIncrease={() => tune('scroll', 0.05, 0.05, 2)}
      />
      <Stepper
        label="Rate"
        display={`${values.rate}ms`}
        onDecrease={() => tune('rate', -4, 4, 120)}
        onIncrease={() => tune('rate', 4, 4, 120)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 8,
    gap: 8,
  },
  group: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.TOUCHPAD,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    color: colors.WHITE,
    fontSize: 10,
    fontFamily: 'Raleway-Regular',
  },
  stepBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    color: colors.WHITE,
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
});
