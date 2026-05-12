import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import axios from 'axios';
import { API_URL } from '../src/config';

export default function Register({ goHome }) {
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
        //richiama la funzione passata da App.jsx per tornare alla home (login)
        Alert.alert("Successo!", "Registrazione avvenuta con successo!"); 
        goHome();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Errore di connessione al server";
      Alert.alert("Ops!", errorMsg);
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crea Account</Text>
        <TouchableOpacity style={styles.closeButton} activeOpacity={0.8} onPress={goHome}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      {/* ── Form ── */}
      <View style={styles.content}>
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

      </View>
     
    </View>
  );
}

const styles = StyleSheet.create({

  // Outer shell — no centering, no padding (header sits flush at the top)
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  // ── Header (identical pattern to Informations) ──
  header: {
    backgroundColor: '#009933',
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'web' ? 14 : 44,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Form area — fills remaining space and centers its children ──
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 20,
  },

  // These three are unchanged
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#2e7d32',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});