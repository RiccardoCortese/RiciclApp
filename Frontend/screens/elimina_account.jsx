import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, Platform} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../src/config";
import { useRouter } from "expo-router";

export default function EliminaAccountScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false); // Stato di caricamento per evitare più click

  const handleDeleteAccount = async () => {
    if (loading) return; // Evita più click durante il caricamento

    try {
        setLoading(true); // Imposta lo stato di caricamento, in questo modo il pulsante sarà disabilitato
        const token = await AsyncStorage.getItem("token");
        if (!token) {
            alert("Token non trovato. Effettua di nuovo il login.");
            setLoading(false);
            return;
        }
        const response = await axios.delete(`${API_URL}/user/delete`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        alert(response.data.message || "Account eliminato con successo.");
        await AsyncStorage.removeItem("token");
        router.push("/auth/register");
    } catch (error) {
        const errorMsg = error.response?.data?.message || "Errore durante l'eliminazione dell'account.";
        alert(errorMsg);
        console.log(error);
    } finally {
        setLoading(false); // Reimposta lo stato di caricamento
    }
};

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Elimina Account</Text>
            <Text style={styles.subtitle}>
                Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.
            </Text>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} disabled={loading}>
                <Text style={styles.deleteButtonText}>
                    {loading ? "Eliminazione in corso..." : "Elimina Account"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} activeOpacity={0.8} onPress={() => router.push('/profile')}>
                <Text style={styles.closeButtonText}>Annulla</Text>
            </TouchableOpacity>
        </View>
    );

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#f5f5f5",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 30,
    },
    deleteButton: {
        backgroundColor: "#ff4d4d",
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 8,
    },
    deleteButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    closeButton: {
        backgroundColor: "#ccc",
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 8,
        marginTop: 10,
    },
    closeButtonText: {
        color: "#333",
        fontSize: 16,
        fontWeight: "bold",
    },
});

