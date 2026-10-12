import {ImageBackground, StyleSheet} from 'react-native';
import React from 'react';
import colors from '../constants/colors';

export default function Background({children}: {children: React.ReactNode}) {
  return (
    <ImageBackground
      source={require('../../assets/img/bg.png')}
      style={styles.container}
      imageStyle={styles.image}>
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.PRIM_BG,
  },
  image: {
    opacity: 0.05,
  },
});
