import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import axios from 'axios';
import { API_URL } from '../src/config';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BinScreen({ centerId, onBack }) {
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const navigation = useNavigation();

  //per la segnalazione
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBin, setSelectedBin] = useState(null);
  const [description, setDescription] = useState('');
  const [userId, setUserId] = useState(null);
  const [sending, setSending] = useState(false);
  

  useEffect(() => {
    if (!centerId || centerId === 'undefined') {
      console.warn("ID del centro non valido o non ricevuto:", centerId);
      setLoading(false);
      return;
    }


    setLoading(true);

    // Chiamata al backend per ottenere i dati del centro e dei suoi bidoni
    axios.get(`${API_URL}/centers/${centerId}`)
    .then(centerRes => {
      setCenter(centerRes.data);
    })
    .catch(err => {
      console.error("Errore nel recupero dei dati del centro:", err);
    })
    .finally(() => setLoading(false));
  }, [centerId]);

  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // per estrarre l'id dell'utente dallo storage e salvarlo nello stato per poterlo usare nella segnalazione
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          const extractedId = parsed.id || parsed._id;
          setUserId(extractedId);
          console.log("BinScreen - UserId aggiornato con successo:", extractedId);
        } else {
          setUserId(null);
          console.log("BinScreen - Nessun utente registrato (Ospite)");
        }
      } catch (err) {
        console.error("Errore nel recupero dell'utente:", err);
        setUserId(null);
      }
    };

    // Esegue il controllo al primo avvio del componente
    fetchUser();

    // Controlla lo storage ogni volta che l'utente torna su questa schermata!
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUser();
    });

    return unsubscribe; // Pulisce l'evento quando il componente si smonta
  }, [navigation]);      

  // Funzione per aprire il modal di segnalazione
  const openReportModal = (bin) => {
    if (!userId) {
      alert("Accesso richiesto", "Devi effettuare il login per poter segnalare un guasto.");
      router.replace('/auth/login'); // Reindirizza alla pagina di login se l'utente non è autenticato
      return;
    }
    setSelectedBin(bin);
    setModalVisible(true);
  };

  // Funzione per inviare la segnalazione al backend
  const submitReport = async () => {
    if (!description.trim()) { // Controllo per assicurarsi che la descrizione non sia vuota o solo spazi
      alert("Inserisci una descrizione del problema per aiutare l'operatore.");
      return;
    }

    setSending(true);

    try {
      const response = await axios.post(`${API_URL}/report/create`, {
        userId,
        binId: selectedBin._id, // Spediamo l'ID unico del bidone specifico
        description: description.trim()
      });

      if (response.data.success) {
        alert("La segnalazione è stata inviata con successo.");
        setModalVisible(false);
        setDescription('');
        
        // Aggiorna localmente lo stato del bidone per mostrare subito il cambio all'utente
        setCenter(prevCenter => {
          const updatedBins = prevCenter.bins.map(b => 
            b._id === selectedBin._id ? { ...b, status: 'MANUTENZIONE' } : b // Aggiornamento bidone specifico usando l'ID unico
          );
          return { ...prevCenter, bins: updatedBins };
        });
      }
    } catch (error) {
      console.error("Errore invio report:", error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#009933" />
      </View>
    );
  }


  if (!center) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Centro di raccolta non trovato.</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Torna alla Mappa</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const binsList = center.bins || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButtonInline} onPress={() => router.replace('/')}>
        <Text style={styles.backButtonInlineText}>⬅ Torna alla Mappa</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{center.name}</Text>
      <Text style={styles.subtitle}>{center.address || 'Nessun indirizzo specificato'}</Text>
      
      <View style={styles.divider} />
      
      <Text style={styles.sectionTitle}>Stato di riempimento attuale:</Text>

      {binsList.length > 0 ? (
        binsList.map((bin, index) => {
          const isAlmostFull = bin.fillLevel > 80;
          const isInMaintenance = bin.status === 'MANUTENZIONE'; // Controllo se il bidone è in manutenzione
          
          //formattazione nome 
          const formattedWasteType = bin.wasteType 
            ? bin.wasteType.charAt(0).toUpperCase() + bin.wasteType.slice(1) 
            : 'Rifiuto';

          return (
            <View key={bin._id || index} style={styles.binRow}>
              <View style={styles.binInfoText}>
                <Text style={styles.binType}>{formattedWasteType} ({bin.binCode || 'Codice non disponibile'})</Text>
                <Text style={[styles.binPercentage, { color: isInMaintenance ? '#777' : (isAlmostFull ? '#cc0000' : '#555') }]}>
                  {isInMaintenance ? '🔧 In Manutenzione' : `${bin.fillLevel}% ${isAlmostFull ? '⚠️ Quasi Pieno' : ''}`}
                </Text>
              </View>
              <View style={styles.progressBarBackground}>
                <View style={[
                  styles.progressBarFill, 
                  { 
                    width: isInMaintenance ? '100%' : `${bin.fillLevel}%`, 
                    backgroundColor: isInMaintenance ? '#9e9e9e' : (isAlmostFull ? '#cc0000' : (bin.color || '#009933')) 
                  }
                ]} />
              </View>

              {/* Tasto per segnalare il guasto */}
              <TouchableOpacity
                style={[styles.actionReportButton, isInMaintenance && styles.disabledReportButton]}
                onPress={() => openReportModal(bin)}
                disabled={isInMaintenance}
              >
                <Text style={styles.actionReportButtonText}>
                  {isInMaintenance ? '🔧 In Riparazione' : '⚠️ Segnala'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      ) : (
        <Text style={styles.noBinsText}>Nessun bidone monitorato in questo centro.</Text>
      )}

      {/* ── MODAL DI SEGNALAZIONE POPUP ── */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Segnala guasto: {selectedBin?.wasteType.toUpperCase()} ({selectedBin?.binCode})
            </Text>
            
            <TextInput
              style={styles.textArea}
              placeholder="Spiega il problema riscontrato (es. sportello bloccato, rifiuto incastrato, danneggiato...)"
              multiline={true}
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => { setModalVisible(false); setDescription(''); }}
              >
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={submitReport}
                disabled={sending}
              >
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Invia</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9f9f9' 
  },
  content: { 
    padding: 24, 
    paddingTop: 60 
  },
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  backButtonInline: { 
    marginBottom: 20 
  },
  backButtonInlineText: { 
    color: '#009933', 
    fontSize: 16, 
    fontWeight: '600'
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#666', 
    marginTop: 4 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#e0e0e0', 
    marginVertical: 20 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#009933', 
    marginBottom: 15 
  },
  errorText: { 
    fontSize: 16, 
    color: '#cc0000', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  backButton: { 
    backgroundColor: '#009933', 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 25 
  },
  backButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  binRow: { 
    marginBottom: 18 
  },
  binInfoText: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 6 
  },
  binType: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#333' 
  },
  binPercentage: { 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  progressBarBackground: { 
    height: 12, 
    width: '100%',
    backgroundColor: '#e0e0e0', 
    borderRadius: 6, 
    overflow: 'hidden' 
  },
  progressBarFill: { 
    height: '100%', 
    borderRadius: 6 
  },
  noBinsText: {
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    marginTop: 20
  },
  actionReportButton: {
    backgroundColor: '#ff9800',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  disabledReportButton: {
    backgroundColor: '#e0e0e0'
  },
  actionReportButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    width: '85%', 
    padding: 22, 
    borderRadius: 16,
    shadowColor: '#000',
    elevation: 5
  },
  modalTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 14, 
    color: '#333' 
  },
  textArea: { 
    backgroundColor: '#f9f9f9', 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 12, 
    textAlignVertical: 'top', 
    height: 100, 
    marginBottom: 20,
    fontSize: 14
  },
  modalButtonsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  modalButton: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginHorizontal: 5 
  },
  cancelButton: { 
    backgroundColor: '#eee' 
  },
  cancelButtonText: { 
    color: '#555', 
    fontWeight: '600' 
  },
  confirmButton: { 
    backgroundColor: '#d32f2f' 
  },
  confirmButtonText: { 
    color: '#fff', 
    fontWeight: '600' 
  }
});