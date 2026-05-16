import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BinScreenComponent from '../../../screens/bins'; 

export default function Page() {
    const router = useRouter();
    const { id } = useLocalSearchParams(); // Prende il <center_id> dall'URL
    console.log("Parametri ricevuti dalla rotta:", { id });

    // Se l'id non è ancora arrivato o è la stringa "undefined"
    if (!id || id === 'undefined') {
        return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <ActivityIndicator size="large" color="#009933" />
            <Text style={{ marginTop: 15, color: '#666', textAlign: 'center' }}>
            In attesa dell'ID dal router... (Controlla la console)
            </Text>
        </View>
        );
    }
    return (
        <BinScreenComponent 
        centerId={id} 
        onBack={() => router.back()} 
        />
    );
}