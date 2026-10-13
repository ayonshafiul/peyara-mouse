import React from 'react';
import {Modal, Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import colors from '../constants/colors';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import ClipText from '../components/ClipText';

interface ClipboardModalProps {
  visible: boolean;
  sendText: (text: string) => void;
  receivedText: string;
  onClose: () => void;
  onClearReceived: () => void;
}

export default function ClipboardModal({
  visible,
  sendText,
  receivedText,
  onClose,
  onClearReceived,
}: ClipboardModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close clipboard"
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Clipboard</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Close clipboard">
              <MaterialIcons
                name="close"
                size={24}
                color={colors.WHITE}
              />
            </TouchableOpacity>
          </View>
          <KeyboardAwareScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled">
            <ClipText
              sendText={sendText}
              receivedText={receivedText}
              onCopied={onClose}
              onClearReceived={onClearReceived}
            />
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.PRIM_BG,
    borderRadius: 16,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    color: colors.WHITE,
    fontSize: 16,
    fontFamily: 'Raleway-Bold',
  },
  scrollContainer: {
    backgroundColor: colors.PRIM_BG,
  },
  contentContainer: {
    paddingBottom: 8,
  },
});
