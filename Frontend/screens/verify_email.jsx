import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import axios from "axios";
import { API_URL } from "../src/config";

export default function VerifyScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams(); // email passata dalla registrazione
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
            router.replace("/auth/login"); // Vai al login
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 400) {
                const error_msg = error.response?.data?.message;
                alert(error_msg);
            } 
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Verifica la tua Email</Text>
            <Text style={styles.subtitle}>Inserisci il codice inviato a {email}</Text>
            
            <TextInput
                style={styles.input}
                placeholder="Esempio: 123456"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
            />

            <TouchableOpacity style={styles.button} onPress={handleVerify}>
                <Text style={styles.buttonText}>Verifica</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        justifyContent: "center", 
        padding: 20, 
        backgroundColor: "#fff" 
    },
    
    title: { 
        fontSize: 24, 
        fontWeight: "bold", 
        textAlign: "center", 
        color: "#2e7d32" 
    },
    
    subtitle: { 
        textAlign: "center", 
        marginBottom: 20, 
        color: "#666" 
    },
    
    input: { 
        borderWidth: 1, 
        borderColor: "#ddd", 
        padding: 15, 
        borderRadius: 10, 
        fontSize: 20, 
        textAlign: "center", 
        letterSpacing: 5 
    },
    
    button: {
        backgroundColor: "#2e7d32", 
        padding: 15, 
        borderRadius: 10, 
        marginTop: 20 
    },
    
    buttonText: { 
        color: "#fff", 
        textAlign: "center", 
        fontWeight: "bold" 
    }
});