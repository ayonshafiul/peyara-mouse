import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React, {memo} from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import colors from '../constants/colors';
import type {DeckAction} from '../types/deck';
import {useDeckSelectionStore} from '../store/useDeckSelectionStore';

interface DeckSelectionGridProps {
  actions: DeckAction[];
  columns: number;
}

const SelectionCell = memo(function SelectionCellInner({
  item,
  width,
}: {
  item: DeckAction;
  width: `${number}%`;
}) {
  const isSelected = useDeckSelectionStore(s => s.selected[item.id] === true);
  const toggle = useDeckSelectionStore(s => s.toggle);

  return (
    <View style={[styles.cell, {width}]}>
      <TouchableOpacity
        style={[styles.tile, isSelected && styles.tileSelected]}
        onPress={() => toggle(item.id)}
        activeOpacity={0.8}
        accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${item.label}`}
        accessibilityState={{selected: isSelected}}>
        {!!item.icon && <Text style={styles.tileIcon}>{item.icon}</Text>}
        <Text style={styles.tileLabel} numberOfLines={2}>
          {item.label}
        </Text>
        {!!item.key && (
          <Text style={styles.tileMeta} numberOfLines={1}>
            {[...(item.modifiers ?? []), item.key].join('+')}
          </Text>
        )}
        {isSelected && (
          <View style={styles.check}>
            <MaterialIcons name="check" size={16} color={colors.PRIM_BG} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

function DeckSelectionGrid({actions, columns}: DeckSelectionGridProps) {
  const width = `${100 / columns}%` as `${number}%`;

  return (
    <View style={styles.grid}>
      {actions.map(item => (
        <SelectionCell key={item.id} item={item} width={width} />
      ))}
    </View>
  );
}

export default memo(DeckSelectionGrid);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    padding: 5,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.TOUCHPAD,
    borderRadius: 12,
    height: 104,
    padding: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tileSelected: {
    borderColor: colors.PRIM_ACCENT,
  },
  tileIcon: {
    fontSize: 22,
  },
  tileLabel: {
    color: colors.WHITE,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'Raleway-Bold',
  },
  tileMeta: {
    color: colors.PRIM_ACCENT,
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'Raleway-Regular',
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.PRIM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
