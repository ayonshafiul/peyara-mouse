import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useAnimatedRef} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import {onPinnedMessage, sendPinnedMessage} from '../native/PeyaraSocket';
import {parseServerMessage} from '../utils/protocol';
import {plog, plogError} from '../utils/logger';
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
import {MAX_DECK_COLUMNS, MIN_DECK_COLUMNS} from '../components/ColumnsStepper';

export interface DeckViewController {
  activeApp: ActiveAppInfo | null;
  appsJson: AppsJson | null;
  actions: DeckAction[];
  importedActions: DeckAction[];
  visibleActions: DeckAction[];
  importedVisible: DeckAction[];
  importedVisibleIds: string[];
  loading: boolean;
  deckMissing: boolean;
  query: string;
  setQuery: (q: string) => void;
  columns: number;
  decreaseColumns: () => void;
  increaseColumns: () => void;
  setColumnsForOrientation: (isLandscape: boolean) => void;
  currentSlug: string;
  manualSlug: string | null;
  selecting: boolean;
  headerLabel: string;
  headerSub: string | null;
  appDisplayName: string;
  emptyText: string;
  selectionEmptyText: string;
  gridEmptyText: string;
  isFiltering: boolean;
  hasSlug: boolean;
  canImportActions: boolean;
  showSearch: boolean;
  displayActions: DeckAction[];
  displayEmptyText: string;
  pickerVisible: boolean;
  setPickerVisible: (v: boolean) => void;
  autoSync: boolean;
  toggleAutoSync: () => void;
  handleManualSelect: (slug: string) => void;
  handleSelectAuto: () => void;
  requestRefresh: () => void;
  ensureActivated: () => void;
  handleImport: () => void;
  toggleSelectAll: () => void;
  saveSelection: () => void;
  cancelSelection: () => void;
  fireAction: (action: DeckAction) => void;
  handleOrderChange: (params: {indexToKey: Array<string>}) => void;
  handleDragEnd: (params: {data: Array<DeckAction>}) => void;
  keyExtractor: (item: DeckAction) => string;
  scrollableRef: any;
  resetOnDisconnect: () => void;
}

export function useDeckView(): DeckViewController {
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [activeApp, setActiveApp] = useState<ActiveAppInfo | null>(null);
  const [appsJson, setAppsJson] = useState<AppsJson | null>(null);
  const [actions, setActions] = useState<DeckAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [deckMissing, setDeckMissing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [manualSlug, setManualSlug] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [columns, setColumns] = useState(3);
  const [currentSlug, setCurrentSlug] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [importedActions, setImportedActions] = useState<DeckAction[]>([]);
  const [autoSync, setAutoSync] = useState(false);

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

  const decreaseColumns = useCallback(() => {
    setColumns(c => Math.max(MIN_DECK_COLUMNS, c - 1));
  }, []);

  const increaseColumns = useCallback(() => {
    setColumns(c => Math.min(MAX_DECK_COLUMNS, c + 1));
  }, []);

  const setColumnsForOrientation = useCallback((isLandscape: boolean) => {
    setColumns(isLandscape ? 5 : 3);
  }, []);

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

  const resolveStoredDeck = useCallback((slug: string) => {
    slugRef.current = slug;
    setCurrentSlug(slug);
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
      // A manual pick takes over from auto-sync: stop polling so the deck
      // stays on the chosen app until the user re-enables auto-sync
      // (which flips the picker back to Auto).
      setAutoSync(false);
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

  const requestRefresh = useCallback(() => {
    addDebugLog('INFO', 'manual refresh', 'requesting get-active-app');
    sendLogged({type: 'get-active-app'}, 'get-active-app');
  }, [addDebugLog, sendLogged]);

  // Called every time the deck view becomes active (replaces DeckModal's
  // on-visible effect, minus the orientation/column resets which the screen
  // now owns). Never resets query/selection — state is preserved.
  const ensureActivated = useCallback(() => {
    addDebugLog('INFO', 'activated', 'requesting get-active-app');
    sendLogged({type: 'get-active-app'}, 'get-active-app');
  }, [addDebugLog, sendLogged]);

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
      if (ordered.length === actionsRef.current.length) {
        saveSelectedActions(slug, ordered);
      }
    },
    [],
  );

  const handleDragEnd = useCallback((params: {data: Array<DeckAction>}) => {
    if (queryRef.current.trim() || selectingRef.current) {
      return;
    }
    const slug = slugRef.current;
    setActions(params.data);
    if (slug) {
      saveSelectedActions(slug, params.data);
    }
  }, []);

  const keyExtractor = useCallback((item: DeckAction) => item.id, []);

  const resetOnDisconnect = useCallback(() => {
    setPickerVisible(false);
    setAutoSync(false);
  }, []);

  const toggleAutoSync = useCallback(() => {
    if (autoSync) {
      setAutoSync(false);
      return;
    }
    setAutoSync(true);
    // Turning auto-sync on resumes following the desktop focus. If the
    // user later picks an app manually, that override sticks (auto frames
    // are ignored) until they cycle auto-sync off and on again.
    if (manualSlugRef.current) {
      handleSelectAuto();
    }
  }, [autoSync, handleSelectAuto]);

  // Auto-sync: while enabled, poll get-active-app every 2s so switching
  // apps on the desktop re-routes the deck automatically. Off by default;
  // also switched off on disconnect to avoid polling a dead connection.
  useEffect(() => {
    if (!autoSync) {
      return;
    }
    addDebugLog('INFO', 'auto-sync start', 'polling get-active-app every 2s');
    sendLogged({type: 'get-active-app'}, 'get-active-app');
    const timer = setInterval(() => {
      sendLogged({type: 'get-active-app'}, 'get-active-app');
    }, 2000);
    return () => {
      clearInterval(timer);
      addDebugLog('INFO', 'auto-sync stop', 'polling stopped');
    };
  }, [autoSync, addDebugLog, sendLogged]);

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

  const showSearch =
    !loading &&
    (selecting
      ? importedActions.length > 0
      : actions.length > 0 || isFiltering);

  const displayActions = selecting ? importedVisible : visibleActions;
  const displayEmptyText = selecting ? selectionEmptyText : gridEmptyText;

  return {
    activeApp,
    appsJson,
    actions,
    importedActions,
    visibleActions,
    importedVisible,
    importedVisibleIds,
    loading,
    deckMissing,
    query,
    setQuery,
    columns,
    decreaseColumns,
    increaseColumns,
    setColumnsForOrientation,
    currentSlug,
    manualSlug,
    selecting,
    headerLabel,
    headerSub,
    appDisplayName,
    emptyText,
    selectionEmptyText,
    gridEmptyText,
    isFiltering,
    hasSlug,
    canImportActions,
    showSearch,
    displayActions,
    displayEmptyText,
    pickerVisible,
    setPickerVisible,
    autoSync,
    toggleAutoSync,
    handleManualSelect,
    handleSelectAuto,
    requestRefresh,
    ensureActivated,
    handleImport,
    toggleSelectAll,
    saveSelection,
    cancelSelection,
    fireAction,
    handleOrderChange,
    handleDragEnd,
    keyExtractor,
    scrollableRef,
    resetOnDisconnect,
  };
}
