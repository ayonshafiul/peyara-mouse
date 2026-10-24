import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React, {useMemo} from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import colors from '../constants/colors';
import type {DeckAction} from '../types/deck';

interface DeckSelectionGridProps {
  actions: DeckAction[];
  columns: number;
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export default function DeckSelectionGrid({
  actions,
  columns,
  selectedIds,
  onToggle,
}: DeckSelectionGridProps) {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const width = `${100 / columns}%` as `${number}%`;

  return (
    <View style={styles.grid}>
      {actions.map(item => {
        const isSelected = selected.has(item.id);
        return (
          <View key={item.id} style={[styles.cell, {width}]}>
            <TouchableOpacity
              style={[styles.tile, isSelected && styles.tileSelected]}
              onPress={() => onToggle(item.id)}
              activeOpacity={0.8}
              accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${item.label}`}
              accessibilityState={{selected: isSelected}}>
              {!!item.icon && (
                <Text style={styles.tileIcon}>{item.icon}</Text>
              )}
              <Text style={styles.tileLabel} numberOfLines={2}>
                {item.label}
              </Text>
              {!!item.modifiers?.length && (
                <Text style={styles.tileMeta} numberOfLines={1}>
                  {[...item.modifiers, item.key].join('+')}
                </Text>
              )}
              {isSelected && (
                <View style={styles.check}>
                  <MaterialIcons
                    name="check"
                    size={16}
                    color={colors.PRIM_BG}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

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
