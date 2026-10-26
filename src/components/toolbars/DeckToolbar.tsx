import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import React from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import colors from '../../constants/colors';
import ColumnsStepper from '../ColumnsStepper';
import DeckSelectionBar from '../DeckSelectionBar';

interface DeckToolbarProps {
  headerLabel: string;
  headerSub: string | null;
  isManual: boolean;
  loading: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  showSearch: boolean;
  columns: number;
  onDecreaseColumns: () => void;
  onIncreaseColumns: () => void;
  selecting: boolean;
  selectionTotal: number;
  selectionVisibleIds: string[];
  onToggleSelectAll: () => void;
  onSaveSelection: () => void;
  onCancelSelection: () => void;
  onImport: () => void;
  canImport: boolean;
  onSelectApp: () => void;
  onRefresh: () => void;
  autoSync: boolean;
  onToggleAutoSync: () => void;
}

export default function DeckToolbar({
  headerLabel,
  headerSub,
  isManual,
  loading,
  query,
  onQueryChange,
  showSearch,
  columns,
  onDecreaseColumns,
  onIncreaseColumns,
  selecting,
  selectionTotal,
  selectionVisibleIds,
  onToggleSelectAll,
  onSaveSelection,
  onCancelSelection,
  onImport,
  canImport,
  onSelectApp,
  onRefresh,
  autoSync,
  onToggleAutoSync,
}: DeckToolbarProps) {
  return (
    <View style={styles.toolbar}>
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onSelectApp}
          activeOpacity={0.8}
          accessibilityLabel="Select app deck">
          <MaterialIcons name="apps" size={20} color={colors.WHITE} />
        </TouchableOpacity>
        <ColumnsStepper
          value={columns}
          onDecrease={onDecreaseColumns}
          onIncrease={onIncreaseColumns}
        />
        <View style={styles.topRowSpacer} />
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          activeOpacity={0.8}
          accessibilityLabel="Refresh deck">
          <MaterialIcons name="refresh" size={16} color={colors.PRIM_BG} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.autoSyncBtn, autoSync && styles.autoSyncBtnOn]}
          onPress={onToggleAutoSync}
          activeOpacity={0.8}
          accessibilityLabel="Toggle deck auto sync"
          accessibilityRole="switch"
          accessibilityState={{checked: autoSync}}>
          <Text
            style={[
              styles.autoSyncBtnText,
              autoSync && styles.autoSyncBtnTextOn,
            ]}>
            {autoSync ? 'Auto sync window on' : 'Auto sync window off'}
          </Text>
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
      {selecting && !loading && (
        <DeckSelectionBar
          total={selectionTotal}
          visibleIds={selectionVisibleIds}
          onToggleAll={onToggleSelectAll}
          onSave={onSaveSelection}
          onCancel={onCancelSelection}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topRowSpacer: {
    flex: 1,
  },
  autoSyncBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.TOUCHPAD,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoSyncBtnText: {
    color: colors.WHITE,
    opacity: 0.7,
    fontSize: 11,
    fontFamily: 'Raleway-Bold',
  },
  autoSyncBtnOn: {
    borderColor: colors.PRIM_ACCENT,
    backgroundColor: colors.PRIM_ACCENT,
  },
  autoSyncBtnTextOn: {
    color: colors.PRIM_BG,
    opacity: 1,
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
  headerSub: {
    color: colors.WHITE,
    opacity: 0.7,
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Raleway-Regular',
  },
  refreshBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
});
