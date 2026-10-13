import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
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
          paddingLeft: Math.max(insets.left, 8),
          paddingRight: Math.max(insets.right, 8),
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}>
      <View style={styles.row}>
        {/* Mouse Buttons */}
        <View style={styles.clicksColumn}>
          <TouchableOpacity style={styles.clickBtn} onPress={sendLeftClick}>
            <Text style={styles.clickBtnText}>Left</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clickBtn} onPress={sendRightClick}>
            <Text style={styles.clickBtnText}>Right</Text>
          </TouchableOpacity>
        </View>

        {/* Touchpad with the settings gear in its bottom-right corner */}
        <View style={styles.touchpadWrapper}>
          <GestureDetector gesture={composed}>
            <Animated.View style={styles.touchpad} />
          </GestureDetector>
          {/* Re-show the top controls (they auto-hide in landscape) */}
          <RoundKey containerStyle={styles.settings} onPress={onShowControls}>
            <MaterialIcons name={'settings'} size={24} color={colors.WHITE} />
          </RoundKey>
        </View>

        {/* Scroll Wheel */}
        <View style={styles.scrollWheelColumn}>
          <View style={styles.scrollWheelTrack}>
            <GestureDetector gesture={scrollGesture}>
              <Animated.View
                style={[styles.scrollWheelThumb, scrollWheelStyles]}>
                <View style={styles.thumbLine} />
                <View style={styles.thumbLine} />
                <View style={styles.thumbLine} />
              </Animated.View>
            </GestureDetector>
          </View>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  landscapeRoot: {
    flex: 1,
    width: '100%',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  clicksColumn: {
    width: 64,
    justifyContent: 'space-between',
    gap: 8,
  },
  clickBtn: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.TOUCHPAD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clickBtnText: {
    fontSize: 12,
    fontFamily: 'Raleway-Regular',
    color: colors.WHITE,
  },
  touchpadWrapper: {
    flex: 1,
    marginHorizontal: 8,
  },
  touchpad: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.TOUCHPAD,
  },
  scrollWheelColumn: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollWheelTrack: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.WHITE,
    opacity: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollWheelThumb: {
    width: 28,
    height: 60,
    backgroundColor: colors.WHITE,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbLine: {
    width: 14,
    height: 2,
    backgroundColor: colors.PRIM_BG,
    marginVertical: 2,
  },
  settings: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    margin: 0,
    opacity: 0.6,
    width: 34,
    height: 34,
  },
});
