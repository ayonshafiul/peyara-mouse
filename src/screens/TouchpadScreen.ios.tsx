import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  activateKeepAwake,
  deactivateKeepAwake,
} from '@sayem314/react-native-keep-awake';
import Orientation from 'react-native-orientation-locker';
import {
  ActivityIndicator,
  Alert,
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
import {parseServerMessage} from '../utils/protocol';
import {fpPreview, plog, plogError} from '../utils/logger';
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
  SERVER_FINGERPRINT_KEY,
  SERVER_PAIRING_CODE_KEY,
  SERVER_URL_KEY,
  SETTINGS_TOUCHPAD_RESPONSE_RATE,
  SETTINGS_TOUCHPAD_SCROLL_SENSITIVITY,
  SETTINGS_TOUCHPAD_SENSITIVITY,
} from '../constants/settings';
import {
  connectPinned,
  disconnectPinned,
  onPinnedMessage,
  onPinnedStatus,
  sendPinnedMessage,
} from '../native/PeyaraSocket';
import useInterval from '../hooks/useInterval';
import {getValueFor, setValueFor} from '../utils/storage';
import KeyboardModal from '../modals/KeyboardModal';
import ClipboardModal from '../modals/ClipboardModal';
import DeckModal from '../modals/DeckModal';
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

// iOS TextInput quirk: pinning `value` keeps the hidden keyboard input
// empty without manual clearing.
const textInputValueProps = {value: ''};

// Notification action handler (foreground + background): pressing a media
// action sends the matching media-key to the connected desktop, if any.
const handleNotificationEvent = async ({type, detail}: Event) => {
  if (type === EventType.ACTION_PRESS) {
    const mediaKey = getMediaKeyForAction(detail.pressAction?.id);
    if (mediaKey) {
      plog('Touchpad', `notification media-key: ${mediaKey}`);
      sendPinnedMessage({type: 'media-key', key: mediaKey});
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
// widest press+release that counts as a tap: iOS detects taps from the
// pan's raw touch stream
const TAP_MAX_DURATION_IN_MS = 500;
// matches the Tap default maxDelay between taps (double-tap window)
const DOUBLE_TAP_WINDOW_MS = 500;
// a pan whose touch sequence begins within this window after a tap lift
// also counts as tap-then-drag: recognizer arbitration can delay pan
// activation well past the lift (iOS holds the pan until the double-tap
// fails on movement)
const DRAG_TOUCH_DOWN_WINDOW_IN_MS = 300;
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
  const [deckVisible, setDeckVisible] = useState(false);
  const [showLandscape, setShowLandscape] = useState(false);
  const [showTopControls, setShowTopControls] = useState(true);
  const [tune, setTune] = useState<TuneValues>(loadTuneValues);
  const setShowBottomBar = useGlobalStore(state => state.setShowBottomBar);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFocused = useIsFocused();

  const serverUrl = useMemo(
    () => route?.params?.serverUrl ?? getValueFor(SERVER_URL_KEY) ?? null,
    [route?.params],
  );
  const fingerprint = useMemo(
    () => route?.params?.fingerprint ?? getValueFor(SERVER_FINGERPRINT_KEY) ?? '',
    [route?.params],
  );
  const pair = useMemo(
    () => route?.params?.pair ?? getValueFor(SERVER_PAIRING_CODE_KEY) ?? '',
    [route?.params],
  );
  // Mirrors the native connection state (the module owns reconnecting).
  const connectedRef = useRef(false);

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
  const lastTapped = useSharedValue(0);
  const lastTappedInRef = useRef(0);
  const isDragging = useSharedValue(false);
  const isDraggingRef = useRef(false);
  const pendingLeftClick = useRef(false);
  // true while the touchpad is being touched (JS-thread mirror of the
  // pan's raw touch stream)
  const touchActiveRef = useRef(false);

  // Raw touch tracking on the pan gesture so a tap can be timestamped at
  // finger-lift, before the composed Tap gestures settle — on iOS the
  // double-tap member of Exclusive() holds the single-tap's onEnd until
  // after a follow-up pan has started, which used to defeat the
  // tap-then-drag check.
  const tapTouchDownAt = useSharedValue(0);
  const tapTouchCount = useSharedValue(0);
  const tapTouchMulti = useSharedValue(false);
  const tapTouchActivated = useSharedValue(false);
  const lastTapLiftAt = useSharedValue(0);

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
        // native layer isn't connected. Uses the storage fallback too, so a
        // missing route param can't leave the screen blank with status ''.
        if (serverUrl && fingerprint && pair && !connectedRef.current) {
          plog(
            'Touchpad',
            `refocus connect url=${serverUrl} fp=${fpPreview(fingerprint)}`,
          );
          connectSocket();
        } else {
          plog(
            'Touchpad',
            `refocus skip connected=${connectedRef.current} hasUrl=${!!serverUrl} hasFp=${!!fingerprint} hasPair=${!!pair}`,
          );
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  useEffect(() => {
    requestNotificationPermission();
    const unsubscribe = notifee.onForegroundEvent(handleNotificationEvent);
    const messageSub = onPinnedMessage(raw => {
      const msg = parseServerMessage(raw);
      if (msg?.type === 'text-mobile') {
        const text = typeof msg.text === 'string' ? msg.text : '';
        plog('Touchpad', `text-mobile received len=${text.length}`);
        setReceivedText(text);
        // open the clipboard modal for quick copying
        setClipboardVisible(true);
      } else {
        plog('Touchpad', `ignored frame type=${msg?.type ?? '(unparseable)'}`);
      }
    });
    const statusSub = onPinnedStatus(pinnedStatus => {
      plog('Touchpad', `status event: ${pinnedStatus}`);
      if (pinnedStatus === 'connected') {
        connectedRef.current = true;
        setStatus('Connected');
        setLoading(false);
        showConnectedNotification();
        keyboardModalRef?.current?.present();
      } else if (pinnedStatus === 'pairing-rejected') {
        // Closed right after open: wrong/stale pairing code. The native
        // layer already stopped retrying — prompt a re-scan instead.
        connectedRef.current = false;
        setStatus('Disconnected');
        hideConnectedNotification();
        setLoading(false);
        Alert.alert(
          'Pairing rejected',
          'The desktop rejected the pairing code. Scan the QR code again or enter the code manually.',
          [
            {
              text: 'Scan QR',
              onPress: () =>
                navigation.getParent()?.navigate('QRCode' as never),
            },
            {
              text: 'Enter code',
              onPress: () =>
                navigation.getParent()?.navigate('PairingCode' as never),
            },
          ],
        );
      } else {
        connectedRef.current = false;
        setStatus('Disconnected');
        hideConnectedNotification();
        setLoading(false);
        if (pinnedStatus === 'unrecoverable') {
          // Certificate rotated/regenerated — a rescan is required.
          Alert.alert(
            'Server certificate changed',
            'Please scan the QR code from the Peyara desktop app again.',
          );
        }
      }
    });
    return () => {
      plog('Touchpad', 'unmount cleanup, disconnecting');
      unsubscribe();
      messageSub.remove();
      statusSub.remove();
      connectedRef.current = false;
      disconnectPinned();
      deactivateKeepAwake();
      hideConnectedNotification();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Free rotation on the touchpad; every other screen locks to portrait on
  // focus, so leaving this tab re-locks automatically. The bottom tab bar is
  // hidden in landscape to give the touchpad the full screen.
  useEffect(() => {
    if (isFocused && !showLandscape) {
      setShowBottomBar(true);
    }
  }, [isFocused, showLandscape, setShowBottomBar]);

  // Pinned-TLS connection via the native PeyaraSocket module (it owns
  // reconnecting). Needs the https base URL, the QR fingerprint and the
  // pairing code — the native layer sends hello first on open.
  const connectSocket = async () => {
    if (!serverUrl || !fingerprint || !pair) {
      plogError(
        'Touchpad',
        `missing credentials hasUrl=${!!serverUrl} hasFp=${!!fingerprint} hasPair=${!!pair}`,
      );
      Alert.alert(
        'Server pairing missing',
        'Please scan the QR code from the Peyara desktop app again.',
      );
      setLoading(false);
      setStatus('Disconnected');
      return;
    }
    setLoading(true);
    plog(
      'Touchpad',
      `connectPinned url=${serverUrl} fp=${fpPreview(fingerprint)}`,
    );
    try {
      // Resolves once started; progress arrives via status events and the
      // native layer owns reconnecting from here on.
      await connectPinned(fingerprint, serverUrl, pair);
      plog('Touchpad', 'connectPinned started');
    } catch (error) {
      // Invalid arguments; runtime failures arrive via status events.
      plogError(
        'Touchpad',
        `connectPinned threw: ${error instanceof Error ? error.message : String(error)}`,
      );
      setLoading(false);
      setStatus('Disconnected');
    }
  };

  const disconnectSocket = async () => {
    plog('Touchpad', 'manual disconnect');
    connectedRef.current = false;
    disconnectPinned();
    // Drop the session credentials (fingerprint + code rotate together, so
    // a stale session must never auto-reconnect — re-scan/re-tap instead).
    setValueFor(SERVER_URL_KEY, '');
    setValueFor(SERVER_FINGERPRINT_KEY, '');
    setValueFor(SERVER_PAIRING_CODE_KEY, '');
    keyboardModalRef?.current?.dismiss();
    setClipboardVisible(false);
    hideConnectedNotification();
    setPortraitMode();
    setStatus('Disconnected');
    setLoading(false);
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

  const setLastTappedInRef = (time: number) => {
    lastTappedInRef.current = time;
  };

  const setDraggingRef = (value: boolean) => {
    isDraggingRef.current = value;
  };

  const setPendingLeftClick = (value: boolean) => {
    pendingLeftClick.current = value;
  };

  const setTouchActive = (value: boolean) => {
    touchActiveRef.current = value;
  };

  useInterval(
    () => {
      // Never fire the deferred tap-click while the finger is still down:
      // the touch may be the start of a tap-then-drag (iOS holds the pan
      // back until the double-tap fails on movement).
      if (pendingLeftClick.current && !touchActiveRef.current) {
        if (
          Date.now() - lastTappedInRef.current >
          DRAG_START_THRESHOLD_IN_MS
        ) {
          sendPinnedMessage({type: 'clicks', finger: 'left', doubleTap: false});
          plog('Touchpad', 'send tap-click left');
          pendingLeftClick.current = false;
        }
      }

      if (isDraggingRef.current) {
        pendingLeftClick.current = false;
        const dx = accX.value;
        const dy = accY.value;
        if (dx !== 0 || dy !== 0) {
          sendPinnedMessage({
            type: 'windowdragupdate',
            x: dx * tS.current,
            y: dy * tS.current,
          });
          accX.value = 0;
          accY.value = 0;
        }
      } else if (accX.value !== 0 || accY.value !== 0) {
        pendingLeftClick.current = false;
        sendPinnedMessage({
          type: 'coordinates',
          x: accX.value * tS.current,
          y: accY.value * tS.current,
        });
        accX.value = 0;
        accY.value = 0;
      }

      if (accSX.value !== 0 || accSY.value !== 0) {
        sendPinnedMessage({
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
    plog('Touchpad', 'send windowdragstart');
    sendPinnedMessage({type: 'windowdragstart'});
  };
  const sendWindowDragEnd = () => {
    isDraggingRef.current = false;
    accX.value = 0;
    accY.value = 0;
    prevTX.value = 0;
    prevTY.value = 0;
    // a drag separates taps: the next quick tap must not read as the
    // second half of a double tap
    lastTapLiftAt.value = 0;
    plog('Touchpad', 'send windowdragend');
    sendPinnedMessage({type: 'windowdragend'});
  };
  // iOS only: sent from the pan's raw touch stream when the second
  // qualifying lift lands within the double-tap window. A double click
  // supersedes the first tap's deferred single click.
  const sendDoubleTap = () => {
    pendingLeftClick.current = false;
    plog('Touchpad', 'send click left doubleTap=true');
    sendPinnedMessage({type: 'clicks', finger: 'left', doubleTap: true});
  };
  const sendKey = (key: string) => {
    plog('Touchpad', `send key: ${key}`);
    sendPinnedMessage({type: 'key', key});
  };
  const sendMediaKey = (key: string) => {
    plog('Touchpad', `send media-key: ${key}`);
    sendPinnedMessage({type: 'media-key', key});
  };
  const sendEditKey = (payload: {key: string; modifier: string[]}) => {
    plog(
      'Touchpad',
      `send edit-key: ${payload.key} modifier=${payload.modifier.join('+')}`,
    );
    sendPinnedMessage({type: 'edit-key', key: payload.key, modifier: payload.modifier});
  };
  const sendText = (text: string) => {
    plog('Touchpad', `send text len=${text.length}`);
    sendPinnedMessage({type: 'text', text});
  };
  const sendLeftClick = () => {
    plog('Touchpad', 'send click left');
    sendPinnedMessage({type: 'clicks', finger: 'left', doubleTap: false});
  };

  const sendRightClick = () => {
    plog('Touchpad', 'send click right');
    sendPinnedMessage({type: 'clicks', finger: 'right', doubleTap: false});
  };

  // Enters window-drag mode when this pan follows a recent tap. Two paths
  // count: the pan activating within DRAG_START_THRESHOLD_IN_MS of the tap
  // lift, or the touch sequence beginning that soon after the lift (iOS,
  // where the tap recognizers hold the pan back until the double-tap fails
  // on movement).
  const tryEngageDrag = () => {
    'worklet';
    if (isDragging.value) {
      return;
    }
    const now = Date.now();
    const downAfterLift = tapTouchDownAt.value - lastTapped.value;
    if (
      now - lastTapped.value < DRAG_START_THRESHOLD_IN_MS ||
      (!tapTouchMulti.value &&
        downAfterLift >= 0 &&
        downAfterLift < DRAG_TOUCH_DOWN_WINDOW_IN_MS &&
        now - tapTouchDownAt.value < 1000)
    ) {
      isDragging.value = true;
      runOnJS(setDraggingRef)(true);
      runOnJS(sendWindowDragStart)();
    }
  };

  // mouse movement gesture handler
  const dragGesture = Gesture.Pan()
    .onTouchesDown(e => {
      const freshSequence = tapTouchCount.value === 0;
      tapTouchCount.value += e.changedTouches.length;
      if (freshSequence) {
        runOnJS(setTouchActive)(true);
        // first finger of a fresh touch sequence
        tapTouchDownAt.value = Date.now();
        tapTouchMulti.value = false;
        tapTouchActivated.value = false;
      } else if (tapTouchCount.value > 1) {
        tapTouchMulti.value = true;
      }
    })
    .onTouchesUp(e => {
      tapTouchCount.value = Math.max(
        0,
        tapTouchCount.value - e.changedTouches.length,
      );
      if (tapTouchCount.value === 0) {
        runOnJS(setTouchActive)(false);
        const now = Date.now();
        // A quick, stationary, single-finger lift is a tap: with no tap
        // recognizers in the tree (they would block the pan during a
        // follow-up drag), clicks are derived right here. The second
        // qualifying lift within the double-tap window is a double click;
        // otherwise the tap arms the deferred single click.
        const quickTap =
          !tapTouchActivated.value &&
          !tapTouchMulti.value &&
          !isDragging.value &&
          now - tapTouchDownAt.value <= TAP_MAX_DURATION_IN_MS;
        const withinDoubleWindow =
          now - lastTapLiftAt.value < DOUBLE_TAP_WINDOW_MS;
        if (quickTap && withinDoubleWindow) {
          runOnJS(sendDoubleTap)();
          // don't let a third quick tap chain into another double
          lastTapLiftAt.value = 0;
        } else if (quickTap) {
          lastTapped.value = now;
          runOnJS(setLastTappedInRef)(now);
          runOnJS(setPendingLeftClick)(true);
          lastTapLiftAt.value = now;
        }
      }
    })
    .onStart(() => {
      // fresh gesture: deltas are measured from here
      prevTX.value = 0;
      prevTY.value = 0;
      tryEngageDrag();
    })
    .onUpdate(e => {
      tapTouchActivated.value = true;
      tryEngageDrag();
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
    })
    .onFinalize(() => {
      // a cancelled pan (e.g. the two-finger pan won the inner race) can
      // miss the matching touchesUp — never let the counter strand > 0
      tapTouchCount.value = 0;
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

  // No tap recognizers on iOS — they stay possible during a follow-up drag
  // and block the pan, which is what broke tap-then-drag. Taps and
  // double-taps are detected from the pan's raw touch stream instead (see
  // dragGesture.onTouchesUp).
  const composed = Gesture.Race(dragGesture, dragGestureScroll);

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
  const keyboardModalRef = useRef<BottomSheetModalType>(null);

  // iOS needs no manual clearing — textInputValueProps pins `value` to
  // keep the hidden input empty.
  const handleKeyPress = (event: {nativeEvent: {key: string}}) => {
    sendKey(event.nativeEvent.key);
  };

  const focusToggle = () => {
    keyboardModalRef?.current?.dismiss();
    setShowTextInput(p => !p);
  };

  // autoFocus is unreliable when the input remounts on iOS (toggle
  // off/on), and a focus request made while the keyboard modal is
  // dismissing gets dropped — focus explicitly once the input is mounted
  // and retry shortly after to cover the dismissal animation.
  useEffect(() => {
    if (!showTextInput || status !== 'Connected') {
      return;
    }
    textInputRef.current?.focus();
    const retryTimer = setTimeout(() => textInputRef.current?.focus(), 150);
    return () => clearTimeout(retryTimer);
  }, [showTextInput, status]);

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
                onPress={() => setDeckVisible(true)}>
                <MaterialIcons
                  name="dashboard"
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
      <DeckModal visible={deckVisible} onClose={() => setDeckVisible(false)} />
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
    // A display:none input cannot become first responder on iOS, so the
    // keyboard would never present. Keep it laid out but invisible: 1pt,
    // fully transparent, out of the flow.
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
});
