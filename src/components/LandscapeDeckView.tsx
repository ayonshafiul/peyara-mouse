import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React, {useCallback} from 'react';
import Animated from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import colors from '../constants/colors';
import DeckSelectionGrid from './DeckSelectionGrid';
import type {DeckAction} from '../types/deck';

interface LandscapeDeckViewProps {
  loading: boolean;
  selecting: boolean;
  displayActions: DeckAction[];
  displayEmptyText: string;
  columns: number;
  onOrderChange: (params: {indexToKey: Array<string>}) => void;
  onDragEnd: (params: {data: Array<DeckAction>}) => void;
  onFireAction: (action: DeckAction) => void;
  hasSlug: boolean;
  headerLabel: string;
  canImport: boolean;
  onImport: () => void;
  onSelectApp: () => void;
  scrollableRef: any;
}

export default function LandscapeDeckView({
  loading,
  selecting,
  displayActions,
  displayEmptyText,
  columns,
  onOrderChange,
  onDragEnd,
  onFireAction,
  hasSlug,
  headerLabel,
  canImport,
  onImport,
  onSelectApp,
  scrollableRef,
}: LandscapeDeckViewProps) {
  const renderItem = useCallback(
    ({item}: {item: DeckAction}) => (
      <Sortable.Touchable onTap={() => onFireAction(item)}>
        <View style={styles.tile}>
          {!!item.icon && <Text style={styles.tileIcon}>{item.icon}</Text>}
          <Text style={styles.tileLabel} numberOfLines={2}>
            {item.label}
          </Text>
          {!!item.key && (
            <Text style={styles.tileMeta} numberOfLines={1}>
              {[...(item.modifiers ?? []), item.key].join('+')}
            </Text>
          )}
        </View>
      </Sortable.Touchable>
    ),
    [onFireAction],
  );

  const keyExtractor = useCallback((item: DeckAction) => item.id, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Loading actions…</Text>
      </View>
    );
  }

  if (selecting) {
    if (displayActions.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={[styles.text, styles.helperText]}>
            {displayEmptyText}
          </Text>
        </View>
      );
    }
    return (
      <Animated.ScrollView
        ref={scrollableRef}
        bounces={false}
        contentContainerStyle={styles.gridContent}>
        <DeckSelectionGrid actions={displayActions} columns={columns} />
      </Animated.ScrollView>
    );
  }

  if (displayActions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={[styles.text, styles.helperText]}>{displayEmptyText}</Text>
        {hasSlug && (
          <View style={styles.selectedAppCard}>
            <Text style={styles.selectedAppCaption}>Selected app</Text>
            <Text style={styles.selectedAppName} numberOfLines={1}>
              {headerLabel}
            </Text>
          </View>
        )}
        {canImport && (
          <TouchableOpacity
            style={styles.pickCta}
            onPress={onImport}
            activeOpacity={0.8}
            accessibilityLabel="Import actions">
            <Text style={styles.pickCtaText}>Import actions</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.pickCta, styles.secondaryCta]}
          onPress={onSelectApp}
          activeOpacity={0.8}
          accessibilityLabel={hasSlug ? 'Change app selection' : 'Select app'}>
          <Text style={[styles.pickCtaText, styles.secondaryCtaText]}>
            {hasSlug ? 'Change app selection' : 'Select app'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.ScrollView
      ref={scrollableRef}
      bounces={false}
      contentContainerStyle={styles.gridContent}>
      <Sortable.Grid
        columns={columns}
        columnGap={10}
        rowGap={10}
        data={displayActions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollableRef={scrollableRef}
        onOrderChange={onOrderChange}
        onDragEnd={onDragEnd}
      />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  gridContent: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.TOUCHPAD,
    borderRadius: 12,
    height: 104,
    padding: 8,
    gap: 4,
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    color: colors.WHITE,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Raleway-Regular',
  },
  helperText: {
    fontSize: 15,
    lineHeight: 22,
  },
  pickCta: {
    marginTop: 16,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.PRIM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickCtaText: {
    color: colors.PRIM_BG,
    fontSize: 14,
    fontFamily: 'Raleway-Bold',
  },
  secondaryCta: {
    marginTop: 12,
    backgroundColor: colors.TOUCHPAD,
  },
  secondaryCtaText: {
    color: colors.WHITE,
  },
  selectedAppCard: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: colors.PRIM_ACCENT,
    borderRadius: 12,
    alignItems: 'center',
    maxWidth: '100%',
  },
  selectedAppCaption: {
    color: colors.PRIM_ACCENT,
    fontSize: 10,
    fontFamily: 'Raleway-Regular',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  selectedAppName: {
    color: colors.WHITE,
    fontSize: 16,
    fontFamily: 'Raleway-Bold',
    marginTop: 2,
    textAlign: 'center',
  },
});
