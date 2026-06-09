import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { API_URL } from "../../src/config";

export default function RoutePlannerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false); // Stato per gestire il caricamento durante la generazione del percorso
  const [tappe, setTappe] = useState([]); // Stato per memorizzare le tappe del percorso ottimizzato ricevuto dal server
  const [percorsoGenerato, setPercorsoGenerato] = useState(false); // Stato booleano per indicare se un percorso è stato generato o meno, usato per il rendering condizionale della sezione delle tappe

  // Effetto per caricare un percorso esistente da AsyncStorage quando il componente viene montato, in modo da mostrare subito il percorso attivo se l'operatore ha già generato uno in precedenza e non lo ha cancellato.
  useEffect(() => {
    const caricaPercorsoEsistente = async () => {
      try {
        const storedRoute = await AsyncStorage.getItem("active_operator_route");
        if (storedRoute) {
          setTappe(JSON.parse(storedRoute));
          setPercorsoGenerato(true);
        }
      } catch (err) {
        console.error("Errore nel recupero del percorso locale:", err);
      }
    };
    caricaPercorsoEsistente();
  }, []);

  const generaPercorsoMigliore = async () => {
    setLoading(true);
    try {
      // Recupera l'ID dell'operatore loggato
      const userString = await AsyncStorage.getItem("user");

      if (!userString) {
        alert("Errore: effettua prima il login.");
        setLoading(false);
        return;
      }
      const loggedInUser = JSON.parse(userString);
      const currentIdOperatore = loggedInUser.id;

      // Effettua la richiesta al server per ottenere il percorso ottimizzato, passando l'ID dell'operatore per filtrare le segnalazioni e i bidoni rilevanti per quel profilo.
      const response = await axios.get(`${API_URL}/operator/optimized-route/${currentIdOperatore}`);

      if (response.data && response.data.success) {
        const tappeInEvidenza = response.data.tappe;

        if (tappeInEvidenza.length === 0) {
          alert("Ottimo! Non ci sono bidoni pieni o segnalazioni assegnate al tuo profilo.");
          setPercorsoGenerato(false);
          setTappe([]);
          await AsyncStorage.removeItem("active_operator_route");
          setLoading(false);
          return;
        }
        
        //metto in AsyncStorage il percorso generato per poterlo visualizzare sulla mappa home
        await AsyncStorage.setItem("active_operator_route", JSON.stringify(tappeInEvidenza));

        setTappe(tappeInEvidenza);
        setPercorsoGenerato(true);
        alert("Percorso generato con successo!");
      } else {
        alert("Il server non è riuscito a calcolare il percorso.");
      }
    } catch (error) {
      console.error("Errore nella generazione del percorso:", error);
      alert("Errore di connessione o nel calcolo del percorso.");
    } finally {
      setLoading(false);
    }
  };

  const cancellaPercorsoCorrente = async () => {
    try {
      await AsyncStorage.removeItem("active_operator_route");
      setTappe([]);
      setPercorsoGenerato(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/")}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Area Operatore</Text>
        <View style={{ width: 35 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Informativo */}
        <View style={styles.infoBanner}>
          <Text style={styles.bannerTitle}>Pianificatore Itinerario</Text>
          <Text style={styles.bannerSubtitle}>Ottimizza i tuoi spostamenti. Genera la rotta passando per le tue segnalazioni attive e i bidoni saturi della città.</Text>
        </View>

        {/* Bottone Principale di Azione */}
        <TouchableOpacity
          style={[styles.mainButton, loading && styles.disabledButton]}
          onPress={generaPercorsoMigliore}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.mainButtonText}>⚡ Genera Percorso Ottimizzato</Text>
          )}
        </TouchableOpacity>

        {/* LISTA DELLE TAPPE GENERATE */}
        {percorsoGenerato && (
          <View style={styles.routeSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tappe del giorno ({tappe.length})</Text>
              <TouchableOpacity onPress={cancellaPercorsoCorrente}>
                <Text style={styles.clearText}>Azzera tutto</Text>
              </TouchableOpacity>
            </View>

            {tappe.map((tappa, idx) => {
              const isIntervento = tappa.type === "INTERVENTO";
              return (
                <View key={tappa.id || idx} style={styles.tappaCard}>
                  {/* Badge Numerico a Sinistra */}
                  <View style={[styles.numberBadge, isIntervento ? styles.badgeIntervento : styles.badgeSvuotamento]}>
                    <Text style={styles.numberText}>{idx + 1}</Text>
                  </View>

                  {/* Testo Centrale */}
                  <View style={styles.tappaInfo}>
                    <View style={styles.tagRow}>
                      <Text style={[styles.typeTag, isIntervento ? styles.tagIntervento : styles.tagSvuotamento]}>
                        {isIntervento ? "🔧 Riparazione" : "🗑️ Svuotamento"}
                      </Text>
                    </View>
                    <Text style={styles.tappaTitolo}>{tappa.titolo}</Text>
                    <Text style={styles.tappaIndirizzo}>📍 {tappa.indirizzo}</Text>
                  </View>
                </View>
              );
            })}

            {/* Pulsante di Rinvio alla Mappa Home */}
            <TouchableOpacity
              style={styles.mapLinkButton}
              onPress={() => router.replace("/")}
              activeOpacity={0.8}
            >
              <Text style={styles.mapLinkButtonText}>🗺️ Visualizza la linea sulla Mappa</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#009933",
    paddingTop: Platform.OS === "web" ? 20 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  backButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 20,
  },
  infoBanner: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: "#6c757d",
    lineHeight: 20,
  },
  mainButton: {
    backgroundColor: "#009933",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  disabledButton: {
    backgroundColor: "#a3cca3",
  },
  mainButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  routeSection: {
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#495057",
  },
  clearText: {
    color: "#dc3545",
    fontSize: 14,
    fontWeight: "600",
  },
  tappaCard: {
    backgroundColor: "#fff",
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  badgeIntervento: {
    backgroundColor: "#fd7e14",
  },
  badgeSvuotamento: {
    backgroundColor: "#009933",
  },
  numberText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  tappaInfo: {
    flex: 1,
  },
  tagRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  typeTag: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  tagIntervento: {
    backgroundColor: "#fff3cd",
    color: "#856404",
  },
  tagSvuotamento: {
    backgroundColor: "#d4edda",
    color: "#155724",
  },
  tappaTitolo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 2,
  },
  tappaIndirizzo: {
    fontSize: 13,
    color: "#6c757d",
  },
  mapLinkButton: {
    backgroundColor: "#212529",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  mapLinkButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});