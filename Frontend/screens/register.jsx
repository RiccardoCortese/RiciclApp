import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import axios from 'axios';
import { API_URL } from '../src/config';
import { useRouter } from 'expo-router';

export default function Register() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      // Chiamata al Backend (rotta: /api/auth/register)
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password
      });
      
      // Se la registrazione è andata a buon fine, mostro un messaggio di successo e torno alla pagina di login
      if (response.status === 201 || response.status === 200) { 
        alert("Codice Inviato", "Controlla la tua email per il codice di verifica.");
        router.push({
          pathname: "/auth/verify_email",
          params: { email: email } // Passo l'email per sapere chi stiamo verificando
        });
        

      }
    } catch (error) {
      
      if (axios.isAxiosError(error)) {

        const errorMsg = error.response?.data?.message || error.message || "Errore di connessione al server";

        alert(errorMsg);

      } else {

        console.log("ERRORE GENERICO:");
        console.log(error);

        alert("Errore sconosciuto");
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crea Account</Text>

        <TouchableOpacity
          style={styles.closeButton}
          activeOpacity={0.8}
          onPress={() => router.push('/')}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Form ── */}
      <View style={styles.formWrapper}>
        <View style={styles.card}>
          <Text style={styles.formTitle}>Crea il tuo account</Text>

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

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
          >
            <Text style={styles.buttonText}>Registrati</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.linkText}>
              Hai già un account? Accedi
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

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

  content: {
    flex: 1,
  },

  input: {
    backgroundColor: '#fafafa',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 15,
  },

  button: {
    backgroundColor: '#2e7d32',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  linkText: {
    color: '#2e7d32',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600',
  },

  formWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  card: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 18,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,

    elevation: 8,
  },

  formTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 25,
    color: '#222',
  },
});