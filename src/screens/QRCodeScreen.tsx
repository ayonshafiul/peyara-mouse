import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, StyleSheet, Text, View, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Camera, useCameraPermission} from 'react-native-vision-camera';
import {
  useBarcodeScannerOutput,
  type Barcode,
} from 'react-native-vision-camera-barcode-scanner';
import colors from '../constants/colors';
import {addServer} from '../utils/servers';
import AppButton from '../components/AppButton';
import QrCodeRectangleIcon from '../../assets/svg/qr-code-rectangle.svg';
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
      const {error, errorTitle} = await addServer(data);
      setLoading(false);
      if (error) {
        Alert.alert('Scan failed', errorTitle);
        setScanned(true);
        handlingRef.current = false;
      } else {
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
          <>
            <Camera
              style={styles.barcodeContainer}
              device="back"
              isActive={active}
              outputs={[barcodeOutput]}
              onError={onError}
            />
            <QrCodeRectangleIcon style={styles.qrCode} />
          </>
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
    position: 'relative',
    width: 320,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCode: {
    position: 'absolute',
    top: 15,
    left: 15,
    zIndex: -1,
    width: 280,
    height: 280,
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
});
