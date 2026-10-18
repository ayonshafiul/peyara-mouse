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
import {
  BarcodeScanner,
  CameraView,
  type BarcodeResult,
} from '@pushpendersingh/react-native-scanner';
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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const handlingRef = useRef(false);

  const checkPermission = useCallback(async () => {
    try {
      const granted = await BarcodeScanner.hasCameraPermission();
      setHasPermission(granted);
    } catch (error) {
      plogError(
        'QR',
        `hasCameraPermission failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      setHasPermission(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const granted = await BarcodeScanner.requestCameraPermission();
      setHasPermission(granted);
    } catch (error) {
      plogError(
        'QR',
        `requestCameraPermission failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    Orientation.lockToPortrait();
    checkPermission();
  }, [checkPermission]);

  const handleBarCodeScanned = useCallback(
    async (data: string) => {
      if (handlingRef.current) {
        return;
      }
      handlingRef.current = true;
      setLoading(true);
      try {
        await BarcodeScanner.stopScanning();
      } catch (err) {
        plogError(
          'QR',
          `stopScanning failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
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

  const onBarcodesDetected = useCallback(
    (barcodes: BarcodeResult[]) => {
      const value = barcodes[0]?.data;
      if (value) {
        handleBarCodeScanned(value);
      }
    },
    [handleBarCodeScanned],
  );

  useEffect(() => {
    if (!hasPermission) {
      return;
    }
    let cancelled = false;
    BarcodeScanner.startScanning((barcodes: BarcodeResult[]) => {
      if (!cancelled) {
        onBarcodesDetected(barcodes);
      }
    }).catch(error => {
      if (!cancelled) {
        plogError(
          'QR',
          `startScanning failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
    return () => {
      cancelled = true;
      BarcodeScanner.stopScanning().catch(() => undefined);
      BarcodeScanner.releaseCamera().catch(() => undefined);
    };
  }, [hasPermission, onBarcodesDetected]);

  const openServerDownloadLink = useCallback(() => {
    Linking.openURL(SERVER_DOWNLOAD_LINK);
  }, []);

  const copyServerDownloadLink = useCallback(() => {
    Clipboard.setString(SERVER_DOWNLOAD_LINK);
    Alert.alert('Link Copied');
  }, []);

  const scanAgain = useCallback(() => {
    setScanned(false);
    handlingRef.current = false;
    BarcodeScanner.startScanning((barcodes: BarcodeResult[]) => {
      onBarcodesDetected(barcodes);
    }).catch(error => {
      plogError(
        'QR',
        `startScanning failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }, [onBarcodesDetected]);

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size={'large'} color={colors.PRIM_ACCENT} />
        <Text style={styles.text}>Checking camera permission</Text>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>Camera permission is required to scan</Text>
        <AppButton text={'Grant Permission'} onPress={requestPermission} />
        <AppButton text={'Cancel'} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        {!scanned && !loading && (
          <CameraView style={styles.barcodeContainer} />
        )}
        {loading && (
          <ActivityIndicator size={'large'} color={colors.PRIM_ACCENT} />
        )}
        {scanned && !loading && (
          <Text style={styles.text}>Scan failed. Try again.</Text>
        )}
      </View>
      {scanned && !loading && (
        <AppButton text={'Scan Again'} onPress={scanAgain} />
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
