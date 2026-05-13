import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../src/config";

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Errore", "Token non trovato. Effettua di nuovo il login.");
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(response.data.user);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Errore nel recupero del profilo";

      Alert.alert("Errore", errorMsg);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Caricamento profilo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profilo Utente</Text>

      {user ? (
        <View style={styles.card}>
          <Text style={styles.label}>Nome</Text>
          <Text style={styles.value}>{user.name}</Text>

          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>

          <Text style={styles.label}>Ruolo</Text>
          <Text style={styles.value}>{user.role}</Text>

          <Text style={styles.label}>Punti</Text>
          <Text style={styles.value}>{user.points}</Text>
        </View>
      ) : (
        <Text style={styles.value}>Nessun dato utente disponibile.</Text>
      )}
    </View>
  );
}

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
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2e7d32",
    marginTop: 10,
  },
  value: {
    fontSize: 18,
    marginBottom: 5,
  },
});
