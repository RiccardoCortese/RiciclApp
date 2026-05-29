import { Image, StyleSheet, Text, View } from 'react-native';

import WorkInProgress from '../../src/assets/Work_in_progess.png';

export default function HomeOperatorScreen() {
  return (
    <View style={styles.container}>
      <Image source={WorkInProgress} style={styles.image} resizeMode="contain" />
      <Text style={styles.label}>Work in progress!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 280,
    height: 280,
    marginBottom: 24,
  },
  label: {
    fontSize: 28,
    fontWeight: '700',
    color: '#009933',
    textAlign: 'center',
  },
});
