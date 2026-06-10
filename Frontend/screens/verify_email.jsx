import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import axios from "axios";
import { API_URL } from "../src/config";

export default function VerifyScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams(); // Email passata dalla registrazione
    const [code, setCode] = useState("");

    const handleVerify = async () => {
        if (code.length !== 6) {
            alert("Il codice deve essere di 6 cifre");
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/auth/verify-email`, {
                email: email,
                code: code
            });

            alert(response.data.message);
            router.replace("/auth/login"); // Torna alla schermata di login
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 400) {
                const error_msg = error.response?.data?.message;
                alert(error_msg);
            } 
        }
    };

    return (
        <View style={styles.container}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Verifica Email</Text>
            </View>

            {/* ── Form ── */}
            <View style={styles.formWrapper}>
                <View style={styles.card}>
                    <Text style={styles.title}>Verifica la tua Email</Text>

                    <Text style={styles.subtitle}>
                        Inserisci il codice inviato a {email}
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="123456"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={code}
                        onChangeText={setCode}
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleVerify}
                    >
                        <Text style={styles.buttonText}>Verifica</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },

    header: {
        backgroundColor: "#009933",
        paddingTop: Platform.OS === "web" ? 20 : 50,
        paddingBottom: 18,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 6,
    },

    headerTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: 0.3,
    },

    formWrapper: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },

    card: {
        width: "100%",
        maxWidth: 450,
        backgroundColor: "#fff",
        padding: 30,
        borderRadius: 18,

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.12,
        shadowRadius: 12,

        elevation: 8,
    },

    title: {
        fontSize: 26,
        fontWeight: "700",
        textAlign: "center",
        color: "#222",
        marginBottom: 10,
    },

    subtitle: {
        textAlign: "center",
        marginBottom: 25,
        color: "#666",
        lineHeight: 22,
    },

    input: {
        backgroundColor: "#fafafa",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        fontSize: 24,
        textAlign: "center",
        letterSpacing: 8,
    },

    button: {
        backgroundColor: "#2e7d32",
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 20,
    },

    buttonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
});