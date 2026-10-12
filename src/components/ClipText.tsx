import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import colors from '../constants/colors';
import AppButton from './AppButton';
import Clipboard from '@react-native-clipboard/clipboard';
import {BottomSheetTextInput} from '@gorhom/bottom-sheet';

interface ClipTextProps {
  sendText: (text: string) => void;
  receivedText: string;
  onFocus?: () => void;
}

export default function ClipText({sendText, receivedText, onFocus}: ClipTextProps) {
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
    }
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
      <View style={styles.labelWrapper}>
        <Text style={styles.text}>Send / Receive from PC</Text>
        <TouchableOpacity onPress={copyToClipboard}>
          <Text style={[styles.text, {color: colors.PRIM_ACCENT}]}>
            {copyBtnText}
          </Text>
        </TouchableOpacity>
      </View>
      <BottomSheetTextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder="Paste or Type here to send to PC"
        placeholderTextColor={colors.WHITE}
        style={styles.input}
        multiline
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
        selectionColor={colors.PRIM_ACCENT}
        cursorColor={colors.PRIM_ACCENT}
        onFocus={onFocus}
        onSubmitEditing={handleSend}
      />
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
  text: {
    marginHorizontal: 16,
    fontFamily: 'Raleway-Regular',
    color: colors.WHITE,
  },
  labelWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
