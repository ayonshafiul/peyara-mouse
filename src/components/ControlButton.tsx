import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import React from 'react';
import colors from '../constants/colors';

interface ControlButtonProps {
  onPress?: (() => void) | null;
  text: string;
  containerStyle?: object;
  smallVariation?: boolean;
}

export default function ControlButton({
  onPress = null,
  text,
  containerStyle,
  smallVariation,
}: ControlButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress ?? undefined}
      style={[
        styles.button,
        containerStyle,
        smallVariation && styles.smallVariation,
      ]}>
      <Text style={styles.text}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.TOUCHPAD,
  },
  smallVariation: {
    paddingHorizontal: 4,
  },
  text: {
    fontSize: 18,
    fontFamily: 'Raleway-Regular',
    color: colors.WHITE,
  },
});
