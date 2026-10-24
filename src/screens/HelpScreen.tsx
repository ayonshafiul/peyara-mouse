import {FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text, Platform, Dimensions} from 'react-native';
import React, {useCallback, useRef} from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import colors from '../constants/colors';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {TouchpadStackParamList} from '../navigation/TouchpadNavigator';
import FingerIcon from '../../assets/svg/finger.svg';
import CursorIcon from '../../assets/svg/cursor.svg';
import SingleTapIcon from '../../assets/svg/single-tap.svg';
import DoubleTapIcon from '../../assets/svg/double-tap.svg';
import TwoFingerScrollIcon from '../../assets/svg/two-finger-scroll.svg';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const WIDTH = Dimensions.get('window').width;

const styles = StyleSheet.create({
  containerSafe: {
    flex: 1,
    backgroundColor: colors.PRIM_BG,
  },
  stepContainer: {
    width: WIDTH,
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 48,
    paddingBottom: Platform.OS === 'ios' ? 80 : 20,
  },
  touchpad: {
    width: 200,
    height: 200,
    margin: 16,
    borderRadius: 8,
    backgroundColor: colors.TOUCHPAD,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeTop: {
    position: 'absolute',
    top: 10,
    left: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollbar: {
    width: 5,
    height: 40,
    borderRadius: 5,
    backgroundColor: colors.WHITE,
    position: 'absolute',
    right: 4,
    justifyContent: 'center',
    alignContent: 'center',
  },
  dotContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotRed: {
    backgroundColor: 'red',
  },
  dotGreen: {
    backgroundColor: 'green',
  },
  dotYellow: {
    backgroundColor: 'yellow',
  },
  label: {
    fontFamily: 'Raleway-Bold',
    color: colors.WHITE,
    fontSize: 18,
    textAlign: 'center',
    marginHorizontal: 24,
  },
  nextButton: {
    width: '60%',
    height: 40,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: colors.PRIM_ACCENT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    fontFamily: 'Raleway-Regular',
    color: colors.PRIM_BG,
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
});

const duration = 2000;

function Window({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <Animated.View style={[styles.touchpad, style]}>
      <View style={styles.dotContainer}>
        <View style={[styles.dot, styles.dotRed]} />
        <View style={[styles.dot, styles.dotYellow]} />
        <View style={[styles.dot, styles.dotGreen]} />
      </View>
      {children}
    </Animated.View>
  );
}

function MoveCursor() {
  const tX = useSharedValue(50);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{translateX: tX.value}],
  }));

  React.useEffect(() => {
    tX.value = withRepeat(
      withTiming(-50, {
        duration,
      }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <Window>
        <Animated.View style={animStyle}>
          <CursorIcon />
        </Animated.View>
      </Window>
      <View style={styles.touchpad}>
        <Animated.View style={animStyle}>
          <FingerIcon />
        </Animated.View>
      </View>
    </>
  );
}

function TapOnce() {
  return (
    <>
      <Window>
        <CursorIcon />
      </Window>
      <View style={styles.touchpad}>
        <SingleTapIcon />
      </View>
    </>
  );
}

function TapTwice() {
  return (
    <>
      <Window>
        <CursorIcon />
      </Window>
      <View style={styles.touchpad}>
        <DoubleTapIcon />
      </View>
    </>
  );
}

function TwoFingerScroll() {
  const t = useSharedValue(50);

  const moveVertically = useAnimatedStyle(() => ({
    transform: [{translateY: t.value}],
  }));

  React.useEffect(() => {
    t.value = withRepeat(
      withTiming(-50, {
        duration,
      }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <Window>
        <Animated.View style={[styles.scrollbar, moveVertically]} />
        <CursorIcon />
      </Window>
      <View style={styles.touchpad}>
        <Animated.View style={moveVertically}>
          <TwoFingerScrollIcon />
        </Animated.View>
      </View>
    </>
  );
}

function TapAndMoveToWindowDrag() {
  const t = useSharedValue(50);

  const moveHorizontally = useAnimatedStyle(() => ({
    transform: [{translateX: t.value}],
  }));

  React.useEffect(() => {
    t.value = withRepeat(
      withTiming(-50, {
        duration,
      }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <Window style={moveHorizontally}>
        <View style={styles.placeTop}>
          <CursorIcon />
        </View>
      </Window>
      <View style={styles.touchpad}>
        <Animated.View style={moveHorizontally}>
          <SingleTapIcon />
        </Animated.View>
      </View>
    </>
  );
}

function ShowKeyboard() {
  return <MaterialIcons name="keyboard-hide" size={48} color={colors.WHITE} />;
}

function OpenDeck() {
  return (
    <View style={deckHelpStyles.row}>
      <View style={deckHelpStyles.dimBtn}>
        <MaterialIcons
          name="keyboard-hide"
          size={24}
          color={colors.WHITE}
        />
      </View>
      <View style={deckHelpStyles.dimBtn}>
        <MaterialIcons
          name="control-camera"
          size={24}
          color={colors.WHITE}
        />
      </View>
      <View style={deckHelpStyles.activeBtn}>
        <MaterialIcons
          name="dashboard"
          size={30}
          color={colors.PRIM_BG}
        />
      </View>
      <View style={deckHelpStyles.dimBtn}>
        <MaterialIcons name="help" size={24} color={colors.WHITE} />
      </View>
    </View>
  );
}

function SelectDeckApp() {
  return (
    <View style={deckHelpStyles.row}>
      <View style={deckHelpStyles.activeBtn}>
        <MaterialIcons name="apps" size={30} color={colors.PRIM_BG} />
      </View>
      <MaterialIcons name="autorenew" size={32} color={colors.WHITE} />
      <View style={deckHelpStyles.dimBtn}>
        <MaterialIcons name="desktop-windows" size={24} color={colors.WHITE} />
      </View>
    </View>
  );
}

function ImportAndSelect() {
  const picked = [true, true, false, true, false, true];
  return (
    <View style={deckHelpStyles.grid}>
      {picked.map((sel, i) => (
        <View
          key={i}
          style={[deckHelpStyles.tile, sel && deckHelpStyles.tileSelected]}>
          <MaterialIcons
            name="bolt"
            size={22}
            color={sel ? colors.PRIM_ACCENT : colors.WHITE}
          />
          {sel && (
            <View style={deckHelpStyles.check}>
              <MaterialIcons name="check" size={14} color={colors.PRIM_BG} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const deckHelpStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dimBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.TOUCHPAD,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  activeBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.PRIM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 250,
  },
  tile: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.TOUCHPAD,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tileSelected: {
    borderColor: colors.PRIM_ACCENT,
  },
  check: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.PRIM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function ShowControls() {
  return <MaterialIcons name="control-camera" size={48} color={colors.WHITE} />;
}

function SendClipboard() {
  return <MaterialIcons name="content-paste" size={48} color={colors.WHITE} />;
}

function AdjustTouchSettings() {
  return (
    <View style={settingsStyles.container}>
      <View style={settingsStyles.row}>
        <MaterialIcons name="speed" size={32} color={colors.WHITE} />
        <Text style={settingsStyles.rowText}>
          Touch speed (Touchpad Sensitivity)
        </Text>
      </View>
      <View style={settingsStyles.row}>
        <MaterialIcons name="swap-vert" size={32} color={colors.WHITE} />
        <Text style={settingsStyles.rowText}>
          Scroll speed (Scroll Sensitivity)
        </Text>
      </View>
      <View style={settingsStyles.row}>
        <MaterialIcons name="timer" size={32} color={colors.WHITE} />
        <Text style={settingsStyles.rowText}>
          Touch response rate (Response Rate)
        </Text>
      </View>
    </View>
  );
}

const settingsStyles = StyleSheet.create({
  container: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    color: colors.WHITE,
    fontSize: 15,
    fontFamily: 'Raleway-Regular',
  },
});

const steps = [
  {
    label: 'Press the dashboard button in the top row to open the Stream Deck',
    component: <OpenDeck />,
  },
  {
    label:
      'Pick your app with the select button, or let the deck auto-follow the focused desktop app',
    component: <SelectDeckApp />,
  },
  {
    label: 'Tap Import to fetch actions, tick the ones you want, then Save',
    component: <ImportAndSelect />,
  },
  {
    label: 'Move the desktop cursor with your finger',
    component: <MoveCursor />,
  },
  {
    label: 'Tap once for click',
    component: <TapOnce />,
  },
  {
    label: 'Tap twice for double click',
    component: <TapTwice />,
  },
  {
    label: 'Two Finger Drag to scroll',
    component: <TwoFingerScroll />,
  },
  {
    label: 'Tap and move to drag windows around',
    component: <TapAndMoveToWindowDrag />,
  },
  {
    label: 'Press to toggle keyboard',
    component: <ShowKeyboard />,
  },
  {
    label: 'Press to show more controls',
    component: <ShowControls />,
  },
  {
    label: 'Send and receive clipboard text with your PC',
    component: <SendClipboard />,
  },
  {
    label: 'Adjust touch speed, scroll speed and response rate from Settings',
    component: <AdjustTouchSettings />,
  },
];

type Props = NativeStackScreenProps<TouchpadStackParamList, 'TouchpadHelp'>;

export default function HelpScreen({navigation}: Props) {
  const flatListRef = useRef<FlatList>(null);

  const goToNextStep = async (index: number) => {
    if (index < steps.length) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
      });
    } else if (navigation.canGoBack()) {
      // Return to the existing TouchpadScreen instance so the live socket
      // connection and its params are left untouched. Re-navigating with
      // fresh (empty) params risks dropping the connection and blanking
      // the touchpad, which only renders when status === 'Connected'.
      navigation.goBack();
    } else {
      navigation.navigate('TouchpadScreen', {});
    }
  };

  const StepsCard = useCallback(
    ({item, index}: {item: (typeof steps)[number]; index: number}) => {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.label}>{item.label}</Text>
          {item.component}
          <TouchableOpacity
            onPress={() => goToNextStep(index + 1)}
            style={[styles.nextButton]}
            activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>
              {index === steps.length - 1 ? 'Ok' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <SafeAreaView style={[styles.containerSafe, stylesX.container]}>
      <FlatList
        ref={flatListRef}
        data={steps}
        renderItem={StepsCard}
        keyExtractor={(_item, index) => String(index)}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
      />
    </SafeAreaView>
  );
}

const stylesX = StyleSheet.create({
  container: {
    paddingBottom: 60,
  },
});
