import { useEffect } from 'react';
import { Alert, Image, Platform, StyleSheet, Text, View } from 'react-native';

import WorkInProgress from '../../src/assets/Work_in_progess.png';

export default function HomeAdminScreen() {

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Accesso non disponibile',
        'Admin mode can be reached only via Web, sorry! go on a computer please!',
        [{ text: 'OK' }]
      );
    }
  }, []);

  // On mobile: show nothing useful (the popup already informed the user)
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.mobileMessage}>
          Admin mode can be reached only via Web.{'\n'}Please use a computer.
        </Text>
      </View>
    );
  }

  // Web view
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
  mobileMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 28,
  },
});
