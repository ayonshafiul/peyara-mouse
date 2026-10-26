import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import React from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {type AnimatedRef} from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import colors from '../constants/colors';
import ColumnsStepper from './ColumnsStepper';
import DeckSelectionBar from './DeckSelectionBar';
import DeckSelectionGrid from './DeckSelectionGrid';
import type {DeckAction} from '../types/deck';

interface LandscapeDeckViewProps {
  headerLabel: string;
  headerSub: string | null;
  loading: boolean;
  emptyText: string;
  actions: DeckAction[];
  renderItem: ({item}: {item: DeckAction}) => React.JSX.Element;
  keyExtractor: (item: DeckAction) => string;
  scrollableRef: AnimatedRef<Animated.ScrollView>;
  onOrderChange: (params: {indexToKey: Array<string>}) => void;
  onDragEnd: (params: {data: Array<DeckAction>}) => void;
  onSelectApp: () => void;
  onRefresh: () => void;
  onPortrait: () => void;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  isFiltering: boolean;
  isManual: boolean;
  columns: number;
  onDecreaseColumns: () => void;
  onIncreaseColumns: () => void;
  selecting: boolean;
  selectionActions: DeckAction[];
  selectionVisibleIds: string[];
  selectionTotal: number;
  onToggleSelectAll: () => void;
  onSaveSelection: () => void;
  onCancelSelection: () => void;
  onImport: () => void;
  canImport: boolean;
  hasSlug: boolean;
  showTopControls: boolean;
  onToggleTopControls: () => void;
}

export default function LandscapeDeckView({
  headerLabel,
  headerSub,
  loading,
  emptyText,
  actions,
  renderItem,
  keyExtractor,
  scrollableRef,
  onOrderChange,
  onDragEnd,
  onSelectApp,
  onRefresh,
  onPortrait,
  onClose,
  query,
  onQueryChange,
  isFiltering,
  isManual,
  columns,
  onDecreaseColumns,
  onIncreaseColumns,
  selecting,
  selectionActions,
  selectionVisibleIds,
  selectionTotal,
  onToggleSelectAll,
  onSaveSelection,
  onCancelSelection,
  onImport,
  canImport,
  hasSlug,
  showTopControls,
  onToggleTopControls,
}: LandscapeDeckViewProps) {
  const insets = useSafeAreaInsets();

  const showSearch =
    !loading &&
    (selecting ? selectionTotal > 0 : actions.length > 0 || isFiltering);

  return (
    <View
      style={[
        styles.landscapeRoot,
        {
          paddingTop: Math.max(insets.top, 8),
          paddingLeft: Math.max(insets.left, 8),
          paddingRight: Math.max(insets.right, 8),
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}>
      {showTopControls ? (
        <>
          <View style={styles.header}>
            <View style={styles.topRow}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={onToggleTopControls}
                activeOpacity={0.8}
                accessibilityLabel="Hide deck controls">
                <MaterialIcons
                  name="settings"
                  size={20}
                  color={colors.WHITE}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={onClose}
                activeOpacity={0.8}
                accessibilityLabel="Close deck">
                <MaterialIcons name="close" size={20} color={colors.WHITE} />
              </TouchableOpacity>
          <View style={styles.topRowSpacer} />
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onSelectApp}
            activeOpacity={0.8}
            accessibilityLabel="Select app deck">
            <MaterialIcons name="apps" size={20} color={colors.WHITE} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            activeOpacity={0.8}
            accessibilityLabel="Refresh deck">
            <MaterialIcons name="refresh" size={20} color={colors.PRIM_BG} />
          </TouchableOpacity>
          <ColumnsStepper
            value={columns}
            onDecrease={onDecreaseColumns}
            onIncrease={onIncreaseColumns}
          />
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onPortrait}
            activeOpacity={0.8}
            accessibilityLabel="Back to portrait">
            <MaterialIcons
              name="stay-primary-portrait"
              size={20}
              color={colors.WHITE}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              style={[styles.importBtn, !canImport && styles.importBtnDisabled]}
              onPress={onImport}
              disabled={!canImport}
              activeOpacity={0.8}
              accessibilityLabel="Import actions"
              accessibilityState={{disabled: !canImport}}>
              <Text style={styles.importBtnText}>Import actions</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerLabel}
            </Text>
            {isManual && (
              <View style={styles.manualChip}>
                <Text style={styles.manualChipText}>Manual selection</Text>
              </View>
            )}
            {showSearch && (
              <View style={styles.searchInline}>
                <MaterialIcons
                  name="search"
                  size={18}
                  color="rgba(255,255,255,0.5)"
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search actions…"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={query}
                  onChangeText={onQueryChange}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  accessibilityLabel="Search deck actions"
                />
                {!!query && (
                  <TouchableOpacity
                    onPress={() => onQueryChange('')}
                    hitSlop={8}
                    accessibilityLabel="Clear deck search">
                    <MaterialIcons
                      name="close"
                      size={16}
                      color={colors.WHITE}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          {!isManual && !!headerSub && (
            <Text style={styles.headerSub} numberOfLines={1}>
              {headerSub}
            </Text>
          )}
        </View>
      </View>
        </>
      ) : (
        <View style={styles.hiddenBar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onToggleTopControls}
            activeOpacity={0.8}
            accessibilityLabel="Show deck controls">
            <MaterialIcons
              name="settings"
              size={20}
              color={colors.WHITE}
            />
          </TouchableOpacity>
        </View>
      )}
      {selecting && (
        <DeckSelectionBar
          total={selectionTotal}
          visibleIds={selectionVisibleIds}
          onToggleAll={onToggleSelectAll}
          onSave={onSaveSelection}
          onCancel={onCancelSelection}
        />
      )}

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.text}>Loading actions…</Text>
        </View>
      ) : selecting ? (
        selectionActions.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.text, styles.helperText]}>{emptyText}</Text>
          </View>
        ) : (
          <Animated.ScrollView
            ref={scrollableRef}
            bounces={false}
            contentContainerStyle={styles.gridContent}>
            <DeckSelectionGrid
              actions={selectionActions}
              columns={columns}
            />
          </Animated.ScrollView>
        )
      ) : actions.length === 0 && !isFiltering ? (
        <View style={styles.center}>
          <Text style={[styles.text, styles.helperText]}>{emptyText}</Text>
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
      ) : actions.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.text, styles.helperText]}>{emptyText}</Text>
        </View>
      ) : (
        <Animated.ScrollView
          ref={scrollableRef}
          bounces={false}
          contentContainerStyle={styles.gridContent}>
          <Sortable.Grid
            columns={columns}
            columnGap={10}
            rowGap={10}
            data={actions}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            scrollableRef={scrollableRef}
            onOrderChange={onOrderChange}
            onDragEnd={onDragEnd}
          />
        </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  landscapeRoot: {
    flex: 1,
    width: '100%',
  },
  header: {
    gap: 8,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topRowSpacer: {
    flex: 1,
  },
  hiddenBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    paddingTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  importBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.PRIM_ACCENT,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtnText: {
    color: colors.PRIM_ACCENT,
    fontSize: 11,
    fontFamily: 'Raleway-Bold',
  },
  importBtnDisabled: {
    opacity: 0.4,
  },
  headerTitle: {
    flex: 1,
    color: colors.WHITE,
    fontSize: 13,
    fontFamily: 'Raleway-Bold',
  },
  manualChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  manualChipText: {
    color: colors.PRIM_ACCENT,
    fontSize: 11,
    fontFamily: 'Raleway-Bold',
  },
  headerSub: {
    color: colors.WHITE,
    opacity: 0.7,
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Raleway-Regular',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.PRIM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.TOUCHPAD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.TOUCHPAD,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 34,
  },
  searchInput: {
    flex: 1,
    color: colors.WHITE,
    fontSize: 13,
    fontFamily: 'Raleway-Regular',
    paddingVertical: 0,
  },
  gridContent: {
    paddingTop: 4,
    paddingBottom: 16,
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
