import { Platform } from 'react-native';

export const API_URL = Platform.OS === 'web'
  ? 'https://riciclapp-backend.onrender.com/api'
  : 'https://riciclapp-backend.onrender.com/api';