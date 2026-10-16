import React, {useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import Orientation from 'react-native-orientation-locker';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/RootNavigator';
import colors from '../constants/colors';
import AppButton from '../components/AppButton';
import {pairManually} from '../utils/servers';
import {plog, plogError} from '../utils/logger';

type Props = NativeStackScreenProps<RootStackParamList, 'PairingCode'>;

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'characters';
  hint: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#888"
        style={styles.input}
        autoCapitalize={autoCapitalize}
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
        selectionColor={colors.PRIM_ACCENT}
      />
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

export default function PairingCodeScreen({navigation}: Props) {
  const [url, setUrl] = useState('https://');
  const [fingerprint, setFingerprint] = useState('');
  const [pair, setPair] = useState('');
  const [host, setHost] = useState('');
  const [formError, setFormError] = useState('');
  const [pairing, setPairing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      Orientation.lockToPortrait();
    }, []),
  );

  const onPair = async () => {
    const cleanUrl = url.trim();
    const cleanFp = fingerprint.trim().toLowerCase();
    const cleanPair = pair.trim().toLowerCase();
    if (!cleanUrl.toLowerCase().startsWith('https://') || cleanUrl.length <= 8) {
      setFormError('Server URL must look like https://192.168.1.5:1313');
      return;
    }
    if (!/^[0-9a-f]{64}$/.test(cleanFp)) {
      setFormError('Fingerprint must be 64 hex characters');
      return;
    }
    if (!/^[0-9a-f]{8}$/.test(cleanPair)) {
      setFormError('Pairing code must be 8 hex characters');
      return;
    }
    setFormError('');
    setPairing(true);
    plog('QR', `manual pairing url=${cleanUrl}`);
    const {error, errorTitle} = await pairManually({
      host: host.trim() || undefined,
      url: cleanUrl,
      fingerprint: cleanFp,
      pair: cleanPair,
    });
    setPairing(false);
    if (error) {
      plogError('QR', `manual pairing failed: ${errorTitle}`);
      setFormError(errorTitle);
    } else {
      plog('QR', 'manual pairing saved');
      navigation.navigate('Tabs', {screen: 'Home'});
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Enter pairing code</Text>
        <Text style={styles.subtitle}>
          Find the server URL, fingerprint and pairing code on the Peyara
          desktop app screen.
        </Text>
        <Field
          label="Server URL"
          value={url}
          onChangeText={setUrl}
          placeholder="https://192.168.1.5:1313"
          hint="Shown on the desktop app, starts with https://"
        />
        <Field
          label="Fingerprint"
          value={fingerprint}
          onChangeText={setFingerprint}
          placeholder="64 hex characters"
          hint="Shown on the desktop app, has a Copy button"
        />
        <Field
          label="Pairing code"
          value={pair}
          onChangeText={setPair}
          placeholder="8 hex characters"
          autoCapitalize="characters"
          hint="Shown next to the QR code on the desktop app"
        />
        <Field
          label="Name (optional)"
          value={host}
          onChangeText={setHost}
          placeholder="My PC"
          hint="Display name for the servers list"
        />
        {formError !== '' && <Text style={styles.error}>{formError}</Text>}
        {pairing ? (
          <ActivityIndicator size="large" color={colors.PRIM_ACCENT} />
        ) : (
          <AppButton text="Pair & Save" onPress={onPair} />
        )}
        <AppButton text="Cancel" onPress={() => navigation.goBack()} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.PRIM_BG,
  },
  content: {
    padding: 24,
    gap: 4,
  },
  title: {
    color: colors.WHITE,
    fontSize: 20,
    fontFamily: 'Raleway-Bold',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: 'Raleway-Regular',
    textAlign: 'center',
    marginVertical: 12,
  },
  field: {
    marginVertical: 8,
  },
  label: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: 'Raleway-Bold',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.PRIM_ACCENT,
    backgroundColor: colors.TOUCHPAD,
    color: colors.WHITE,
    borderRadius: 10,
    padding: 12,
    fontFamily: 'Raleway-Regular',
    fontSize: 14,
  },
  hint: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Raleway-Regular',
    marginTop: 4,
  },
  error: {
    color: colors.RED,
    fontSize: 14,
    fontFamily: 'Raleway-Regular',
    textAlign: 'center',
    marginVertical: 8,
  },
});
