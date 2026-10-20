import {StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import React, {useEffect} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {type AnimatedRef} from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import colors from '../constants/colors';
import {useGlobalStore} from '../store/useGlobalStore';
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
  onDebug: () => void;
  onPortrait: () => void;
  keepAwake: boolean;
  onToggleKeepAwake: (value: boolean) => void;
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
  onDebug,
  onPortrait,
  keepAwake,
  onToggleKeepAwake,
}: LandscapeDeckViewProps) {
  const setShowBottomBar = useGlobalStore(state => state.setShowBottomBar);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setShowBottomBar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <View style={styles.awakeRow}>
        <MaterialIcons
          name="bedtime"
          size={14}
          color={colors.WHITE}
          style={styles.awakeIcon}
        />
        <Text style={styles.awakeText} numberOfLines={1}>
          {keepAwake
            ? 'Screen will not turn off while keep awake is on'
            : 'Keep screen awake'}
        </Text>
        <Switch
          value={keepAwake}
          onValueChange={onToggleKeepAwake}
          trackColor={{true: colors.PRIM_ACCENT, false: '#555'}}
          thumbColor={colors.WHITE}
          accessibilityLabel="Toggle keep awake"
        />
      </View>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerLabel}
          </Text>
          {!!headerSub && (
            <Text style={styles.headerSub} numberOfLines={1}>
              {headerSub}
            </Text>
          )}
        </View>
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
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onDebug}
          activeOpacity={0.8}
          accessibilityLabel="Open deck debug log">
          <MaterialIcons name="bug-report" size={20} color={colors.WHITE} />
        </TouchableOpacity>
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

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.text}>Loading actions…</Text>
        </View>
      ) : actions.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.text, styles.helperText]}>{emptyText}</Text>
          <TouchableOpacity
            style={styles.pickCta}
            onPress={onSelectApp}
            activeOpacity={0.8}>
            <Text style={styles.pickCtaText}>Select app</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.ScrollView
          ref={scrollableRef}
          bounces={false}
          contentContainerStyle={styles.gridContent}>
          <Sortable.Grid
            columns={5}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  awakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  awakeIcon: {
    opacity: 0.7,
  },
  awakeText: {
    flex: 1,
    color: colors.WHITE,
    opacity: 0.7,
    fontSize: 11,
    fontFamily: 'Raleway-Regular',
  },  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: colors.WHITE,
    fontSize: 16,
    fontFamily: 'Raleway-Bold',
  },
  headerSub: {
    color: colors.WHITE,
    opacity: 0.7,
    fontSize: 12,
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
});
