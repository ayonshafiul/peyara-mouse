import {StyleSheet, TouchableOpacity, View} from 'react-native';
import React, {useEffect} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {type AnimatedStyle} from 'react-native-reanimated';
import {
  GestureDetector,
  type GestureType,
  type LegacyComposedGesture,
} from 'react-native-gesture-handler';
import type {ViewStyle} from 'react-native';
import colors from '../constants/colors';
import {useGlobalStore} from '../store/useGlobalStore';
import RoundKey from './RoundKey';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type DetectorGesture = LegacyComposedGesture | GestureType;

interface LandscapeTouchpadViewProps {
  composed: DetectorGesture;
  scrollGesture: DetectorGesture;
  scrollWheelStyles: AnimatedStyle<ViewStyle>;
  sendLeftClick: () => void;
  sendRightClick: () => void;
  onShowControls: () => void;
}

export default function LandscapeTouchpadView({
  composed,
  scrollGesture,
  scrollWheelStyles,
  sendLeftClick,
  sendRightClick,
  onShowControls,
}: LandscapeTouchpadViewProps) {
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
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
        },
      ]}>
      <Animated.View style={styles.touchpadContainer}>
        <GestureDetector gesture={composed}>
          <Animated.View style={styles.touchpad} />
        </GestureDetector>

        <Animated.View style={styles.scrollWheelContainer}>
          <Animated.View style={styles.scrollWheelTrack}>
            <GestureDetector gesture={scrollGesture}>
              <Animated.View
                style={[styles.scrollWheelThumb, scrollWheelStyles]}>
                <View style={styles.thumbLine} />
                <View style={styles.thumbLine} />
                <View style={styles.thumbLine} />
              </Animated.View>
            </GestureDetector>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Mouse Buttons */}
      <View style={styles.clicksWrapper}>
        <TouchableOpacity style={styles.clickBtn} onPress={sendLeftClick} />
        <TouchableOpacity style={styles.clickBtn} onPress={sendRightClick} />
      </View>

      {/* Settings Key */}
      <RoundKey containerStyle={styles.settings} onPress={onShowControls}>
        <MaterialIcons name={'settings'} size={24} color={colors.WHITE} />
      </RoundKey>
    </View>
  );
}

const styles = StyleSheet.create({
  landscapeRoot: {
    flex: 1,
    width: '100%',
  },
  touchpadContainer: {
    position: 'absolute',
    top: 8,
    left: 40,
    right: 8,
    bottom: 8,
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  touchpad: {
    width: '94%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: colors.TOUCHPAD,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  scrollWheelContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '6%',
    height: '100%',
  },
  scrollWheelTrack: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 1,
    backgroundColor: colors.WHITE,
    height: '100%',
    left: 4,
    opacity: 0.4,
  },
  scrollWheelThumb: {
    width: 20,
    height: 60,
    backgroundColor: colors.WHITE,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbLine: {
    width: 12,
    height: 2,
    backgroundColor: colors.PRIM_BG,
    marginVertical: 2,
  },
  clicksWrapper: {
    position: 'absolute',
    top: 8,
    left: 8,
    bottom: 8,
    width: 24,
    justifyContent: 'space-between',
  },
  clickBtn: {
    height: '49.6%',
    borderRadius: 4,
    backgroundColor: colors.WHITE,
    opacity: 0.1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settings: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    opacity: 0.6,
    width: 34,
    height: 34,
  },
});
