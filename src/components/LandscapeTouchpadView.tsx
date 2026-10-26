import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React, {useEffect} from 'react';
import Animated, {type AnimatedStyle} from 'react-native-reanimated';
import {
  GestureDetector,
  type GestureType,
  type LegacyComposedGesture,
} from 'react-native-gesture-handler';
import type {ViewStyle} from 'react-native';
import colors from '../constants/colors';
import {useGlobalStore} from '../store/useGlobalStore';

type DetectorGesture = LegacyComposedGesture | GestureType;

interface LandscapeTouchpadViewProps {
  composed: DetectorGesture;
  scrollGesture: DetectorGesture;
  scrollWheelStyles: AnimatedStyle<ViewStyle>;
  sendLeftClick: () => void;
  sendRightClick: () => void;
  onTouchpadLayout?: (width: number, height: number) => void;
}

export default function LandscapeTouchpadView({
  composed,
  scrollGesture,
  scrollWheelStyles,
  sendLeftClick,
  sendRightClick,
  onTouchpadLayout,
}: LandscapeTouchpadViewProps) {
  const setShowBottomBar = useGlobalStore(state => state.setShowBottomBar);

  useEffect(() => {
    setShowBottomBar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.landscapeRoot}>
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

        <View style={styles.touchpadWrapper}>
          <GestureDetector gesture={composed}>
            <Animated.View
              style={styles.touchpad}
              onLayout={e =>
                onTouchpadLayout?.(
                  e.nativeEvent.layout.width,
                  e.nativeEvent.layout.height,
                )
              }
            />
          </GestureDetector>
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
});
