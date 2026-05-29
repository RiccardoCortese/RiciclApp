import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    const redirectUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const role = await AsyncStorage.getItem('userRole');

        // Se manca il token o il ruolo, l'utente non è loggato -> va al login
        if (!token || !role) {
          router.replace('/(user)');
          return;
        }

        // Smistamento in base al ruolo registrato nel database
        if (role === 'admin') {
          router.replace('/(admin)');
        } else if (role === 'operator') {
          router.replace('/(operator)');
        } else {
          router.replace('/(user)');
        }
      } catch (error) {
        console.error("Errore nel redirect iniziale:", error);
        router.replace('/auth/login');
      }
    };

    redirectUser();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#009933" />
    </View>
  );
}