import React, {useRef, useCallback, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import colors from '../constants/colors';
import Clipboard from '@react-native-clipboard/clipboard';
import {setBooleanValueFor} from '../utils/storage';
import {
  SERVER_DOWNLOAD_LINK,
  SETTINGS_ONBOARDING_SHOW_FIRST_TIME,
} from '../constants/settings';
import Orientation from 'react-native-orientation-locker';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/RootNavigator';

const WIDTH = Dimensions.get('window').width;
const SERVER_LINK = SERVER_DOWNLOAD_LINK;

function DownloadServer() {
  const openLink = () => {
    Linking.openURL(SERVER_LINK);
  };
  const copyLink = () => {
    Clipboard.setString(SERVER_LINK);
    Alert.alert('Link Copied');
  };
  return (
    <View style={styles.downloadContainer}>
      <Image
        source={require('../../assets/img/server.png')}
        style={styles.image}
      />

      <Text style={styles.whiteText}>Download for Windows, MacOS or Linux</Text>

      <Text style={styles.whiteText}>Click to visit website</Text>

      <TouchableOpacity onPress={openLink}>
        <Text style={styles.linkText}>{SERVER_LINK} </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={copyLink}>
        <Text style={styles.linkText}>Copy Link</Text>
      </TouchableOpacity>
    </View>
  );
}

function StartServer() {
  return (
    <View style={[styles.downloadContainer]}>
      <Image
        source={require('../../assets/img/server-start.png')}
        style={{width: 280, height: 300}}
      />
    </View>
  );
}

function ScanQRCode() {
  return (
    <View style={[styles.downloadContainer]}>
      <Image
        source={require('../../assets/img/qrcode.png')}
        style={{width: 280, height: 300}}
      />
    </View>
  );
}

function ConnectServer() {
  return (
    <View style={[styles.downloadContainer]}>
      <Image
        source={require('../../assets/img/server-connect.png')}
        style={{width: WIDTH, height: 120}}
        resizeMethod="scale"
        resizeMode="contain"
      />
    </View>
  );
}

const steps = [
  {
    label: 'Download Server Client on your desktop',
    component: <DownloadServer />,
  },
  {
    label: 'Install server client and start server on your desktop.',
    component: <StartServer />,
  },
  {
    label: 'Scan QRCode from the mobile app',
    component: <ScanQRCode />,
  },
  {
    label: 'Select a Server and click to connect',
    component: <ConnectServer />,
  },
];

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({navigation}: Props) {
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    Orientation.lockToPortrait();
  }, []);

  const goToNextStep = async (index: number) => {
    if (index < steps.length) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
      });
    } else {
      // don't show this screen next time
      setBooleanValueFor(SETTINGS_ONBOARDING_SHOW_FIRST_TIME, false);
      navigation.replace('Tabs');
    }
  };

  const StepsCard = useCallback(
    ({item, index}: {item: (typeof steps)[number]; index: number}) => {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.label}>{item.label}</Text>
          {item.component}
          <TouchableOpacity
            onPress={() => goToNextStep(index + 1)}
            style={[styles.nextButton]}
            activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>
              {index === 0
                ? 'Done'
                : index === steps.length - 1
                  ? "Let's Start"
                  : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <SafeAreaView style={styles.containerSafe}>
      <FlatList
        ref={flatListRef}
        data={steps}
        renderItem={StepsCard}
        keyExtractor={(_item, index) => String(index)}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
      />
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
  containerSafe: {
    flex: 1,
    backgroundColor: colors.PRIM_BG,
  },
  stepContainer: {
    width: WIDTH,
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 48,
    paddingBottom: Platform.OS === 'ios' ? 80 : 20,
  },
  image: {
    width: 152,
    height: 152,
  },
  touchpad: {
    width: 200,
    height: 200,
    margin: 16,
    borderRadius: 8,
    backgroundColor: colors.TOUCHPAD,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeTop: {
    position: 'absolute',
    top: 10,
    left: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollbar: {
    width: 5,
    height: 40,
    borderRadius: 5,
    backgroundColor: colors.WHITE,
    position: 'absolute',
    right: 4,
    justifyContent: 'center',
    alignContent: 'center',
  },
  dotContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotRed: {
    backgroundColor: 'red',
  },
  dotGreen: {
    backgroundColor: 'green',
  },
  dotYellow: {
    backgroundColor: 'yellow',
  },
  label: {
    fontFamily: 'Raleway-Bold',
    color: colors.WHITE,
    fontSize: 18,
    textAlign: 'center',
    marginHorizontal: 24,
  },
  nextButton: {
    width: '60%',
    height: 40,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: colors.PRIM_ACCENT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    fontFamily: 'Raleway-Regular',
    color: colors.PRIM_BG,
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  downloadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
    paddingHorizontal: 32,
  },
  whiteText: {
    fontFamily: 'Raleway-Regular',
    color: colors.WHITE,
    fontSize: 16,
    textAlign: 'center',
  },
  linkText: {
    fontFamily: 'Raleway-Regular',
    color: colors.PRIM_FRONT,
    textDecorationLine: 'underline',
  },
});
