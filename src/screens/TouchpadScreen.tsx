import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  activateKeepAwake,
  deactivateKeepAwake,
} from '@sayem314/react-native-keep-awake';
import Orientation from 'react-native-orientation-locker';
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Gesture} from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import colors from '../constants/colors';
import {buildWsUrl, parseServerMessage} from '../utils/protocol';
import {
  getInvertedScrollSettings,
  getKeepAwakeSettings,
  getResponseRateSettings,
} from '../utils/settings';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  DEFAULT_TOUCHPAD_RESPONSE_RATE,
  DEFAULT_TOUCHPAD_SCROLL_SENSITIVITY,
  DEFAULT_TOUCHPAD_SENSITIVITY,
  SERVER_URL_KEY,
  SETTINGS_TOUCHPAD_RESPONSE_RATE,
  SETTINGS_TOUCHPAD_SCROLL_SENSITIVITY,
  SETTINGS_TOUCHPAD_SENSITIVITY,
} from '../constants/settings';
import useInterval from '../hooks/useInterval';
import {getValueFor, setValueFor} from '../utils/storage';
import KeyboardModal from '../modals/KeyboardModal';
import ClipboardModal from '../modals/ClipboardModal';
import type {BottomSheetModal as BottomSheetModalType} from '@gorhom/bottom-sheet';
import RoundKey from '../components/RoundKey';
import {useIsFocused} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {TouchpadStackParamList} from '../navigation/TouchpadNavigator';
import TouchpadView from '../components/TouchpadView';
import LandscapeTouchpadView from '../components/LandscapeTouchpadView';
import QuickTuneRow, {type TuneValues} from '../components/QuickTuneRow';
import {useGlobalStore} from '../store/useGlobalStore';
import notifee, {EventType, type Event} from 'react-native-notify-kit';
import {
  getMediaKeyForAction,
  hideConnectedNotification,
  requestNotificationPermission,
  showConnectedNotification,
} from '../utils/notifications';

let ws: WebSocket | null = null;
const textInputValueProps = Platform.OS === 'ios' ? {value: ''} : {};

// Fire-and-forget sender for protocol v2 JSON frames. Drops messages while
// the socket isn't open (no acks, no queueing — per the protocol).
function sendWsMessage(msg: object) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// Notification action handler (foreground + background): pressing a media
// action sends the matching media-key to the connected desktop, if any.
const handleNotificationEvent = async ({type, detail}: Event) => {
  if (type === EventType.ACTION_PRESS) {
    const mediaKey = getMediaKeyForAction(detail.pressAction?.id);
    if (mediaKey) {
      sendWsMessage({type: 'media-key', key: mediaKey});
    }
  }
};
notifee.onBackgroundEvent(handleNotificationEvent);

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

function loadTuneValues(): TuneValues {
  return {
    touch: Number(
      getValueFor(SETTINGS_TOUCHPAD_SENSITIVITY) ??
        DEFAULT_TOUCHPAD_SENSITIVITY,
    ),
    scroll: Number(
      getValueFor(SETTINGS_TOUCHPAD_SCROLL_SENSITIVITY) ??
        DEFAULT_TOUCHPAD_SCROLL_SENSITIVITY,
    ),
    rate: Number(
      getResponseRateSettings() ?? DEFAULT_TOUCHPAD_RESPONSE_RATE,
    ),
  };
}

const DRAG_START_THRESHOLD_IN_MS = 200;
const MAX_TRANSLATE_Y = 180;

type Props = NativeStackScreenProps<TouchpadStackParamList, 'TouchpadScreen'>;

export default function TouchpadScreen({navigation, route}: Props) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [settingsData, setSettingsData] = useState<{invertedScroll?: boolean}>(
    {},
  );
  const [receivedText, setReceivedText] = useState('');
  const [clipboardVisible, setClipboardVisible] = useState(false);
  const [showLandscape, setShowLandscape] = useState(false);
  const [showTopControls, setShowTopControls] = useState(true);
  const [tune, setTune] = useState<TuneValues>(loadTuneValues);
  const setShowBottomBar = useGlobalStore(state => state.setShowBottomBar);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const manualDisconnectRef = useRef(false);

  const clearReconnectTimer = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };
  const isFocused = useIsFocused();

  const serverUrl = useMemo(
    () => route?.params?.serverUrl ?? getValueFor(SERVER_URL_KEY) ?? null,
    [route?.params],
  );

  // UI-thread accumulators: exact per-tick deltas (float px).
  const accX = useSharedValue(0);
  const accY = useSharedValue(0);
  const accSX = useSharedValue(0);
  const accSY = useSharedValue(0);
  // previous cumulative translations per channel
  const prevTX = useSharedValue(0);
  const prevTY = useSharedValue(0);
  const prevSX = useSharedValue(0);
  const prevSY = useSharedValue(0);
  // scroll-wheel thumb previous position (that gesture runs on the JS thread)
  const prevWheelY = useRef(0);
  // inverted-scroll flag mirrored for worklets (React state is unreadable there)
  const invertedScrollSV = useSharedValue(false);

  // touchpad sensitivity
  const tS = useRef(0);
  // scroll sensitivity
  const sS = useRef(0);

  const translationY = useSharedValue(0);

  // click state
  const clickStateFinger = useRef('');
  const clickStateIsDoubleTap = useRef(false);

  const lastTapped = useSharedValue(0);
  const lastTappedInRef = useRef(0);
  const isDragging = useSharedValue(false);
  const isDraggingRef = useRef(false);
  const pendingLeftClick = useRef(false);

  useEffect(() => {
    (async function setSensitivities() {
      if (isFocused) {
        Orientation.lockToPortrait();
        const tuneValues = loadTuneValues();
        tS.current = tuneValues.touch;
        sS.current = tuneValues.scroll;
        setTune(tuneValues);
        const invertedScroll = getInvertedScrollSettings();
        invertedScrollSV.value = invertedScroll ?? false;
        const keepAwake = getKeepAwakeSettings();
        if (keepAwake) {
          activateKeepAwake();
        } else {
          deactivateKeepAwake();
        }
        setSettingsData({
          invertedScroll: invertedScroll,
        });
        // Reconnect on refocus (e.g. returning from Help/Settings) if the
        // socket isn't open. Uses the storage fallback too, so a missing
        // route param can't leave the screen blank with status ''.
        if (serverUrl && !(ws && ws.readyState === WebSocket.OPEN)) {
          connectSocket();
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  useEffect(() => {
    requestNotificationPermission();
    const unsubscribe = notifee.onForegroundEvent(handleNotificationEvent);
    return () => {
      unsubscribe();
      manualDisconnectRef.current = true;
      clearReconnectTimer();
      if (ws) {
        try {
          ws.close();
        } catch {
          // already closed
        }
        ws = null;
      }
      deactivateKeepAwake();
      hideConnectedNotification();
    };
  }, []);

  // Free rotation on the touchpad; every other screen locks to portrait on
  // focus, so leaving this tab re-locks automatically. The bottom tab bar is
  // hidden in landscape to give the touchpad the full screen.
  useEffect(() => {
    if (isFocused && !showLandscape) {
      setShowBottomBar(true);
    }
  }, [isFocused, showLandscape, setShowBottomBar]);

  // socket.io used to reconnect for us; with native WebSockets it's our
  // job: retry with exponential backoff + jitter unless the user
  // disconnected on purpose.
  const scheduleReconnect = () => {
    if (manualDisconnectRef.current) {
      return;
    }
    clearReconnectTimer();
    const attempt = reconnectAttempts.current;
    reconnectAttempts.current += 1;
    const delay = Math.min(30000, 1000 * 2 ** attempt) + Math.random() * 500;
    reconnectTimer.current = setTimeout(() => {
      if (!manualDisconnectRef.current) {
        connectSocket();
      }
    }, delay);
  };

  // Native WebSocket connection handler (server speaks plain WS at /ws).
  const connectSocket = async () => {
    setLoading(true);
    // Tear down any previous socket silently (not a manual disconnect).
    clearReconnectTimer();
    if (ws) {
      const prev = ws;
      ws = null;
      try {
        prev.close();
      } catch {
        // already closed
      }
    }
    manualDisconnectRef.current = false;
    reconnectAttempts.current = 0;
    if (serverUrl) {
      const next: WebSocket = new WebSocket(buildWsUrl(serverUrl));
      ws = next;
      next.onopen = () => {
        if (ws !== next) {
          return;
        }
        reconnectAttempts.current = 0;
        setStatus('Connected');
        setLoading(false);
        showConnectedNotification();
        keyboardModalRef?.current?.present();
      };
      next.onmessage = event => {
        const msg = parseServerMessage(event?.data);
        if (msg?.type === 'text-mobile') {
          setReceivedText(typeof msg.text === 'string' ? msg.text : '');
          // open the clipboard modal for quick copying
          setClipboardVisible(true);
        }
      };
      next.onerror = () => {
        // onclose follows with the disconnect handling + reconnect below
      };
      next.onclose = () => {
        // ignore stale sockets superseded by a newer connection
        if (ws !== next) {
          return;
        }
        ws = null;
        setStatus('Disconnected');
        hideConnectedNotification();
        setLoading(false);
        scheduleReconnect();
      };
    } else {
      setLoading(false);
      setStatus('Disconnected');
    }
  };

  const disconnectSocket = async () => {
    manualDisconnectRef.current = true;
    clearReconnectTimer();
    reconnectAttempts.current = 0;
    if (ws) {
      const prev = ws;
      ws = null;
      try {
        prev.close();
      } catch {
        // already closed
      }
      keyboardModalRef?.current?.dismiss();
      setClipboardVisible(false);
      hideConnectedNotification();
      setPortraitMode();
      setStatus('Disconnected');
      setLoading(false);
    }
  };

  const openHelp = () => {
    navigation.navigate('TouchpadHelp');
  };

  const hideTopControlsAfterDelay = () => {
    setShowTopControls(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => {
      setShowTopControls(false);
    }, 3000);
  };

  const setPortraitMode = () => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    setShowLandscape(false);
    setShowTopControls(true);
    Orientation.lockToPortrait();
    setShowBottomBar(true);
  };

  const setLandscapeMode = () => {
    setShowLandscape(true);
    Orientation.lockToLandscapeLeft();
    hideTopControlsAfterDelay();
    keyboardModalRef.current?.dismiss();
  };

  const setFingerState = (state: {finger: string; doubleTap: boolean}) => {
    clickStateFinger.current = state.finger;
    clickStateIsDoubleTap.current = state.doubleTap;
  };

  const setLastTappedInRef = (time: number) => {
    lastTappedInRef.current = time;
  };

  const setDraggingRef = (value: boolean) => {
    isDraggingRef.current = value;
  };

  const setPendingLeftClick = (value: boolean) => {
    pendingLeftClick.current = value;
  };

  useInterval(
    () => {
      if (pendingLeftClick.current) {
        if (
          Date.now() - lastTappedInRef.current >
          DRAG_START_THRESHOLD_IN_MS
        ) {
          sendWsMessage({type: 'clicks', finger: 'left', doubleTap: false});
          pendingLeftClick.current = false;
        }
      }

      if (isDraggingRef.current) {
        pendingLeftClick.current = false;
        const dx = accX.value;
        const dy = accY.value;
        if (dx !== 0 || dy !== 0) {
          sendWsMessage({
            type: 'windowdragupdate',
            x: dx * tS.current,
            y: dy * tS.current,
          });
          accX.value = 0;
          accY.value = 0;
        }
      } else if (accX.value !== 0 || accY.value !== 0) {
        pendingLeftClick.current = false;
        sendWsMessage({
          type: 'coordinates',
          x: accX.value * tS.current,
          y: accY.value * tS.current,
        });
        accX.value = 0;
        accY.value = 0;
      } else if (clickStateFinger.current) {
        sendWsMessage({
          type: 'clicks',
          finger: clickStateFinger.current,
          doubleTap: clickStateIsDoubleTap.current,
        });
        clickStateFinger.current = '';
        clickStateIsDoubleTap.current = false;
      }

      if (accSX.value !== 0 || accSY.value !== 0) {
        sendWsMessage({
          type: 'scroll',
          x: accSX.value * sS.current,
          y: accSY.value * sS.current,
        });
        accSX.value = 0;
        accSY.value = 0;
      }
    },
    Number(tune.rate),
  );

  const sendWindowDragStart = () => {
    isDraggingRef.current = true;
    // drop any pre-drag residue so the drag starts exactly at the finger
    accX.value = 0;
    accY.value = 0;
    sendWsMessage({type: 'windowdragstart'});
  };
  const sendWindowDragEnd = () => {
    isDraggingRef.current = false;
    accX.value = 0;
    accY.value = 0;
    prevTX.value = 0;
    prevTY.value = 0;
    sendWsMessage({type: 'windowdragend'});
  };
  const sendKey = (key: string) => {
    sendWsMessage({type: 'key', key});
  };
  const sendMediaKey = (key: string) => {
    sendWsMessage({type: 'media-key', key});
  };
  const sendEditKey = (payload: {key: string; modifier: string[]}) => {
    sendWsMessage({type: 'edit-key', key: payload.key, modifier: payload.modifier});
  };
  const sendText = (text: string) => {
    sendWsMessage({type: 'text', text});
  };
  const sendLeftClick = () => {
    sendWsMessage({type: 'clicks', finger: 'left', doubleTap: false});
  };

  const sendRightClick = () => {
    sendWsMessage({type: 'clicks', finger: 'right', doubleTap: false});
  };

  // mouse movement gesture handler
  const dragGesture = Gesture.Pan()
    .onStart(() => {
      // fresh gesture: deltas are measured from here
      prevTX.value = 0;
      prevTY.value = 0;
      const timeSinceLastTapped = Date.now() - lastTapped.value;
      if (timeSinceLastTapped < DRAG_START_THRESHOLD_IN_MS) {
        isDragging.value = true;
        runOnJS(setDraggingRef)(true);
        runOnJS(sendWindowDragStart)();
      }
    })
    .onUpdate(e => {
      // translation is cumulative: emit only what moved since last update.
      const dx = e.translationX - prevTX.value;
      const dy = e.translationY - prevTY.value;
      prevTX.value = e.translationX;
      prevTY.value = e.translationY;
      accX.value += dx;
      accY.value += dy;
    })
    .onEnd(() => {
      prevTX.value = 0;
      prevTY.value = 0;
      if (isDragging.value) {
        runOnJS(sendWindowDragEnd)();
        runOnJS(setDraggingRef)(false);
        isDragging.value = false;
      }
    });

  // two finger scroll gesture handler
  const dragGestureScroll = Gesture.Pan()
    .minPointers(2)
    .onStart(() => {
      prevSX.value = 0;
      prevSY.value = 0;
    })
    .onUpdate(e => {
      const dx = e.translationX - prevSX.value;
      let dy = e.translationY - prevSY.value;
      prevSX.value = e.translationX;
      prevSY.value = e.translationY;
      if (invertedScrollSV.value) {
        dy = -dy;
      }
      accSX.value += dx;
      accSY.value += dy;
    })
    .onEnd(() => {
      prevSX.value = 0;
      prevSY.value = 0;
    });

  const oneFingerTap = Gesture.Tap()
    .maxDuration(150)
    .onEnd(() => {
      lastTapped.value = Date.now();
      runOnJS(setLastTappedInRef)(Date.now());
      runOnJS(setPendingLeftClick)(true);
    });
  const oneFingerDoubleTap = Gesture.Tap()
    .maxDuration(150)
    .numberOfTaps(2)
    .onEnd(() => {
      const state = {
        finger: 'left',
        doubleTap: true,
      };
      runOnJS(setFingerState)(state);
    });

  const composed =
    Platform.OS === 'ios'
      ? Gesture.Race(
          Gesture.Race(dragGesture, dragGestureScroll),
          Gesture.Exclusive(oneFingerDoubleTap, oneFingerTap),
        )
      : Gesture.Race(
          dragGestureScroll,
          dragGesture,
          Gesture.Exclusive(oneFingerDoubleTap, oneFingerTap),
        );

  const scrollGesture = Gesture.Pan()
    .minDistance(1)
    .onStart(() => {
      prevWheelY.current = 0;
    })
    .onUpdate(event => {
      translationY.value = clamp(
        event.translationY,
        -MAX_TRANSLATE_Y,
        MAX_TRANSLATE_Y,
      );
      // thumb position is cumulative: scroll only the delta since last update
      const dy = translationY.value - prevWheelY.current;
      prevWheelY.current = translationY.value;
      const y = settingsData?.invertedScroll ? dy : dy * -1;
      accSY.value += y;
    })
    .onEnd(() => {
      prevWheelY.current = 0;
      translationY.value = withTiming(0, {
        duration: 100,
      });
    })
    .runOnJS(true);

  const scrollWheelStyles = useAnimatedStyle(() => ({
    transform: [{translateY: translationY.value}],
  }));

  const textInputRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardModalRef = useRef<BottomSheetModalType>(null);

  const clearInput = () => {
    if (Platform.OS !== 'ios') {
      textInputRef.current?.clear();
    }
  };

  const handleKeyPress = (event: {nativeEvent: {key: string}}) => {
    const key = event.nativeEvent.key;
    sendKey(key);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(clearInput, 500);
  };

  const focusToggle = () => {
    keyboardModalRef?.current?.dismiss();
    setShowTextInput(p => !p);
  };

  const showControls = () => {
    if (textInputRef.current?.isFocused()) {
      textInputRef.current?.blur();
    }
    keyboardModalRef?.current?.present();
  };

  const showClipboard = () => {
    keyboardModalRef?.current?.dismiss();
    setClipboardVisible(true);
  };

  // Applies quick-tune stepper changes immediately to the live gesture
  // accumulators and persists them so Settings stays in sync.
  const handleTune = (next: TuneValues) => {
    setTune(next);
    tS.current = next.touch;
    sS.current = next.scroll;
    setValueFor(SETTINGS_TOUCHPAD_SENSITIVITY, String(next.touch));
    setValueFor(SETTINGS_TOUCHPAD_SCROLL_SENSITIVITY, String(next.scroll));
    setValueFor(SETTINGS_TOUCHPAD_RESPONSE_RATE, String(next.rate));
  };

  const insets = useSafeAreaInsets();

  const statusViews = (
    <>
      {loading && <ActivityIndicator size="large" color={colors.PRIM_ACCENT} />}

      {status === 'Disconnected' && (
        <View style={styles.retryWrapper}>
          <Text style={styles.text}>
            Go to home, select a server and connect again.
          </Text>

          <TouchableOpacity onPress={connectSocket}>
            <Text style={styles.txtRetry}>Reconnect to this server</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const topControls = (
    <>
      {status === 'Connected' && showTopControls && (
        <View
          style={[
            styles.keysConatiner,
            showLandscape && {
              marginTop: insets.top,
              paddingHorizontal: 16 + Math.max(insets.left, insets.right),
            },
          ]}>
              <RoundKey containerStyle={styles.roundKey} onPress={focusToggle}>
                <MaterialIcons
                  name="keyboard-hide"
                  size={24}
                  color={colors.WHITE}
                />
              </RoundKey>
              <RoundKey containerStyle={styles.roundKey} onPress={showControls}>
                <MaterialIcons
                  name="control-camera"
                  size={24}
                  color={colors.WHITE}
                />
              </RoundKey>
              <RoundKey containerStyle={styles.roundKey} onPress={showClipboard}>
                <MaterialIcons
                  name="content-paste"
                  size={24}
                  color={colors.WHITE}
                />
              </RoundKey>
              <RoundKey
                containerStyle={styles.roundKey}
                onPress={showLandscape ? setPortraitMode : setLandscapeMode}>
                <MaterialIcons
                  name={
                    showLandscape
                      ? 'stay-primary-portrait'
                      : 'stay-primary-landscape'
                  }
                  size={24}
                  color={colors.WHITE}
                />
              </RoundKey>
              <RoundKey containerStyle={styles.roundKey} onPress={openHelp}>
                <MaterialIcons name="help" size={24} color={colors.WHITE} />
              </RoundKey>
              <RoundKey
                containerStyle={styles.roundKey}
                onPress={disconnectSocket}>
                <MaterialIcons name="close" size={24} color={colors.WHITE} />
              </RoundKey>
            </View>
          )}
          {status === 'Connected' && showTopControls && (
            <QuickTuneRow values={tune} onChange={handleTune} />
          )}
        </>
      );

  const hiddenInput = (
    <>
      {/* Hidden Input for Keyboard */}
      {showTextInput && status === 'Connected' && (
        <TextInput
          ref={textInputRef}
          onKeyPress={handleKeyPress}
          style={styles.input}
          multiline
          autoCapitalize="none"
          autoComplete={'off'}
          autoCorrect={false}
          spellCheck={false}
          autoFocus={true}
          {...textInputValueProps}
        />
      )}
    </>
  );

  const touchpadArea = (
    <>
      {status === 'Connected' &&
        (showLandscape ? (
          <LandscapeTouchpadView
            composed={composed}
            scrollGesture={scrollGesture}
            scrollWheelStyles={scrollWheelStyles}
            sendLeftClick={sendLeftClick}
            sendRightClick={sendRightClick}
            onShowControls={hideTopControlsAfterDelay}
          />
        ) : (
          <TouchpadView
            composed={composed}
            scrollGesture={scrollGesture}
            scrollWheelStyles={scrollWheelStyles}
            sendLeftClick={sendLeftClick}
            sendRightClick={sendRightClick}
          />
        ))}
    </>
  );

  const keyboardModal = (
    <KeyboardModal
      ref={keyboardModalRef}
      sendMediaKey={sendMediaKey}
      sendEditKey={sendEditKey}
      sendLeftClick={sendLeftClick}
      sendRightClick={sendRightClick}
    />
  );

  const clipboardModal = (
    <ClipboardModal
      visible={clipboardVisible}
      sendText={sendText}
      receivedText={receivedText}
      onClose={() => setClipboardVisible(false)}
      onClearReceived={() => setReceivedText('')}
    />
  );

  // The touchpad, controls and hidden input only render when connected.
  // Otherwise the (flex: 1) connecting / disconnected views would split
  // the screen with the touchpad and squeeze it into half the space.
  const touchpadContent = (
    <>
      {topControls}
      {hiddenInput}
      {touchpadArea}
    </>
  );

  // Landscape owns its insets explicitly (cutout + gesture bar) so the pad
  // uses the full screen; portrait relies on SafeAreaView.
  return (
    <>
      <StatusBar hidden />
      {showLandscape ? (
        <View style={styles.container}>
          {status === 'Connected' ? touchpadContent : statusViews}
        </View>
      ) : (
        <SafeAreaView style={styles.container}>
          {status === 'Connected' ? touchpadContent : statusViews}
        </SafeAreaView>
      )}
      {keyboardModal}
      {clipboardModal}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: colors.PRIM_BG,
    paddingHorizontal: 8,
  },
  keysConatiner: {
    flexDirection: 'row',
    width: '100%',
    maxHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  roundKey: {
    width: 34,
    height: 34,
  },
  retryWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: colors.WHITE,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Raleway-Regular',
  },
  txtRetry: {
    color: colors.PRIM_BG,
    marginTop: 16,
    backgroundColor: colors.PRIM_ACCENT,
    borderRadius: 4,
    padding: 8,
    fontFamily: 'Raleway-Regular',
  },
  input: {
    height: 40,
    width: '100%',
    margin: 12,
    borderWidth: 1,
    padding: 10,
    display: 'none',
    color: colors.PRIM_BG,
    backgroundColor: 'white',
    zIndex: 100,
  },
});
