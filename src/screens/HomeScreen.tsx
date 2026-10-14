import React, {useEffect, useState} from 'react';
import {
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import colors from '../constants/colors';
import {getServers, setServers} from '../utils/servers';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  QRCODE_SECRET,
  SERVER_DOWNLOAD_LINK,
  SERVER_FINGERPRINT_KEY,
  SERVER_URL_KEY,
} from '../constants/settings';
import {setValueFor} from '../utils/storage';
import Background from '../components/Background';
import MouseMove from '../components/MouseMove';
import {useIsFocused} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {TabParamList} from '../navigation/TabNavigator';
import Orientation from 'react-native-orientation-locker';

interface ServerItem {
  key: string;
  urlData: string;
  url: string;
  host: string;
  fingerprint: string;
}

type Props = NativeStackScreenProps<TabParamList, 'Home'>;

export default function HomeScreen({navigation}: Props) {
  const [data, setData] = useState<ServerItem[]>([]);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isFocused) {
      Orientation.lockToPortrait();
      const res = getServers();
      if (Array.isArray(res)) {
        const servers = res.map((s: string, index: number) => {
          const separatedArray = s?.split(QRCODE_SECRET);
          const url = separatedArray[0];
          const host = separatedArray[1];
          // v2 entries carry the TLS fingerprint; legacy entries predate it
          const fingerprint = separatedArray[2] ?? '';
          return {
            key: `key-${index + 1}`,
            urlData: s,
            url,
            host,
            fingerprint,
          };
        });
        setData(servers);
      }
    }
  }, [isFocused]);

  const onPressDelete = (key: string) => {
    setData(prev => {
      const filteredData = prev.filter(item => item.key !== key);
      setServers(filteredData.map(d => d.urlData));
      return filteredData;
    });
  };

  const onPressConnect = (item: ServerItem) => {
    setValueFor(SERVER_URL_KEY, item?.url);
    setValueFor(SERVER_FINGERPRINT_KEY, item?.fingerprint ?? '');
    navigation.navigate('Touchpad', {
      screen: 'TouchpadScreen',
      params: {serverUrl: item?.url, fingerprint: item?.fingerprint ?? ''},
    });
  };

  const openServerDownloadLink = () => {
    Linking.openURL(SERVER_DOWNLOAD_LINK);
  };

  const copyServerDownloadLink = () => {
    Clipboard.setString(SERVER_DOWNLOAD_LINK);
    Alert.alert('Link Copied');
  };

  const renderItem = ({item}: {item: ServerItem}) => (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <View style={styles.rowLeft}>
          <MaterialIcons
            name="desktop-windows"
            size={18}
            color={colors.WHITE}
          />
          <Text style={styles.text}>{item.host}</Text>
        </View>
        <View style={styles.rowLeft}>
          <MaterialIcons name="link" size={18} color={colors.WHITE} />
          <Text style={styles.text} numberOfLines={1}>
            {item.url}
          </Text>
        </View>
        <View style={styles.rowActions}>
          <TouchableOpacity
            style={styles.connectBtn}
            onPress={() => onPressConnect(item)}>
            <Text style={styles.textDark}>Connect</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onPressDelete(item.key)}>
            <Text style={styles.textBold}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <Background>
      <SafeAreaView style={styles.safe}>
        <MouseMove />
        <FlatList
          data={data}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          bounces={false}
          contentContainerStyle={[
            styles.container,
            {paddingBottom: 96 + insets.bottom},
          ]}
          ListHeaderComponent={
            <View>
              {data.length > 0 && (
                <Text style={styles.listTitleText}>Servers List</Text>
              )}
              {data.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={[styles.text, styles.helperText]}>
                    Tap the + button to scan a QRCode from the Peyara desktop
                    app.
                  </Text>
                  <Text style={styles.downloadPrompt}>
                    Download the server app for Windows, MacOS or Linux:
                  </Text>
                  <Text
                    style={styles.linkText}
                    onPress={openServerDownloadLink}>
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
              )}
            </View>
          }
        />
        <TouchableOpacity
          style={[styles.plusButton, {bottom: 84 + insets.bottom}]}
          onPress={() => {
            // QRCode lives on the root stack, above the tabs
            navigation.getParent()?.navigate('QRCode' as never);
          }}>
          <Text style={styles.plusButtonText}>+</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
  },
  container: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  row: {
    padding: 12,
    marginVertical: 8,
    backgroundColor: colors.TOUCHPAD,
    borderRadius: 8,
  },
  rowInfo: {
    gap: 6,
  },
  rowLeft: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  connectBtn: {
    flex: 1,
    backgroundColor: colors.PRIM_ACCENT,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: colors.RED,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  text: {
    color: colors.WHITE,
    fontSize: 14,
    flexShrink: 1,
    fontFamily: 'Raleway-Regular',
  },
  textBold: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: 'Raleway-Bold',
  },
  listTitleText: {
    color: colors.WHITE,
    fontSize: 16,
    marginTop: 16,
    fontFamily: 'Raleway-Bold',
  },
  textDark: {
    fontSize: 14,
    color: colors.PRIM_BG,
    fontFamily: 'Raleway-Bold',
  },
  helperText: {
    textAlign: 'center',
    marginTop: 120,
    fontSize: 16,
    fontFamily: 'Raleway-Regular',
  },
  emptyState: {
    alignItems: 'center',
  },
  downloadPrompt: {
    color: colors.WHITE,
    fontSize: 14,
    marginTop: 24,
    fontFamily: 'Raleway-Regular',
  },
  linkText: {
    color: colors.PRIM_FRONT,
    fontSize: 14,
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
    fontSize: 14,
    fontFamily: 'Raleway-Regular',
  },
  plusButton: {
    width: 64,
    height: 64,
    backgroundColor: colors.PRIM_ACCENT,
    borderRadius: 42,
    position: 'absolute',
    bottom: 84,
    right: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusButtonText: {
    fontWeight: 'bold',
    color: colors.PRIM_BG,
    fontSize: 32,
  },
});
