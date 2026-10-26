import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {useAnimatedRef} from 'react-native-reanimated';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Orientation from 'react-native-orientation-locker';
import Sortable from 'react-native-sortables';
import colors from '../constants/colors';
import Background from '../components/Background';
import ColumnsStepper, {
  MAX_DECK_COLUMNS,
  MIN_DECK_COLUMNS,
} from '../components/ColumnsStepper';
import LandscapeDeckView from '../components/LandscapeDeckView';
import {parseServerMessage} from '../utils/protocol';
import {plog, plogError} from '../utils/logger';
import {onPinnedMessage, sendPinnedMessage} from '../native/PeyaraSocket';
import DeckAppPickerModal from './DeckAppPickerModal';
import DeckSelectionBar from '../components/DeckSelectionBar';
import DeckSelectionGrid from '../components/DeckSelectionGrid';
import {useDeckSelectionStore} from '../store/useDeckSelectionStore';
import type {ActiveAppInfo, AppsJson, DeckAction} from '../types/deck';
import {
  buildActionMessage,
  fetchAppsJson,
  fetchDeckActions,
  loadSelectedActions,
  matchSlug,
  saveSelectedActions,
} from '../utils/deck';

interface DeckModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DeckModal({visible, onClose}: DeckModalProps) {
  const insets = useSafeAreaInsets();
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [activeApp, setActiveApp] = useState<ActiveAppInfo | null>(null);
  const [appsJson, setAppsJson] = useState<AppsJson | null>(null);
  const [actions, setActions] = useState<DeckAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [deckMissing, setDeckMissing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [manualSlug, setManualSlug] = useState<string | null>(null);
  const [showLandscape, setShowLandscape] = useState(false);
  const [query, setQuery] = useState('');
  const [columns, setColumns] = useState(3);
  const [currentSlug, setCurrentSlug] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [importedActions, setImportedActions] = useState<DeckAction[]>([]);
  const [showTopControls, setShowTopControls] = useState(true);

  const activeAppRef = useRef<ActiveAppInfo | null>(null);
  const appsJsonRef = useRef<AppsJson | null>(null);
  const actionsRef = useRef<DeckAction[]>([]);
  const importedActionsRef = useRef<DeckAction[]>([]);
  const slugRef = useRef<string>('');
  const loadingRef = useRef(false);
  const queryRef = useRef('');
  queryRef.current = query;
  const selectingRef = useRef(false);
  selectingRef.current = selecting;

  const manualSlugRef = useRef<string | null>(null);
  manualSlugRef.current = manualSlug;

  actionsRef.current = actions;
  importedActionsRef.current = importedActions;

  // Columns per row, clamped to [MIN_DECK_COLUMNS, MAX_DECK_COLUMNS].
  const decreaseColumns = useCallback(() => {
    setColumns(c => Math.max(MIN_DECK_COLUMNS, c - 1));
  }, []);

  const increaseColumns = useCallback(() => {
    setColumns(c => Math.min(MAX_DECK_COLUMNS, c + 1));
  }, []);

  // Gear toggles the whole top control section; it auto-hides 2.5s after
  // the last relevant interaction so the grid gets maximum room.
  const toggleTopControls = useCallback(() => {
    setShowTopControls(v => !v);
  }, []);

  useEffect(() => {
    if (!visible || !showTopControls) {
      return;
    }
    const timer = setTimeout(() => setShowTopControls(false), 2500);
    return () => clearTimeout(timer);
  }, [
    visible,
    showLandscape,
    showTopControls,
    selecting,
    query,
    loading,
  ]);

  const addDebugLog = useCallback(
    (dir: string, label: string, detail: string) => {
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

  // Resolve the deck for a slug from the locally persisted selection.
  // Nothing is fetched here — fetching happens only via the import button.
  const resolveStoredDeck = useCallback((slug: string) => {
    slugRef.current = slug;
    setCurrentSlug(slug);
    // A slug switch discards any in-progress selection.
    setSelecting(false);
    setImportedActions([]);
    useDeckSelectionStore.getState().clear();
    if (!slug || slug === 'unknown') {
      setActions([]);
      setDeckMissing(true);
      setLoading(false);
      loadingRef.current = false;
      return;
    }
    setDeckMissing(false);
    const stored = loadSelectedActions(slug);
    setActions(stored ?? []);
    setLoading(false);
    loadingRef.current = false;
  }, []);

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
      const slug = matchSlug(info.app, apps ?? appsJsonRef.current);
      addDebugLog(
        'INFO',
        'resolve deck',
        `app=${JSON.stringify(info.app)} os=${JSON.stringify(info.os)} slug=${JSON.stringify(slug)}`,
      );
      resolveStoredDeck(slug);
    },
    [addDebugLog, resolveStoredDeck],
  );

  const handleManualSelect = useCallback(
    (slug: string) => {
      setManualSlug(slug);
      setPickerVisible(false);
      addDebugLog('INFO', 'manual select', `slug=${slug}`);
      resolveStoredDeck(slug);
    },
    [addDebugLog, resolveStoredDeck],
  );

  const handleSelectAuto = useCallback(() => {
    setManualSlug(null);
    setPickerVisible(false);
    addDebugLog('INFO', 'manual cleared', 'resuming auto route');
    const current = activeAppRef.current;
    if (current) {
      resolveStoredDeck(matchSlug(current.app, appsJsonRef.current));
    } else {
      sendLogged({type: 'get-active-app'}, 'get-active-app');
    }
  }, [addDebugLog, resolveStoredDeck, sendLogged]);

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
        resolveStoredDeck(
          matchSlug(activeAppRef.current.app, apps),
        );
      }
    })();
    const sub = onPinnedMessage(raw => {
      const msg = parseServerMessage(raw);
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
  }, [addDebugLog, handleActiveAppFrame, resolveStoredDeck]);

  // Every time the modal opens, ask the server for the focused app.
  useEffect(() => {
    if (!visible) {
      return;
    }
    setShowLandscape(false);
    setQuery('');
    setColumns(3);
    setShowTopControls(true);
    Orientation.lockToPortrait();
    addDebugLog('INFO', 'opened', 'requesting get-active-app');
    sendLogged({type: 'get-active-app'}, 'get-active-app');
  }, [visible, addDebugLog, sendLogged]);

  const handleClose = useCallback(() => {
    setPickerVisible(false);
    setQuery('');
    setColumns(3);
    setSelecting(false);
    setImportedActions([]);
    useDeckSelectionStore.getState().clear();
    setShowTopControls(true);
    if (showLandscape) {
      setShowLandscape(false);
      Orientation.lockToPortrait();
    }
    onClose();
  }, [onClose, showLandscape]);

  const setPortraitMode = useCallback(() => {
    setShowLandscape(false);
    setColumns(3);
    Orientation.lockToPortrait();
  }, []);

  const setLandscapeMode = useCallback(() => {
    setShowLandscape(true);
    setColumns(5);
    Orientation.lockToLandscapeLeft();
  }, []);

  // Refresh only re-asks the server for the focused app window — it never
  // fetches deck actions. Fetching happens solely via the import button.
  const requestRefresh = useCallback(() => {
    addDebugLog('INFO', 'manual refresh', 'requesting get-active-app');
    sendLogged({type: 'get-active-app'}, 'get-active-app');
  }, [addDebugLog, sendLogged]);

  // Import the full action list for the current slug from the server,
  // then enter in-place multi-select mode.
  const handleImport = useCallback(async () => {
    const slug = slugRef.current;
    if (!slug || slug === 'unknown' || loadingRef.current) {
      return;
    }
    const os = activeAppRef.current?.os || activeApp?.os || 'windows';
    addDebugLog('INFO', 'import start', `slug=${slug} os=${os}`);
    setLoading(true);
    loadingRef.current = true;
    try {
      const deck = await fetchDeckActions(slug, os);
      // Ignore stale responses after the slug switched mid-fetch.
      if (slugRef.current !== slug) {
        return;
      }
      if (!deck || deck.length === 0) {
        addDebugLog(
          'INFO',
          'import empty',
          `no actions slug=${slug} os=${os}`,
        );
        setDeckMissing(true);
        setActions([]);
        return;
      }
      addDebugLog(
        'INFO',
        'import loaded',
        `slug=${slug} os=${os} count=${deck.length}`,
      );
      // Preselect whatever is already stored so re-import keeps picks.
      const storedIds = new Set(
        (loadSelectedActions(slug) ?? []).map(a => a.id),
      );
      setImportedActions(deck);
      useDeckSelectionStore
        .getState()
        .replaceAll(deck.filter(a => storedIds.has(a.id)).map(a => a.id));
      setDeckMissing(false);
      setSelecting(true);
    } catch (e) {
      if (slugRef.current !== slug) {
        return;
      }
      plogError(
        'Deck',
        `import failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      addDebugLog(
        'INFO',
        'import failed',
        e instanceof Error ? e.message : String(e),
      );
      setDeckMissing(true);
    } finally {
      if (slugRef.current === slug) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [activeApp, addDebugLog]);

  const toggleSelectAll = useCallback(() => {
    const q = queryRef.current.trim().toLowerCase();
    const shown = q
      ? importedActionsRef.current.filter(a =>
          a.label.toLowerCase().includes(q),
        )
      : importedActionsRef.current;
    if (shown.length === 0) {
      return;
    }
    const store = useDeckSelectionStore.getState();
    const allVisibleSelected = shown.every(a => store.selected[a.id]);
    store.setMany(
      shown.map(a => a.id),
      !allVisibleSelected,
    );
  }, []);

  const saveSelection = useCallback(() => {
    const slug = slugRef.current;
    const ids = Object.keys(useDeckSelectionStore.getState().selected);
    if (!slug || ids.length === 0) {
      return;
    }
    const picked = new Set(ids);
    const selected = importedActionsRef.current.filter(a =>
      picked.has(a.id),
    );
    addDebugLog(
      'INFO',
      'selection saved',
      `slug=${slug} count=${selected.length}`,
    );
    saveSelectedActions(slug, selected);
    setActions(selected);
    setSelecting(false);
    setImportedActions([]);
    useDeckSelectionStore.getState().clear();
  }, [addDebugLog]);

  const cancelSelection = useCallback(() => {
    setSelecting(false);
    setImportedActions([]);
    useDeckSelectionStore.getState().clear();
  }, []);

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
      // While filtering or selecting, the grid only shows a subset — never
      // persist a partial order.
      if (queryRef.current.trim() || selectingRef.current) {
        return;
      }
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
      // Persist the full ordered selection; objects stay intact.
      if (ordered.length === actionsRef.current.length) {
        saveSelectedActions(slug, ordered);
      }
    },
    [],
  );

  const handleDragEnd = useCallback((params: {data: Array<DeckAction>}) => {
    // While filtering or selecting, params.data is only the visible subset —
    // applying it would drop the hidden actions, so ignore the drop.
    if (queryRef.current.trim() || selectingRef.current) {
      return;
    }
    const slug = slugRef.current;
    setActions(params.data);
    if (slug) {
      saveSelectedActions(slug, params.data);
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
          {!!item.key && (
            <Text style={styles.tileMeta} numberOfLines={1}>
              {[...(item.modifiers ?? []), item.key].join('+')}
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

  const hasSlug = !!currentSlug && currentSlug !== 'unknown';
  const canImportActions = hasSlug && !loading;

  const appDisplayName = useMemo(() => {
    if (manualSlug) {
      const alias = appsJson?.apps.find(a => a.slug === manualSlug)?.label;
      return alias ?? manualSlug;
    }
    if (!activeApp) {
      return 'unknown';
    }
    const alias = appsJson?.apps.find(a => a.slug === slugRef.current)?.label;
    return alias ?? activeApp.app;
  }, [activeApp, appsJson, manualSlug]);

  const emptyText = useMemo(() => {
    if (!hasSlug) {
      return 'Focus a desktop app to load its deck, or pick an app manually.';
    }
    if (deckMissing) {
      return `Couldn't fetch actions for “${appDisplayName}”. Check the connection and tap Import to retry.`;
    }
    return `No actions imported for “${appDisplayName}” yet. Tap Import to fetch the full list, then choose which actions to keep.`;
  }, [deckMissing, hasSlug, appDisplayName]);

  const visibleActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return actions;
    }
    return actions.filter(action =>
      action.label.toLowerCase().includes(q),
    );
  }, [actions, query]);

  const isFiltering = query.trim().length > 0;

  const importedVisible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return importedActions;
    }
    return importedActions.filter(action =>
      action.label.toLowerCase().includes(q),
    );
  }, [importedActions, query]);

  const importedVisibleIds = useMemo(
    () => importedVisible.map(a => a.id),
    [importedVisible],
  );

  const selectionEmptyText = useMemo(
    () =>
      isFiltering && importedActions.length > 0
        ? `No actions match “${query.trim()}”.`
        : 'No actions to show.',
    [isFiltering, importedActions.length, query],
  );

  const gridEmptyText = useMemo(
    () =>
      isFiltering && actions.length > 0
        ? `No actions match “${query.trim()}”.`
        : emptyText,
    [isFiltering, actions.length, query, emptyText],
  );

  const searchBar = (
    <View style={styles.searchBar}>
      <MaterialIcons
        name="search"
        size={20}
        color="rgba(255,255,255,0.5)"
      />
      <TextInput
        style={styles.searchInput}
        placeholder="Search actions…"
        placeholderTextColor="rgba(255,255,255,0.4)"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search deck actions"
      />
      {!!query && (
        <TouchableOpacity
          onPress={() => setQuery('')}
          hitSlop={8}
          accessibilityLabel="Clear deck search">
          <MaterialIcons name="close" size={18} color={colors.WHITE} />
        </TouchableOpacity>
      )}
    </View>
  );

  // Landscape owns its insets explicitly (cutout + gesture bar) so the grid
  // uses the full screen; portrait relies on SafeAreaView.
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="fullScreen">
      {/* RN Modal renders in a separate native window (Dialog on Android),
          outside the app-level GestureHandlerRootView — sortable drag
          gestures won't activate without their own root in this window. */}
      <GestureHandlerRootView style={styles.gestureRoot}>
        <Background>
        <StatusBar hidden />
        {showLandscape ? (
          <View style={styles.landscapeContainer}>
            <LandscapeDeckView
              headerLabel={headerLabel}
              headerSub={headerSub}
              loading={loading}
              emptyText={selecting ? selectionEmptyText : gridEmptyText}
              actions={selecting ? importedVisible : visibleActions}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              scrollableRef={scrollableRef}
              onOrderChange={handleOrderChange}
              onDragEnd={handleDragEnd}
              onSelectApp={() => setPickerVisible(true)}
              onRefresh={requestRefresh}
              onPortrait={setPortraitMode}
              onClose={handleClose}
              query={query}
              onQueryChange={setQuery}
              isFiltering={isFiltering}
              isManual={!!manualSlug}
              columns={columns}
              onDecreaseColumns={decreaseColumns}
              onIncreaseColumns={increaseColumns}
              selecting={selecting}
              selectionActions={importedVisible}
              selectionVisibleIds={importedVisibleIds}
              selectionTotal={importedActions.length}
              onToggleSelectAll={toggleSelectAll}
              onSaveSelection={saveSelection}
              onCancelSelection={cancelSelection}
              onImport={handleImport}
              canImport={canImportActions}
              hasSlug={hasSlug}
              showTopControls={showTopControls}
              onToggleTopControls={toggleTopControls}
            />
          </View>
        ) : (
          <SafeAreaView style={styles.safe}>
            {showTopControls ? (
              <>
                <View style={styles.header}>
                  <View style={styles.topRow}>
                    <TouchableOpacity
                      style={styles.closeBtn}
                      onPress={toggleTopControls}
                      activeOpacity={0.8}
                      accessibilityLabel="Hide deck controls">
                      <MaterialIcons
                        name="settings"
                        size={20}
                        color={colors.WHITE}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.closeBtn}
                      onPress={handleClose}
                      activeOpacity={0.8}
                      accessibilityLabel="Close deck">
                      <MaterialIcons
                        name="close"
                        size={20}
                        color={colors.WHITE}
                      />
                    </TouchableOpacity>
                <View style={styles.topRowSpacer} />
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
                <ColumnsStepper
                  value={columns}
                  onDecrease={decreaseColumns}
                  onIncrease={increaseColumns}
                />
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
              <View style={styles.headerText}>
                <View style={styles.titleRow}>
                  <TouchableOpacity
                    style={[
                      styles.importBtn,
                      !canImportActions && styles.importBtnDisabled,
                    ]}
                    onPress={handleImport}
                    disabled={!canImportActions}
                    activeOpacity={0.8}
                    accessibilityLabel="Import actions"
                    accessibilityState={{disabled: !canImportActions}}>
                    <Text style={styles.importBtnText}>Import actions</Text>
                  </TouchableOpacity>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {headerLabel}
                  </Text>
                  {!!manualSlug && (
                    <View style={styles.manualChip}>
                      <Text style={styles.manualChipText}>
                        Manual selection
                      </Text>
                    </View>
                  )}
                </View>
                {!manualSlug && !!headerSub && (
                  <Text style={styles.headerSub} numberOfLines={1}>
                    {headerSub}
                  </Text>
                )}
              </View>
            </View>

            {!loading &&
              (selecting ? importedActions.length > 0 : actions.length > 0) &&
              searchBar}
              </>
            ) : (
              <View style={styles.hiddenBar}>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={toggleTopControls}
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
                total={importedActions.length}
                visibleIds={importedVisibleIds}
                onToggleAll={toggleSelectAll}
                onSave={saveSelection}
                onCancel={cancelSelection}
              />
            )}

            {loading ? (
              <View style={styles.center}>
                <Text style={styles.text}>Loading actions…</Text>
              </View>
            ) : selecting ? (
              importedVisible.length === 0 ? (
                <View style={styles.center}>
                  <Text style={[styles.text, styles.helperText]}>
                    {selectionEmptyText}
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
                  <DeckSelectionGrid
                    actions={importedVisible}
                    columns={columns}
                  />
                </Animated.ScrollView>
              )
            ) : actions.length === 0 ? (
              <View style={styles.center}>
                <Text style={[styles.text, styles.helperText]}>
                  {emptyText}
                </Text>
                {hasSlug && (
                  <View style={styles.selectedAppCard}>
                    <Text style={styles.selectedAppCaption}>
                      Selected app
                    </Text>
                    <Text style={styles.selectedAppName} numberOfLines={1}>
                      {headerLabel}
                    </Text>
                  </View>
                )}
                {canImportActions && (
                  <TouchableOpacity
                    style={styles.pickCta}
                    onPress={handleImport}
                    activeOpacity={0.8}
                    accessibilityLabel="Import actions">
                    <Text style={styles.pickCtaText}>Import actions</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.pickCta, styles.secondaryCta]}
                  onPress={() => setPickerVisible(true)}
                  activeOpacity={0.8}
                  accessibilityLabel={hasSlug ? 'Change app selection' : 'Select app'}>
                  <Text style={[styles.pickCtaText, styles.secondaryCtaText]}>
                    {hasSlug ? 'Change app selection' : 'Select app'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : visibleActions.length === 0 ? (
              <View style={styles.center}>
                <Text style={[styles.text, styles.helperText]}>
                  {gridEmptyText}
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
                  columns={columns}
                  columnGap={10}
                  rowGap={10}
                  data={visibleActions}
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
        </Background>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
  },
  landscapeContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    gap: 8,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topRowSpacer: {
    flex: 1,
  },
  hiddenBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    paddingTop: 4,
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
    fontSize: 14,
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
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Raleway-Regular',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.TOUCHPAD,
    alignItems: 'center',
    justifyContent: 'center',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.TOUCHPAD,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: 'Raleway-Regular',
    paddingVertical: 0,
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
