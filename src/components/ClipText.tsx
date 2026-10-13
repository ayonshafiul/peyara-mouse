import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import colors from '../constants/colors';
import AppButton from './AppButton';
import Clipboard from '@react-native-clipboard/clipboard';

interface ClipTextProps {
  sendText: (text: string) => void;
  receivedText: string;
  onFocus?: () => void;
  onCopied?: () => void;
  onClearReceived?: () => void;
}

export default function ClipText({sendText, receivedText, onFocus, onCopied, onClearReceived}: ClipTextProps) {
  const [text, setText] = useState('');
  const [copyBtnText, setCopyBtnText] = useState('Copy to Clipboard');
  const inputRef = useRef<any>(null);

  useEffect(() => {
    setText(receivedText);
  }, [receivedText]);

  const copyToClipboard = () => {
    if (text) {
      Clipboard.setString(text);
      setCopyBtnText('Copied!');
      setTimeout(() => {
        setCopyBtnText('Copy to Clipboard');
      }, 1200);
      // drop the received text so it doesn't repopulate the box
      onClearReceived?.();
      // close the modal so the user lands back on the touchpad
      onCopied?.();
    }
  };

  const clearText = () => {
    setText('');
    // drop the received text so it doesn't repopulate the box
    onClearReceived?.();
    // keep focus so the user can keep typing; the keyboard stays open
    inputRef.current?.focus();
  };

  const handleSend = () => {
    // avoid emitting empty clipboard payloads to the PC
    if (text.trim().length === 0) {
      return;
    }
    sendText(text);
    setText('');
    // keep focus so the user can keep typing; the keyboard stays open
    inputRef.current?.focus();
  };

  return (
    <>
      <Text style={styles.label}>Send / Receive from PC</Text>
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder="Paste or Type here to send to PC"
        placeholderTextColor={colors.WHITE}
        style={styles.input}
        multiline
        autoFocus
        numberOfLines={3}
        textAlignVertical="top"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
        keyboardAppearance="light"
        returnKeyType="send"
        enablesReturnKeyAutomatically
        blurOnSubmit={false}
        // Disable Android's landscape fullscreen keyboard (extract UI):
        // pressing send inside it crashes the app. With this off the
        // keyboard overlays the modal instead.
        disableFullscreenUI
        selectionColor={colors.PRIM_ACCENT}
        cursorColor={colors.PRIM_ACCENT}
        onFocus={onFocus}
        onSubmitEditing={handleSend}
      />
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.rowBtn} onPress={copyToClipboard}>
          <Text style={styles.rowBtnText}>{copyBtnText}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rowBtn} onPress={clearText}>
          <Text style={styles.rowBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>
      <AppButton text={'Send to pc'} onPress={handleSend} />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.PRIM_ACCENT,
    backgroundColor: colors.PRIM_BG,
    color: colors.WHITE,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    padding: 16,
    minHeight: 96,
    fontFamily: 'Raleway-Regular',
    fontSize: 12,
  },
  label: {
    marginHorizontal: 16,
    fontFamily: 'Raleway-Regular',
    color: colors.WHITE,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  rowBtn: {
    flex: 1,
    backgroundColor: colors.TOUCHPAD,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  rowBtnText: {
    fontFamily: 'Raleway-Regular',
    color: colors.WHITE,
  },
});
