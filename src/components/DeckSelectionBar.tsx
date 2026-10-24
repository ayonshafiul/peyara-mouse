import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React from 'react';
import colors from '../constants/colors';

interface DeckSelectionBarProps {
  selected: number;
  total: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function DeckSelectionBar({
  selected,
  total,
  allSelected,
  onToggleAll,
  onSave,
  onCancel,
}: DeckSelectionBarProps) {
  const canSave = selected > 0;
  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={onToggleAll}
        activeOpacity={0.8}
        accessibilityLabel={allSelected ? 'Clear selection' : 'Select all'}>
        <Text style={styles.toggleText}>
          {allSelected ? 'Clear' : 'Select all'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.count}>
        {selected}/{total} selected
      </Text>
      <View style={styles.spacer} />
      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={onCancel}
        activeOpacity={0.8}
        accessibilityLabel="Cancel selection">
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.saveBtn, !canSave && styles.saveDisabled]}
        onPress={onSave}
        disabled={!canSave}
        activeOpacity={0.8}
        accessibilityLabel="Save selection">
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  toggleBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.TOUCHPAD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    color: colors.WHITE,
    fontSize: 13,
    fontFamily: 'Raleway-Bold',
  },
  count: {
    color: colors.WHITE,
    opacity: 0.7,
    fontSize: 12,
    fontFamily: 'Raleway-Regular',
  },
  spacer: {
    flex: 1,
  },
  cancelBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.TOUCHPAD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.WHITE,
    fontSize: 13,
    fontFamily: 'Raleway-Bold',
  },
  saveBtn: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: colors.PRIM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: {
    opacity: 0.4,
  },
  saveText: {
    color: colors.PRIM_BG,
    fontSize: 13,
    fontFamily: 'Raleway-Bold',
  },
});
