import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, Platform, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../src/config";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [sendingResetCode, setSendingResetCode] = useState(false);
  const [savingResetPassword, setSavingResetPassword] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        alert("Token non trovato. Effettua di nuovo il login.");
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(response.data.user);
      setUsername(response.data.user.name);

    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Errore nel recupero del profilo";

      alert(errorMsg);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!username || username.trim().length < 2) {
      Alert.alert(
        "Errore",
        "Lo username deve contenere almeno 2 caratteri"
      );
      return;
    }

    try {
      setSavingUsername(true);

      const token = await AsyncStorage.getItem("token");

      const response = await axios.patch(
        `${API_URL}/user/profile/name`,
        {
          username: username,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUser(response.data.user);
      setUsername(response.data.user.name);
      setShowUsernameForm(false);

      Alert.alert("Successo", "Username aggiornato con successo");

    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Errore durante aggiornamento username";

      Alert.alert("Errore", errorMsg);

    } finally {
      setSavingUsername(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword) {
      Alert.alert("Errore", "Inserisci vecchia e nuova password");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Errore", "La nuova password deve essere lunga almeno 6 caratteri");
      return;
    }

    try {
      setSavingPassword(true);

      const token = await AsyncStorage.getItem("token");

      await axios.patch(
        `${API_URL}/user/profile/password`,
        {
          oldPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOldPassword("");
      setNewPassword("");
      setShowPasswordForm(false);

      Alert.alert("Successo", "Password aggiornata con successo");

    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Errore durante aggiornamento password";

      Alert.alert("Errore", errorMsg);

    } finally {
      setSavingPassword(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    try {
      setSendingResetCode(true);
      const token = await AsyncStorage.getItem("token");

      await axios.post(
        `${API_URL}/user/profile/request-password-reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowResetPasswordForm(true);
      Alert.alert("Codice inviato", `È stato inviato un codice di reset a ${user.email}`);

    } catch (error) {
      const errorMsg = error.response?.data?.message || "Errore durante l'invio del codice";
      Alert.alert("Errore", errorMsg);
    } finally {
      setSendingResetCode(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetNewPassword || !resetConfirmPassword || !resetCode) {
      Alert.alert("Errore", "Compila tutti i campi");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      Alert.alert("Errore", "Le due password non coincidono");
      return;
    }

    if (resetNewPassword.length < 6) {
      Alert.alert("Errore", "La password deve essere lunga almeno 6 caratteri");
      return;
    }

    try {
      setSavingResetPassword(true);
      const token = await AsyncStorage.getItem("token");

      await axios.post(
        `${API_URL}/user/profile/reset-password`,
        { newPassword: resetNewPassword, code: resetCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResetNewPassword("");
      setResetConfirmPassword("");
      setResetCode("");
      setShowResetPasswordForm(false);

      Alert.alert("Successo", "Password reimpostata con successo");

    } catch (error) {
      const errorMsg = error.response?.data?.message || "Errore durante il reset della password";
      Alert.alert("Errore", errorMsg);
    } finally {
      setSavingResetPassword(false);
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
      <View style={styles.header}>
      <Text style={styles.headerTitle}>Profilo Utente</Text>
      
      <TouchableOpacity style={styles.closeButton} activeOpacity={0.8} onPress={() => router.push('/')}>
            <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {user ? (
        <View style={styles.card}>

          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user.name}</Text>

          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => setShowUsernameForm(!showUsernameForm)}
          >
            <Text style={styles.changeButtonText}>
              {showUsernameForm ? "Annulla" : "Cambia username"}
            </Text>
          </TouchableOpacity>

          {showUsernameForm && (
            <>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Inserisci nuovo username"
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateUsername}
                disabled={savingUsername}
              >
                <Text style={styles.saveButtonText}>
                  {savingUsername ? "Salvataggio..." : "Salva username"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => setShowPasswordForm(!showPasswordForm)}
          >
            <Text style={styles.changeButtonText}>
              {showPasswordForm ? "Annulla" : "Cambia password"}
            </Text>
          </TouchableOpacity>

          {showPasswordForm && (
            <>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder="Vecchia password"
                  secureTextEntry={!showOldPassword}
                />

                <TouchableOpacity
                  onPress={() => setShowOldPassword(!showOldPassword)}
                >
                  <Ionicons
                    name={showOldPassword ? "eye-off" : "eye"}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nuova password"
                  secureTextEntry={!showNewPassword}
                />

                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-off" : "eye"}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdatePassword}
                disabled={savingPassword}
              >
                <Text style={styles.saveButtonText}>
                  {savingPassword ? "Salvataggio..." : "Salva password"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => {
              if (showResetPasswordForm) {
                setShowResetPasswordForm(false);
                setResetNewPassword("");
                setResetConfirmPassword("");
                setResetCode("");
              } else {
                handleRequestPasswordReset();
              }
            }}
            disabled={sendingResetCode}
          >
            <Text style={styles.changeButtonText}>
              {sendingResetCode ? "Invio codice..." : showResetPasswordForm ? "Annulla" : "Reimposta password"}
            </Text>
          </TouchableOpacity>

          {showResetPasswordForm && (
            <>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={resetNewPassword}
                  onChangeText={setResetNewPassword}
                  placeholder="Nuova password"
                  secureTextEntry={!showResetNewPassword}
                />
                <TouchableOpacity onPress={() => setShowResetNewPassword(!showResetNewPassword)}>
                  <Ionicons name={showResetNewPassword ? "eye-off" : "eye"} size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={resetConfirmPassword}
                  onChangeText={setResetConfirmPassword}
                  placeholder="Conferma nuova password"
                  secureTextEntry={!showResetConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowResetConfirmPassword(!showResetConfirmPassword)}>
                  <Ionicons name={showResetConfirmPassword ? "eye-off" : "eye"} size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                value={resetCode}
                onChangeText={setResetCode}
                placeholder="Codice ricevuto via email"
                keyboardType="number-pad"
                maxLength={6}
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleResetPassword}
                disabled={savingResetPassword}
              >
                <Text style={styles.saveButtonText}>
                  {savingResetPassword ? "Salvataggio..." : "Salva nuova password"}
                </Text>
              </TouchableOpacity>
            </>
          )}

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

      
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          await AsyncStorage.removeItem("token");
          router.push("/auth/login");
        }}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
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

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
    marginBottom: 10,
    fontSize: 16,
  },

  saveButton: {
    backgroundColor: "#009933",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },

  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  changeButton: {
    backgroundColor: "#e8f5e9",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },

  changeButtonText: {
    color: "#009933",
    fontWeight: "700",
  },

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

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
});
