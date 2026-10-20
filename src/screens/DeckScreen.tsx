import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Animated, {useAnimatedRef} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useIsFocused} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Orientation from 'react-native-orientation-locker';
import Sortable from 'react-native-sortables';
import colors from '../constants/colors';
import Background from '../components/Background';
import MouseMove from '../components/MouseMove';
import {parseServerMessage} from '../utils/protocol';
import {plog} from '../utils/logger';
import {onPinnedMessage, sendPinnedMessage} from '../native/PeyaraSocket';
import type {ActiveAppInfo, AppsJson, DeckAction} from '../types/deck';
import {
  applyOrderMap,
  buildActionMessage,
  fetchAppsJson,
  fetchDeckActions,
  loadOrderMap,
  matchSlug,
  persistActionOrder,
} from '../utils/deck';

export default function DeckScreen() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [activeApp, setActiveApp] = useState<ActiveAppInfo | null>(null);
  const [appsJson, setAppsJson] = useState<AppsJson | null>(null);
  const [actions, setActions] = useState<DeckAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [deckMissing, setDeckMissing] = useState(false);

  const activeAppRef = useRef<ActiveAppInfo | null>(null);
  const appsJsonRef = useRef<AppsJson | null>(null);
  const actionsRef = useRef<DeckAction[]>([]);
  const slugRef = useRef<string>('');
  const loadingRef = useRef(false);

  actionsRef.current = actions;

  const loadDeckForApp = useCallback(
    async (app: ActiveAppInfo, apps: AppsJson | null) => {
      const slug = matchSlug(app.app, apps);
      slugRef.current = slug;
      if (!slug || slug === 'unknown') {
        setActions([]);
        setDeckMissing(true);
        return;
      }
      setLoading(true);
      loadingRef.current = true;
      try {
        const deck = await fetchDeckActions(slug, app.os);
        // Ignore stale responses after app switched mid-fetch.
        if (slugRef.current !== slug) {
          return;
        }
        if (!deck) {
          setActions([]);
          setDeckMissing(true);
          return;
        }
        setDeckMissing(false);
        const order = loadOrderMap(slug);
        setActions(applyOrderMap(deck, order));
      } finally {
        if (slugRef.current === slug) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    },
    [],
  );

  const handleActiveAppFrame = useCallback(
    async (msg: Record<string, unknown>, apps: AppsJson | null) => {
      const app =
        typeof msg.app === 'string' && msg.app ? msg.app : 'unknown';
      const info: ActiveAppInfo = {
        app,
        slug: typeof msg.slug === 'string' ? msg.slug : '',
        title: typeof msg.title === 'string' ? msg.title : '',
        process: typeof msg.process === 'string' ? msg.process : '',
        pid: typeof msg.pid === 'number' ? msg.pid : 0,
        os: typeof msg.os === 'string' ? msg.os : '',
      };
      activeAppRef.current = info;
      setActiveApp(info);
      plog(
        'Deck',
        `active-app app=${info.app} os=${info.os} title=${info.title}`,
      );
      await loadDeckForApp(info, apps ?? appsJsonRef.current);
    },
    [loadDeckForApp],
  );

  // Shared pinned connection: only listen here, never connect/disconnect.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const apps = await fetchAppsJson();
      if (cancelled) {
        return;
      }
      appsJsonRef.current = apps;
      setAppsJson(apps);
      // If an active-app frame arrived before apps.json loaded, resolve now.
      if (activeAppRef.current) {
        await loadDeckForApp(activeAppRef.current, apps);
      }
    })();
    const sub = onPinnedMessage(raw => {
      const msg = parseServerMessage(raw);
      if (msg?.type === 'active-app') {
        handleActiveAppFrame(
          msg as Record<string, unknown>,
          appsJsonRef.current,
        ).catch(() => {});
      }
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [handleActiveAppFrame, loadDeckForApp]);

  // Every time this tab gains focus, ask the server for the focused app.
  useEffect(() => {
    if (!isFocused) {
      return;
    }
    Orientation.lockToPortrait();
    plog('Deck', 'focused -> get-active-app');
    sendPinnedMessage({type: 'get-active-app'});
  }, [isFocused]);

  const requestRefresh = useCallback(() => {
    plog('Deck', 'manual refresh -> get-active-app');
    sendPinnedMessage({type: 'get-active-app'});
  }, []);

  const fireAction = useCallback((action: DeckAction) => {
    plog('Deck', `action ${action.id}`);
    sendPinnedMessage(buildActionMessage(action));
  }, []);

  const handleOrderChange = useCallback(
    (params: {indexToKey: Array<string>}) => {
      const slug = slugRef.current;
      if (!slug) {
        return;
      }
      const byId = new Map(actionsRef.current.map(a => [a.id, a]));
      const ordered: DeckAction[] = [];
      for (const key of params.indexToKey) {
        const action = byId.get(key);
        if (action) {
          ordered.push(action);
        }
      }
      // Persist id -> position only; full objects stay in the preset file.
      if (ordered.length === actionsRef.current.length) {
        persistActionOrder(slug, ordered);
      }
    },
    [],
  );

  const handleDragEnd = useCallback((params: {data: Array<DeckAction>}) => {
    const slug = slugRef.current;
    setActions(params.data);
    if (slug) {
      persistActionOrder(slug, params.data);
    }
  }, []);

  const renderItem = useCallback(
    ({item}: {item: DeckAction}) => (
      <Sortable.Touchable onTap={() => fireAction(item)}>
        <View style={styles.tile}>
          {!!item.icon && <Text style={styles.tileIcon}>{item.icon}</Text>}
          <Text style={styles.tileLabel} numberOfLines={2}>
            {item.label}
          </Text>
          {!!item.modifiers?.length && (
            <Text style={styles.tileMeta} numberOfLines={1}>
              {[...item.modifiers, item.key].join('+')}
            </Text>
          )}
        </View>
      </Sortable.Touchable>
    ),
    [fireAction],
  );

  const keyExtractor = useCallback((item: DeckAction) => item.id, []);

  const headerLabel = useMemo(() => {
    if (!activeApp) {
      return 'Deck';
    }
    const alias = appsJson?.apps.find(a => a.slug === slugRef.current)?.label;
    return alias ?? activeApp.app;
  }, [activeApp, appsJson]);

  return (
    <Background>
      <SafeAreaView style={styles.safe}>
        <MouseMove />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerLabel}
            </Text>
            {!!activeApp && (
              <Text style={styles.headerSub} numberOfLines={1}>
                {activeApp.title || activeApp.process || 'No active app yet'}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={requestRefresh}
            activeOpacity={0.8}>
            <MaterialIcons name="refresh" size={20} color={colors.PRIM_BG} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <Text style={styles.text}>Loading actions…</Text>
          </View>
        ) : actions.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.text, styles.helperText]}>
              {deckMissing
                ? `No deck found for “${activeApp?.app ?? 'unknown'}”. Focus an app with a preset, or pull to refresh.`
                : 'Focus a desktop app to load its deck.'}
            </Text>
          </View>
        ) : (
          <Animated.ScrollView
            ref={scrollableRef}
            bounces={false}
            contentContainerStyle={[
              styles.gridContent,
              {paddingBottom: 96 + insets.bottom},
            ]}>
            <Sortable.Grid
              columns={3}
              columnGap={10}
              rowGap={10}
              data={actions}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              scrollableRef={scrollableRef}
              onOrderChange={handleOrderChange}
              onDragEnd={handleDragEnd}
            />
          </Animated.ScrollView>
        )}
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: colors.WHITE,
    fontSize: 18,
    fontFamily: 'Raleway-Bold',
  },
  headerSub: {
    color: colors.WHITE,
    opacity: 0.7,
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'Raleway-Regular',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.PRIM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContent: {
    paddingTop: 4,
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
});
