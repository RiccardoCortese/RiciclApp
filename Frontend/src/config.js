import { Platform } from 'react-native';


export const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://192.168.1.112:5000/api';
