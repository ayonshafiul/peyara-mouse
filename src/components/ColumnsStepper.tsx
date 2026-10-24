import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import colors from '../constants/colors';

export const MIN_DECK_COLUMNS = 2;
export const MAX_DECK_COLUMNS = 5;

interface ColumnsStepperProps {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

export default function ColumnsStepper({
  value,
  onDecrease,
  onIncrease,
}: ColumnsStepperProps) {
  const atMin = value <= MIN_DECK_COLUMNS;
  const atMax = value >= MAX_DECK_COLUMNS;
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={onDecrease}
        disabled={atMin}
        activeOpacity={0.8}
        accessibilityLabel="Fewer columns per row"
        accessibilityState={{disabled: atMin}}>
        <MaterialIcons
          name="remove"
          size={18}
          color={colors.WHITE}
          style={atMin && styles.disabled}
        />
      </TouchableOpacity>
      <Text style={styles.count} accessibilityLabel={`${value} per row`}>
        {value}
      </Text>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={onIncrease}
        disabled={atMax}
        activeOpacity={0.8}
        accessibilityLabel="More columns per row"
        accessibilityState={{disabled: atMax}}>
        <MaterialIcons
          name="add"
          size={18}
          color={colors.WHITE}
          style={atMax && styles.disabled}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.TOUCHPAD,
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 2,
  },
  stepBtn: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    minWidth: 18,
    textAlign: 'center',
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: 'Raleway-Bold',
  },
  disabled: {
    opacity: 0.3,
  },
});
