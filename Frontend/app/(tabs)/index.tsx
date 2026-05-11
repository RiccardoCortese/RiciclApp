import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../src/config";

export default function Home() {
  const router = useRouter(); // Inizializza il router
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleLogin = async () => {

  // Controllo campi vuoti
  if (!email || !password) {
    Alert.alert("Errore", "Compila tutti i campi");
    return;
  }

  try {
    // Chiamata al backend
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });

    // Estraggo token e dati utente
    const { token, user } = response.data;

    // Salvo token e utente nel dispositivo
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));
    Alert.alert("Successo", "Login effettuato!");
    console.log("TOKEN:", token);
    console.log("USER:", user);

  } catch (error) {
    let errorMsg = "Errore di connessione al server";
    if (axios.isAxiosError(error)) {
      errorMsg = error.response?.data?.message || errorMsg;
    }
    Alert.alert("Errore", errorMsg);
    console.log(error);
  }
};

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Login ♻️</Text>

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
        onPress={handleLogin}
      >
        <Text style={styles.buttonText}>Accedi</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/register')}
      >
        <Text style={styles.linkText}>
          Non hai un account? Registrati
        </Text>
      </TouchableOpacity>

    </View>
  );
}
// Aggiungiamo un po' di stile per rendere il bottone cliccabile e carino
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#2e7d32",
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  button: {
    backgroundColor: "#2e7d32",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  linkText: {
    color: "#2e7d32",
    textAlign: "center",
    marginTop: 20,
  },
});
