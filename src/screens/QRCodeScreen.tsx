import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Camera, useCameraPermission} from 'react-native-vision-camera';
import {
  useBarcodeScannerOutput,
  type Barcode,
} from 'react-native-vision-camera-barcode-scanner';
import Clipboard from '@react-native-clipboard/clipboard';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import colors from '../constants/colors';
import {SERVER_DOWNLOAD_LINK} from '../constants/settings';
import {addServer} from '../utils/servers';
import {plog, plogError} from '../utils/logger';
import AppButton from '../components/AppButton';
import Orientation from 'react-native-orientation-locker';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'QRCode'>;

export default function QRCodeScreen({navigation}: Props) {
  const {hasPermission, requestPermission} = useCameraPermission();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(true);
  const handlingRef = useRef(false);

  useEffect(() => {
    Orientation.lockToPortrait();
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleBarCodeScanned = useCallback(
    async (data: string) => {
      if (handlingRef.current) {
        return;
      }
      handlingRef.current = true;
      setLoading(true);
      setActive(false);
      plog('QR', `scan received len=${data.length}`);
      const {error, errorTitle} = await addServer(data);
      setLoading(false);
      if (error) {
        plogError('QR', `addServer failed: ${errorTitle}`);
        Alert.alert('Scan failed', errorTitle);
        setScanned(true);
        handlingRef.current = false;
      } else {
        plog('QR', 'server saved, going back');
        navigation.goBack();
      }
    },
    [navigation],
  );

  const onBarcodeScanned = useCallback(
    (barcodes: Barcode[]) => {
      const value = barcodes[0]?.rawValue;
      if (value) {
        handleBarCodeScanned(value);
      }
    },
    [handleBarCodeScanned],
  );

  const onError = useCallback((error: Error) => {
    console.error('Barcode scanner error:', error);
  }, []);

  const openServerDownloadLink = useCallback(() => {
    Linking.openURL(SERVER_DOWNLOAD_LINK);
  }, []);

  const copyServerDownloadLink = useCallback(() => {
    Clipboard.setString(SERVER_DOWNLOAD_LINK);
    Alert.alert('Link Copied');
  }, []);

  // NOTE: we intentionally pass device="back" as a string instead of
  // useCameraDevice('back'): the device factory loads asynchronously, and
  // resolving the position natively avoids throwing while it initializes.
  const barcodeOutput = useBarcodeScannerOutput({
    barcodeFormats: ['qr-code'],
    onBarcodeScanned,
    onError,
  });

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>Requesting for camera permission</Text>
        <AppButton text={'Grant Permission'} onPress={requestPermission} />
        <AppButton text={'Cancel'} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        {!scanned && !loading && (
          <Camera
            style={styles.barcodeContainer}
            device="back"
            isActive={active}
            outputs={[barcodeOutput]}
            onError={onError}
          />
        )}
        {loading && (
          <ActivityIndicator size={'large'} color={colors.PRIM_ACCENT} />
        )}
        {scanned && !loading && (
          <Text style={styles.text}>Scan failed. Try again.</Text>
        )}
      </View>
      {scanned && !loading && (
        <AppButton
          text={'Scan Again'}
          onPress={() => {
            setScanned(false);
            setActive(true);
          }}
        />
      )}
      <View style={styles.downloadContainer}>
        <Text style={styles.downloadPrompt}>
          Download the server app on your desktop and open to see the QR code.
        </Text>
        <Text style={styles.linkText} onPress={openServerDownloadLink}>
          {SERVER_DOWNLOAD_LINK}
        </Text>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={copyServerDownloadLink}
          activeOpacity={0.8}>
          <MaterialIcons
            name="content-copy"
            size={16}
            color={colors.PRIM_ACCENT}
          />
          <Text style={styles.copyButtonText}>Copy link</Text>
        </TouchableOpacity>
      </View>
      <AppButton text={'Cancel'} onPress={() => navigation.goBack()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.PRIM_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    width: 320,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeContainer: {
    width: 280,
    height: 280,
  },
  text: {
    color: colors.WHITE,
    marginBottom: 12,
    fontFamily: 'Raleway-Regular',
  },
  downloadContainer: {
    alignItems: 'center',
    marginVertical: 12,
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  downloadPrompt: {
    color: colors.WHITE,
    textAlign: 'center',
    fontFamily: 'Raleway-Regular',
  },
  linkText: {
    color: colors.PRIM_FRONT,
    marginTop: 8,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontFamily: 'Raleway-Regular',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.TOUCHPAD,
  },
  copyButtonText: {
    color: colors.PRIM_ACCENT,
    fontFamily: 'Raleway-Regular',
  },
});
