import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React, {memo} from 'react';
import colors from '../constants/colors';
import {useDeckSelectionStore} from '../store/useDeckSelectionStore';

interface DeckSelectionBarProps {
  total: number;
  visibleIds: string[];
  onToggleAll: () => void;
  onCancel: () => void;
}

// Shown while editing the deck. Saving happens through the toolbar's
// Done button; Cancel leaves edit mode without saving.
function DeckSelectionBar({
  total,
  visibleIds,
  onToggleAll,
  onCancel,
}: DeckSelectionBarProps) {
  const selected = useDeckSelectionStore(
    s => Object.keys(s.selected).length,
  );
  const allSelected = useDeckSelectionStore(
    s =>
      visibleIds.length > 0 && visibleIds.every(id => s.selected[id] === true),
  );

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
    </View>
  );
}

export default memo(DeckSelectionBar);

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
});
