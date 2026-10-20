import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {useAnimatedRef} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useIsFocused} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Orientation from 'react-native-orientation-locker';
import {
  activateKeepAwake,
  deactivateKeepAwake,
} from '@sayem314/react-native-keep-awake';
import Sortable from 'react-native-sortables';
import colors from '../constants/colors';
import Background from '../components/Background';
import LandscapeDeckView from '../components/LandscapeDeckView';
import {useGlobalStore} from '../store/useGlobalStore';
import {getKeepAwakeSettings} from '../utils/settings';
import {setBooleanValueFor} from '../utils/storage';
import {SETTINGS_KEEP_AWAKE_KEY} from '../constants/settings';
import {parseServerMessage} from '../utils/protocol';
import {plog, plogError} from '../utils/logger';
import {onPinnedMessage, sendPinnedMessage} from '../native/PeyaraSocket';
import DeckDebugModal, {
  type DeckDebugEntry,
  type DeckLogDirection,
} from '../modals/DeckDebugModal';
import DeckAppPickerModal from '../modals/DeckAppPickerModal';
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

const MAX_DEBUG_LOGS = 200;
const MAX_DETAIL_CHARS = 2000;

function debugTimestamp(): string {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function truncateDetail(value: string): string {
  if (value.length <= MAX_DETAIL_CHARS) {
    return value;
  }
  return `${value.slice(0, MAX_DETAIL_CHARS)}…(+${value.length - MAX_DETAIL_CHARS} chars)`;
}

export default function DeckScreen() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [activeApp, setActiveApp] = useState<ActiveAppInfo | null>(null);
  const [appsJson, setAppsJson] = useState<AppsJson | null>(null);
  const [actions, setActions] = useState<DeckAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [deckMissing, setDeckMissing] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DeckDebugEntry[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [manualSlug, setManualSlug] = useState<string | null>(null);
  const [showLandscape, setShowLandscape] = useState(false);
  const [keepAwake, setKeepAwake] = useState(
    () => getKeepAwakeSettings() ?? true,
  );
  const setShowBottomBar = useGlobalStore(state => state.setShowBottomBar);

  const activeAppRef = useRef<ActiveAppInfo | null>(null);
  const appsJsonRef = useRef<AppsJson | null>(null);
  const actionsRef = useRef<DeckAction[]>([]);
  const slugRef = useRef<string>('');
  const loadingRef = useRef(false);
  const logIdRef = useRef(0);

  const manualSlugRef = useRef<string | null>(null);
  manualSlugRef.current = manualSlug;

  actionsRef.current = actions;

  const addDebugLog = useCallback(
    (dir: DeckLogDirection, label: string, detail: string) => {
      const entry: DeckDebugEntry = {
        id: ++logIdRef.current,
        time: debugTimestamp(),
        dir,
        label,
        detail: truncateDetail(detail),
      };
      setDebugLogs(prev => {
        const next = [...prev, entry];
        return next.length > MAX_DEBUG_LOGS
          ? next.slice(next.length - MAX_DEBUG_LOGS)
          : next;
      });
      if (dir === 'INFO') {
        plog('Deck', `${label}${detail ? ` :: ${detail}` : ''}`);
      } else {
        plog('Deck', `WS ${dir} ${label}${detail ? ` ${detail}` : ''}`);
      }
    },
    [],
  );

  const sendLogged = useCallback(
    (message: object, label: string) => {
      const json = JSON.stringify(message);
      addDebugLog('TX', label, json);
      sendPinnedMessage(message);
    },
    [addDebugLog],
  );

  const loadDeckForSlug = useCallback(
    async (slug: string, os: string, context: string) => {
      slugRef.current = slug;
      if (!slug || slug === 'unknown') {
        addDebugLog(
          'INFO',
          'deck missing',
          `${context} no slug (slug=${JSON.stringify(slug)})`,
        );
        setActions([]);
        setDeckMissing(true);
        return;
      }
      setLoading(true);
      loadingRef.current = true;
      try {
        const deck = await fetchDeckActions(slug, os);
        // Ignore stale responses after app switched mid-fetch.
        if (slugRef.current !== slug) {
          addDebugLog('INFO', 'deck stale', `slug=${slug} ignored`);
          return;
        }
        if (!deck) {
          addDebugLog(
            'INFO',
            'deck missing',
            `${context} fetch returned null slug=${slug} os=${os}`,
          );
          setActions([]);
          setDeckMissing(true);
          return;
        }
        addDebugLog(
          'INFO',
          'deck loaded',
          `${context} slug=${slug} os=${os} count=${deck.length}`,
        );
        setDeckMissing(false);
        const order = loadOrderMap(slug);
        setActions(applyOrderMap(deck, order));
      } catch (e) {
        plogError(
          'Deck',
          `deck fetch failed: ${e instanceof Error ? e.message : String(e)}`,
        );
        addDebugLog(
          'INFO',
          'deck fetch failed',
          e instanceof Error ? e.message : String(e),
        );
      } finally {
        if (slugRef.current === slug) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    },
    [addDebugLog],
  );

  const loadDeckForApp = useCallback(
    async (app: ActiveAppInfo, apps: AppsJson | null) => {
      const slug = matchSlug(app.app, apps);
      addDebugLog(
        'INFO',
        'resolve deck',
        `app=${JSON.stringify(app.app)} os=${JSON.stringify(app.os)} slug=${JSON.stringify(slug)} appsLoaded=${apps ? apps.apps.length : 0}`,
      );
      await loadDeckForSlug(slug, app.os, 'auto');
    },
    [addDebugLog, loadDeckForSlug],
  );

  const handleActiveAppFrame = useCallback(
    async (msg: Record<string, unknown>, apps: AppsJson | null) => {
      // Log the full get-active response payload — this is the frame the
      // whole deck hinges on, so keep every field visible.
      addDebugLog('INFO', 'get-active response', JSON.stringify(msg));
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
      // Manual override wins: keep showing the user-picked deck and ignore
      // auto routing until the user goes back to Auto.
      if (manualSlugRef.current) {
        addDebugLog(
          'INFO',
          'auto ignored',
          `manual=${manualSlugRef.current} active=${info.app}`,
        );
        return;
      }
      await loadDeckForApp(info, apps ?? appsJsonRef.current);
    },
    [addDebugLog, loadDeckForApp],
  );

  const handleManualSelect = useCallback(
    (slug: string) => {
      setManualSlug(slug);
      setPickerVisible(false);
      const os =
        activeAppRef.current?.os || activeApp?.os || 'windows';
      addDebugLog('INFO', 'manual select', `slug=${slug} os=${os}`);
      loadDeckForSlug(slug, os, 'manual').catch(() => {});
    },
    [activeApp, addDebugLog, loadDeckForSlug],
  );

  const handleSelectAuto = useCallback(() => {
    setManualSlug(null);
    setPickerVisible(false);
    addDebugLog('INFO', 'manual cleared', 'resuming auto route');
    const current = activeAppRef.current;
    if (current) {
      loadDeckForApp(current, appsJsonRef.current).catch(() => {});
    } else {
      sendLogged({type: 'get-active-app'}, 'get-active-app');
    }
  }, [addDebugLog, loadDeckForApp, sendLogged]);

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
      addDebugLog(
        'INFO',
        'apps.json loaded',
        apps ? `version=${apps.version} count=${apps.apps.length}` : 'null (offline, no cache)',
      );
      // If an active-app frame arrived before apps.json loaded, resolve now.
      if (activeAppRef.current) {
        await loadDeckForApp(activeAppRef.current, apps);
      }
    })();
    const sub = onPinnedMessage(raw => {
      // Log EVERY ws frame first so the debug modal is a complete trace.
      const msg = parseServerMessage(raw);
      const label = msg?.type ?? '(unparseable)';
      addDebugLog('RX', label, raw);
      if (msg?.type === 'active-app') {
        handleActiveAppFrame(
          msg as Record<string, unknown>,
          appsJsonRef.current,
        ).catch(e => {
          plogError(
            'Deck',
            `handleActiveAppFrame failed: ${e instanceof Error ? e.message : String(e)}`,
          );
        });
      }
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [addDebugLog, handleActiveAppFrame, loadDeckForApp]);

  // Every time this tab gains focus, ask the server for the focused app.
  useEffect(() => {
    if (!isFocused) {
      return;
    }
    if (!showLandscape) {
      Orientation.lockToPortrait();
    }
    // Re-sync with Settings (it may have changed while we were away).
    const ka = getKeepAwakeSettings() ?? true;
    setKeepAwake(ka);
    if (ka) {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
    }
    addDebugLog('INFO', 'focused', 'requesting get-active-app');
    sendLogged({type: 'get-active-app'}, 'get-active-app');
  }, [isFocused, showLandscape, addDebugLog, sendLogged]);

  // Never leak the wakelock past this screen.
  useEffect(() => () => deactivateKeepAwake(), []);

  const toggleKeepAwake = useCallback(
    (value: boolean) => {
      setKeepAwake(value);
      setBooleanValueFor(SETTINGS_KEEP_AWAKE_KEY, value);
      if (value) {
        activateKeepAwake();
      } else {
        deactivateKeepAwake();
      }
      addDebugLog('INFO', 'keep-awake', value ? 'on' : 'off');
    },
    [addDebugLog],
  );

  // Mirror the touchpad tab: the bottom tab bar is hidden in landscape to
  // give the deck the full screen, and restored in portrait.
  useEffect(() => {
    if (isFocused && !showLandscape) {
      setShowBottomBar(true);
    }
  }, [isFocused, showLandscape, setShowBottomBar]);

  // Leaving the tab while landscape resets to portrait so the tab bar can't
  // get stuck hidden on the other tabs.
  useEffect(() => {
    if (!isFocused && showLandscape) {
      setShowLandscape(false);
      setShowBottomBar(true);
      Orientation.lockToPortrait();
    }
  }, [isFocused, showLandscape, setShowBottomBar]);

  const setPortraitMode = useCallback(() => {
    setShowLandscape(false);
    Orientation.lockToPortrait();
    setShowBottomBar(true);
  }, [setShowBottomBar]);

  const setLandscapeMode = useCallback(() => {
    setShowLandscape(true);
    Orientation.lockToLandscapeLeft();
  }, []);

  const requestRefresh = useCallback(() => {
    const manual = manualSlugRef.current;
    if (manual) {
      const os = activeAppRef.current?.os || 'windows';
      addDebugLog('INFO', 'manual refresh', `reloading slug=${manual}`);
      loadDeckForSlug(manual, os, 'manual-refresh').catch(() => {});
      return;
    }
    addDebugLog('INFO', 'manual refresh', 'requesting get-active-app');
    sendLogged({type: 'get-active-app'}, 'get-active-app');
  }, [addDebugLog, loadDeckForSlug, sendLogged]);

  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  const debugSummary = useMemo(() => {
    const a = activeAppRef.current ?? activeApp;
    return [
      `activeApp=${a ? JSON.stringify(a) : '(none yet)'}`,
      `resolvedSlug=${slugRef.current || '(none)'} manual=${manualSlug ?? '(auto)'}`,
      `appsJson=${appsJson ? `v${appsJson.version} count=${appsJson.apps.length}` : '(not loaded)'}`,
      `actions=${actions.length} loading=${loading} deckMissing=${deckMissing}`,
    ].join('\n');
  }, [activeApp, appsJson, actions.length, loading, deckMissing, manualSlug]);

  const fireAction = useCallback(
    (action: DeckAction) => {
      const message = buildActionMessage(action);
      addDebugLog('INFO', `action ${action.id}`, JSON.stringify(message));
      sendLogged(message, `action ${action.id}`);
    },
    [addDebugLog, sendLogged],
  );

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
    if (manualSlug) {
      const alias = appsJson?.apps.find(a => a.slug === manualSlug)?.label;
      return alias ?? manualSlug;
    }
    if (!activeApp) {
      return 'Deck';
    }
    const alias = appsJson?.apps.find(a => a.slug === slugRef.current)?.label;
    return alias ?? activeApp.app;
  }, [activeApp, appsJson, manualSlug]);

  const headerSub = useMemo(() => {
    if (manualSlug) {
      return 'Manual selection';
    }
    if (!activeApp) {
      return null;
    }
    return activeApp.title || activeApp.process || 'No active app yet';
  }, [activeApp, manualSlug]);

  const emptyText = useMemo(
    () =>
      deckMissing
        ? `No deck found for “${manualSlug ?? activeApp?.app ?? 'unknown'}”. Pick another app or tap refresh.`
        : 'Pick an app or focus a desktop app to load its deck.',
    [deckMissing, manualSlug, activeApp],
  );

  // Landscape owns its insets explicitly (cutout + gesture bar) so the grid
  // uses the full screen; portrait relies on SafeAreaView.
  return (
    <Background>
      <StatusBar hidden={showLandscape} />
      {showLandscape ? (
        <View style={styles.landscapeContainer}>
          <LandscapeDeckView
            headerLabel={headerLabel}
            headerSub={headerSub}
            loading={loading}
            emptyText={emptyText}
            actions={actions}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            scrollableRef={scrollableRef}
            onOrderChange={handleOrderChange}
            onDragEnd={handleDragEnd}
            onSelectApp={() => setPickerVisible(true)}
            onRefresh={requestRefresh}
            onDebug={() => setDebugVisible(true)}
            onPortrait={setPortraitMode}
            keepAwake={keepAwake}
            onToggleKeepAwake={toggleKeepAwake}
          />
        </View>
      ) : (
        <SafeAreaView style={styles.safe}>
          <View style={styles.awakeRow}>
            <MaterialIcons
              name="bedtime"
              size={16}
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
              onValueChange={toggleKeepAwake}
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
              style={styles.selectBtn}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.8}
              accessibilityLabel="Select app deck">
              <MaterialIcons name="apps" size={20} color={colors.WHITE} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={requestRefresh}
              activeOpacity={0.8}
              accessibilityLabel="Refresh deck">
              <MaterialIcons name="refresh" size={20} color={colors.PRIM_BG} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.debugBtn}
              onPress={() => setDebugVisible(true)}
              activeOpacity={0.8}
              accessibilityLabel="Open deck debug log">
              <MaterialIcons name="bug-report" size={20} color={colors.WHITE} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={setLandscapeMode}
              activeOpacity={0.8}
              accessibilityLabel="Landscape deck">
              <MaterialIcons
                name="stay-primary-landscape"
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
              <Text style={[styles.text, styles.helperText]}>
                {emptyText}
              </Text>
              <TouchableOpacity
                style={styles.pickCta}
                onPress={() => setPickerVisible(true)}
                activeOpacity={0.8}>
                <Text style={styles.pickCtaText}>Select app</Text>
              </TouchableOpacity>
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
      )}
      <DeckAppPickerModal
        visible={pickerVisible}
        apps={appsJson}
        selectedSlug={slugRef.current}
        manualSlug={manualSlug}
        onSelect={handleManualSelect}
        onSelectAuto={handleSelectAuto}
        onClose={() => setPickerVisible(false)}
      />
      <DeckDebugModal
        visible={debugVisible}
        logs={debugLogs}
        summary={debugSummary}
        onClear={clearDebugLogs}
        onClose={() => setDebugVisible(false)}
      />
    </Background>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
  },
  landscapeContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  awakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  awakeIcon: {
    opacity: 0.7,
  },
  awakeText: {
    flex: 1,
    color: colors.WHITE,
    opacity: 0.7,
    fontSize: 12,
    fontFamily: 'Raleway-Regular',
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
  selectBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.TOUCHPAD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.TOUCHPAD,
    alignItems: 'center',
    justifyContent: 'center',
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
