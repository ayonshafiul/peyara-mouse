import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import colors from '../constants/colors';

export type DeckLogDirection = 'TX' | 'RX' | 'INFO';

export interface DeckDebugEntry {
  id: number;
  time: string;
  dir: DeckLogDirection;
  label: string;
  detail: string;
}

interface DeckDebugModalProps {
  visible: boolean;
  logs: DeckDebugEntry[];
  summary: string;
  onClear: () => void;
  onClose: () => void;
}

function badgeColor(dir: DeckLogDirection): string {
  switch (dir) {
    case 'TX':
      return colors.PRIM_ACCENT;
    case 'RX':
      return colors.PRIM_FRONT;
    default:
      return '#9E9E9E';
  }
}

export default function DeckDebugModal({
  visible,
  logs,
  summary,
  onClear,
  onClose,
}: DeckDebugModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close deck debug log"
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Deck Debug ({logs.length})</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={onClear}
                hitSlop={8}
                accessibilityLabel="Clear deck debug log">
                <MaterialIcons
                  name="delete-outline"
                  size={22}
                  color={colors.WHITE}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel="Close deck debug log">
                <MaterialIcons
                  name="close"
                  size={24}
                  color={colors.WHITE}
                />
              </TouchableOpacity>
            </View>
          </View>
          {!!summary && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText} selectable>
                {summary}
              </Text>
            </View>
          )}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}>
            {logs.length === 0 ? (
              <Text style={styles.empty}>
                No frames yet. Focus this tab to send get-active-app.
              </Text>
            ) : (
              // Newest first so the latest get-active response is on top.
              [...logs].reverse().map(entry => (
                <View key={entry.id} style={styles.entry}>
                  <View style={styles.entryTop}>
                    <Text
                      style={[
                        styles.badge,
                        {color: badgeColor(entry.dir)},
                      ]}>
                      {entry.dir}
                    </Text>
                    <Text style={styles.time}>{entry.time}</Text>
                    <Text style={styles.label} numberOfLines={1}>
                      {entry.label}
                    </Text>
                  </View>
                  {!!entry.detail && (
                    <Text style={styles.detail} selectable>
                      {entry.detail}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
          <Text style={styles.hint}>
            RX = every WS frame received · TX = every WS frame sent
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    width: '100%',
    maxHeight: '85%',
    minHeight: '50%',
    backgroundColor: colors.PRIM_BG,
    borderRadius: 16,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    color: colors.WHITE,
    fontSize: 16,
    fontFamily: 'Raleway-Bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.TOUCHPAD,
  },
  summaryText: {
    color: colors.WHITE,
    opacity: 0.85,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'monospace',
  },
  scroll: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 8,
    gap: 8,
  },
  empty: {
    color: colors.WHITE,
    opacity: 0.7,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
    fontFamily: 'Raleway-Regular',
  },
  entry: {
    backgroundColor: colors.TOUCHPAD,
    borderRadius: 8,
    padding: 8,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    fontSize: 12,
    fontFamily: 'Raleway-Bold',
    minWidth: 34,
  },
  time: {
    color: colors.WHITE,
    opacity: 0.5,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  label: {
    flex: 1,
    color: colors.WHITE,
    fontSize: 12,
    fontFamily: 'Raleway-Bold',
  },
  detail: {
    color: colors.WHITE,
    opacity: 0.85,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'monospace',
  },
  hint: {
    color: colors.WHITE,
    opacity: 0.5,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    fontFamily: 'Raleway-Regular',
  },
});
