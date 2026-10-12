import {StyleSheet, TouchableOpacity} from 'react-native';
import React from 'react';

interface RoundKeyProps {
  onPress?: (() => void) | null;
  children: React.ReactNode;
  containerStyle?: object;
}

export default function RoundKey({onPress = null, children, containerStyle}: RoundKeyProps) {
  return (
    <TouchableOpacity
      onPress={onPress ?? undefined}
      style={[styles.keysContainer, containerStyle]}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  keysContainer: {
    width: 45,
    height: 45,
    borderRadius: 20,
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});
