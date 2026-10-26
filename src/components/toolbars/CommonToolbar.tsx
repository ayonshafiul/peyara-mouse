import {StyleSheet, View} from 'react-native';
import React from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import colors from '../../constants/colors';
import RoundKey from '../RoundKey';

export type ControlView = 'touchpad' | 'deck';

interface CommonToolbarProps {
  activeView: ControlView;
  isLandscape: boolean;
  onSelectTouchpad: () => void;
  onSelectDeck: () => void;
  onToggleKeyboardInput: () => void;
  onShowKeyboardModal: () => void;
  onShowClipboard: () => void;
  onToggleOrientation: () => void;
  onOpenHelp: () => void;
  onDisconnect: () => void;
}

export default function CommonToolbar({
  activeView,
  isLandscape,
  onSelectTouchpad,
  onSelectDeck,
  onToggleKeyboardInput,
  onShowKeyboardModal,
  onShowClipboard,
  onToggleOrientation,
  onOpenHelp,
  onDisconnect,
}: CommonToolbarProps) {
  const iconSize = isLandscape ? 24 : 20;
  return (
    <View style={styles.keysContainer}>
      <RoundKey
        containerStyle={[
          styles.roundKey,
          !isLandscape && styles.roundKeyPortrait,
          activeView === 'touchpad' && styles.activeKey,
        ]}
        onPress={onSelectTouchpad}>
        <MaterialIcons name="touch-app" size={iconSize} color={colors.WHITE} />
      </RoundKey>
      <RoundKey
        containerStyle={[
          styles.roundKey,
          !isLandscape && styles.roundKeyPortrait,
          activeView === 'deck' && styles.activeKey,
        ]}
        onPress={onSelectDeck}>
        <MaterialIcons name="dashboard" size={iconSize} color={colors.WHITE} />
      </RoundKey>
      <RoundKey
        containerStyle={[styles.roundKey, !isLandscape && styles.roundKeyPortrait]}
        onPress={onToggleKeyboardInput}>
        <MaterialIcons
          name="keyboard-hide"
          size={iconSize}
          color={colors.WHITE}
        />
      </RoundKey>
      <RoundKey
        containerStyle={[styles.roundKey, !isLandscape && styles.roundKeyPortrait]}
        onPress={onShowKeyboardModal}>
        <MaterialIcons
          name="control-camera"
          size={iconSize}
          color={colors.WHITE}
        />
      </RoundKey>
      <RoundKey
        containerStyle={[styles.roundKey, !isLandscape && styles.roundKeyPortrait]}
        onPress={onShowClipboard}>
        <MaterialIcons
          name="content-paste"
          size={iconSize}
          color={colors.WHITE}
        />
      </RoundKey>
      <RoundKey
        containerStyle={[styles.roundKey, !isLandscape && styles.roundKeyPortrait]}
        onPress={onToggleOrientation}>
        <MaterialIcons
          name={isLandscape ? 'stay-primary-portrait' : 'stay-primary-landscape'}
          size={iconSize}
          color={colors.WHITE}
        />
      </RoundKey>
      <RoundKey
        containerStyle={[styles.roundKey, !isLandscape && styles.roundKeyPortrait]}
        onPress={onOpenHelp}>
        <MaterialIcons name="help" size={iconSize} color={colors.WHITE} />
      </RoundKey>
      <RoundKey
        containerStyle={[styles.roundKey, !isLandscape && styles.roundKeyPortrait]}
        onPress={onDisconnect}>
        <MaterialIcons name="close" size={iconSize} color={colors.WHITE} />
      </RoundKey>
    </View>
  );
}

const styles = StyleSheet.create({
  keysContainer: {
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
  roundKeyPortrait: {
    width: 30,
    height: 30,
    marginHorizontal: 4,
  },
  activeKey: {
    backgroundColor: colors.PRIM_ACCENT,
  },
});
