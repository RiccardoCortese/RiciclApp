import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import WorkImg from '../../src/assets/Work_in_progess.png';

const AMARANTH = '#C0174D';

export default function WorkInProgressAdmin() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Close button — top right */}
      <TouchableOpacity
        style={styles.closeButton}
        activeOpacity={0.8}
        onPress={() => router.replace('/(admin)')}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <Image source={WorkImg} style={styles.image} resizeMode="contain" />
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
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AMARANTH,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  image: {
    width: 280,
    height: 280,
    marginBottom: 24,
  },
  label: {
    fontSize: 28,
    fontWeight: '700',
    color: AMARANTH,
    textAlign: 'center',
  },
});
