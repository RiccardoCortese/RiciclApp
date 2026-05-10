import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router"; // Importa il navigatore

export default function Home() {
  const router = useRouter(); // Inizializza il router

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Ciao dalla mia app 🚀</Text>

      {/* Pulsante per andare alla registrazione */}
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.push('/register')}
      >
        <Text style={styles.buttonText}>Vai alla Registrazione</Text>
      </TouchableOpacity>
    </View>
  );
}

// Aggiungiamo un po' di stile per rendere il bottone cliccabile e carino
const styles = StyleSheet.create({
  button: {
    backgroundColor: "#2e7d32",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    elevation: 3, // Ombra su Android
    shadowColor: '#000', // Ombra su iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});