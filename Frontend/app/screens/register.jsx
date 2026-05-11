import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { API_URL } from '../../src/config';

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    // Controllo se tutti i campi sono compilati
    if (!username || !email || !password) {
      Alert.alert("Errore", "Compila tutti i campi!");
      return;
    }

    try {
      // Chiamata al Backend (rotta: /api/auth/register)
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password
      });
      
      // Se la registrazione è andata a buon fine, mostro un messaggio di successo e torno alla pagina di login
      if (response.status === 201 || response.status === 200) {
        Alert.alert("Successo!", "Account creato. Ora puoi fare il login.");
        router.replace('/'); // Torna alla pagina index (Login)
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Errore di connessione al server";
      Alert.alert("Ops!", errorMsg);
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crea Account ♻️</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Username" 
        value={username}
        onChangeText={setUsername} 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Email" 
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail} 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        secureTextEntry 
        value={password}
        onChangeText={setPassword} 
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Registrati</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/')}>
        <Text style={styles.linkText}>Hai già un account? Accedi</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#2e7d32' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#2e7d32', textAlign: 'center', marginTop: 20 }
});