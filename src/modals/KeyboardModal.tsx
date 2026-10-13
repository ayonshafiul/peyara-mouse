import {Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React, {forwardRef, useMemo, useRef} from 'react';
import colors from '../constants/colors';
import {BottomSheetModal, BottomSheetScrollView} from '@gorhom/bottom-sheet';
import type {BottomSheetModal as BottomSheetModalType} from '@gorhom/bottom-sheet';
import ControlButton from '../components/ControlButton';

interface KeyboardModalProps {
  sendMediaKey: (key: string) => void;
  sendEditKey: (payload: {key: string; modifier: string[]}) => void;
  sendLeftClick: () => void;
  sendRightClick: () => void;
}

function KeyboardModal(
  {
    sendMediaKey,
    sendEditKey,
    sendLeftClick,
    sendRightClick,
  }: KeyboardModalProps,
  ref: React.Ref<BottomSheetModalType>,
) {
  const snapPoints = useMemo(() => ['33%', '60%'], []);
  const scrollViewRef = useRef<any>(null);

  const modifier = Platform.OS === 'ios' ? ['command'] : ['control'];

  return (
    <BottomSheetModal
      ref={ref}
      index={1}
      snapPoints={snapPoints}
        handleStyle={{
          backgroundColor: colors.PRIM_BG,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.WHITE,
        }}
        style={{
          backgroundColor: colors.PRIM_BG,
        }}
        backgroundStyle={{
          backgroundColor: colors.PRIM_BG,
        }}
        enableOverDrag={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize">
        <View style={styles.clicksWrapper}>
          <TouchableOpacity style={styles.clickBtn} onPress={sendLeftClick}>
            <Text style={styles.clickBtnText}>Left Click</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clickBtn} onPress={sendRightClick}>
            <Text style={styles.clickBtnText}>Right Click</Text>
          </TouchableOpacity>
        </View>
        <BottomSheetScrollView
          style={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          ref={scrollViewRef}>
          <View style={styles.contentContainer}>
            <View style={styles.fourKeys}>
              <ControlButton
                onPress={() => sendMediaKey('up')}
                text={'↑'}
                containerStyle={styles.up}
              />
              <ControlButton
                onPress={() => sendMediaKey('down')}
                text={'↓'}
                containerStyle={styles.down}
              />
              <ControlButton
                onPress={() => sendMediaKey('left')}
                text={'←'}
                containerStyle={[styles.left]}
              />
              <ControlButton
                onPress={() => sendMediaKey('right')}
                text={'→'}
                containerStyle={styles.right}
              />
            </View>

            <View style={styles.fourKeys}>
              <ControlButton
                onPress={() => sendMediaKey('audio_vol_up')}
                text={'V+'}
                containerStyle={styles.up}
              />
              <ControlButton
                onPress={() => sendMediaKey('audio_vol_down')}
                text={'V-'}
                containerStyle={styles.down}
              />
              <ControlButton
                onPress={() => sendMediaKey('audio_mute')}
                text={'Mute'}
                containerStyle={[styles.left, {left: -10}]}
              />
              <ControlButton
                onPress={() => sendMediaKey('audio_stop')}
                text={'Stop'}
                containerStyle={[styles.right]}
              />
            </View>

            <View style={styles.fourKeys}>
              <ControlButton
                onPress={() => sendMediaKey('audio_play')}
                text={'Play'}
                containerStyle={styles.up}
                smallVariation
              />
              <ControlButton
                onPress={() => sendMediaKey('audio_pause')}
                text={'Pause'}
                containerStyle={[styles.down]}
                smallVariation
              />
              <ControlButton
                onPress={() => sendMediaKey('audio_prev')}
                text={'Prev'}
                containerStyle={[styles.left]}
                smallVariation
              />
              <ControlButton
                onPress={() => sendMediaKey('audio_next')}
                text={'Next'}
                containerStyle={[styles.right, {left: 124}]}
                smallVariation
              />
            </View>

            <View style={styles.fourKeys}>
              <ControlButton
                onPress={() => sendEditKey({key: 'c', modifier})}
                text={'Copy'}
                containerStyle={styles.up}
                smallVariation
              />
              <ControlButton
                onPress={() => sendEditKey({key: 'v', modifier})}
                text={'Paste'}
                containerStyle={[styles.down]}
                smallVariation
              />
              <ControlButton
                onPress={() => sendEditKey({key: 'a', modifier})}
                text={'All'}
                containerStyle={[styles.left, {left: 20}]}
                smallVariation
              />
              <ControlButton
                onPress={() => sendEditKey({key: 'x', modifier})}
                text={'Cut'}
                containerStyle={[styles.right, {left: 118}]}
                smallVariation
              />
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
  );
}

export default forwardRef(KeyboardModal);

const styles = StyleSheet.create({
  scrollContainer: {
    backgroundColor: colors.PRIM_BG,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  fourKeys: {
    width: 180,
    height: 80,
    position: 'relative',
    marginVertical: 8,
  },
  clicksWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    backgroundColor: colors.PRIM_BG,
  },
  clickBtn: {
    width: '49.6%',
    height: 30,
    borderRadius: 4,
    backgroundColor: colors.TOUCHPAD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clickBtnText: {
    fontFamily: 'Raleway-Thin',
    color: colors.WHITE,
  },
  up: {
    position: 'absolute',
    left: 60,
    top: 0,
  },
  down: {
    position: 'absolute',
    left: 60,
    top: 36,
  },
  left: {
    position: 'absolute',
    left: 10,
    top: 36,
  },
  right: {
    position: 'absolute',
    left: 110,
    top: 36,
  },
});
