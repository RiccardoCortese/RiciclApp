// schermata di prova con scritto "Admin Panel"
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const AdminPanel = () => {
    const router = useRouter();

    return (
        <div>
            <h1>Operator Dashboard</h1>
                <p>Benvenuto nell'area operatore!</p>

            <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("profileAvatarUri");
            router.push("/auth/login");
            }}
        >
            <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
        </div>
    );
}

const styles = {
   logoutButton: {
    marginTop: 30,
    backgroundColor: "#009933",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
};

export default AdminPanel;

