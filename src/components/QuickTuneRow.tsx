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

/** Step size and bounds per tune value, shared with the Settings screen. */
export const TUNE_LIMITS: Record<
  keyof TuneValues,
  {step: number; min: number; max: number}
> = {
  touch: {step: 0.05, min: 0.05, max: 5},
  scroll: {step: 0.05, min: 0.05, max: 2},
  rate: {step: 4, min: 4, max: 120},
};

const round2 = (v: number) => Math.round(v * 100) / 100;

/** One step of `key` up (+1) or down (-1), clamped to its bounds. */
export function stepTune(
  key: keyof TuneValues,
  value: number,
  direction: 1 | -1,
): number {
  const {step, min, max} = TUNE_LIMITS[key];
  return Math.min(max, Math.max(min, round2(value + direction * step)));
}

export function Stepper({
  label,
  display,
  onDecrease,
  onIncrease,
  hideLabel = false,
}: {
  label: string;
  display: string;
  onDecrease: () => void;
  onIncrease: () => void;
  /** Show only the value; `label` still names the buttons for a11y. */
  hideLabel?: boolean;
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
        {hideLabel ? display : `${label} ${display}`}
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
  const tune = (key: keyof TuneValues, direction: 1 | -1) => {
    const next = stepTune(key, values[key], direction);
    if (next !== values[key]) {
      onChange({...values, [key]: next});
    }
  };

  return (
    <View style={styles.row}>
      <Stepper
        label="Touch"
        display={values.touch.toFixed(2)}
        onDecrease={() => tune('touch', -1)}
        onIncrease={() => tune('touch', 1)}
      />
      <Stepper
        label="Scroll"
        display={values.scroll.toFixed(2)}
        onDecrease={() => tune('scroll', -1)}
        onIncrease={() => tune('scroll', 1)}
      />
      <Stepper
        label="Rate"
        display={`${values.rate}ms`}
        onDecrease={() => tune('rate', -1)}
        onIncrease={() => tune('rate', 1)}
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
