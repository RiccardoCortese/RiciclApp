import { Platform } from 'react-native';

// On web the browser runs at localhost, so we use localhost to avoid Windows
// Firewall silently dropping packets sent to the machine's own LAN IP.
// On native (Expo Go) the phone needs the actual LAN IP to reach the backend.
export const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://192.168.1.76:5000/api';
