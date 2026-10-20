import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import colors from '../constants/colors';
import type {AppAliasEntry, AppsJson} from '../types/deck';

interface DeckAppPickerModalProps {
  visible: boolean;
  apps: AppsJson | null;
  selectedSlug: string;
  manualSlug: string | null;
  onSelect: (slug: string) => void;
  onSelectAuto: () => void;
  onClose: () => void;
}

type PickerItem =
  | {kind: 'auto'; key: string}
  | {kind: 'app'; key: string; entry: AppAliasEntry};

export default function DeckAppPickerModal({
  visible,
  apps,
  selectedSlug,
  manualSlug,
  onSelect,
  onSelectAuto,
  onClose,
}: DeckAppPickerModalProps) {
  const [query, setQuery] = useState('');

  const items = useMemo<PickerItem[]>(() => {
    const list = apps?.apps ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          e =>
            e.label.toLowerCase().includes(q) ||
            e.slug.toLowerCase().includes(q) ||
            (e.match ?? []).some(m => m.toLowerCase().includes(q)),
        )
      : list;
    return [
      {kind: 'auto', key: '__auto__'},
      ...filtered.map(e => ({
        kind: 'app' as const,
        key: e.slug,
        entry: e,
      })),
    ];
  }, [apps, query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Select app</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={8}
            accessibilityLabel="Close app picker">
            <MaterialIcons name="close" size={24} color={colors.WHITE} />
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search apps…"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={item => item.key}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.empty}>
              {apps ? 'No apps match.' : 'Apps list not loaded yet.'}
            </Text>
          }
          renderItem={({item}) => {
            if (item.kind === 'auto') {
              const isActive = manualSlug === null;
              return (
                <TouchableOpacity
                  style={[styles.row, isActive && styles.rowActive]}
                  onPress={onSelectAuto}
                  activeOpacity={0.7}
                  accessibilityLabel="Use auto detected app">
                  <MaterialIcons
                    name="autorenew"
                    size={20}
                    color={isActive ? colors.PRIM_ACCENT : colors.WHITE}
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>Auto (focused app)</Text>
                    <Text style={styles.rowSub}>
                      {selectedSlug
                        ? `current: ${selectedSlug}`
                        : 'follow the desktop focus'}
                    </Text>
                  </View>
                  {isActive && (
                    <MaterialIcons
                      name="check"
                      size={20}
                      color={colors.PRIM_ACCENT}
                    />
                  )}
                </TouchableOpacity>
              );
            }
            const isActive =
              manualSlug === item.entry.slug ||
              (manualSlug === null && selectedSlug === item.entry.slug);
            return (
              <TouchableOpacity
                style={[styles.row, isActive && styles.rowActive]}
                onPress={() => onSelect(item.entry.slug)}
                activeOpacity={0.7}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{item.entry.label}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {item.entry.slug}
                  </Text>
                </View>
                {manualSlug === item.entry.slug && (
                  <MaterialIcons
                    name="check"
                    size={20}
                    color={colors.PRIM_ACCENT}
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.PRIM_BG,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    color: colors.WHITE,
    fontSize: 16,
    fontFamily: 'Raleway-Bold',
  },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.TOUCHPAD,
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: 'Raleway-Regular',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.TOUCHPAD,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  rowActive: {
    borderWidth: 1,
    borderColor: colors.PRIM_ACCENT,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: 'Raleway-Bold',
  },
  rowSub: {
    color: colors.WHITE,
    opacity: 0.6,
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Raleway-Regular',
  },
  empty: {
    color: colors.WHITE,
    opacity: 0.6,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
    fontFamily: 'Raleway-Regular',
  },
});
