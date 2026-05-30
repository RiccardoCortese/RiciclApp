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

  // Stati per la segnalazione
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBin, setSelectedBin] = useState(null);
  const [description, setDescription] = useState('');
  const [userId, setUserId] = useState(null);
  const [sending, setSending] = useState(false);
  
  // Stati per i messaggi di feedback cross-platform
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false); 

  useEffect(() => {
    if (!centerId || centerId === 'undefined') {
      console.warn("ID del centro non valido o non ricevuto:", centerId);
      setLoading(false);
      return;
    }

    setLoading(true);
    axios.get(`${API_URL}/centers/${centerId}`)
      .then(centerRes => { setCenter(centerRes.data); })
      .catch(err => { console.error("Errore nel recupero dei dati del centro:", err); })
      .finally(() => setLoading(false));
  }, [centerId]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUserId(parsed.id || parsed._id);
        } else {
          setUserId(null);
        }
      } catch (err) {
        setUserId(null);
      }
    };

    // Carichiamo l'utente all'avvio
    fetchUser();
    const unsubscribe = navigation.addListener('focus', () => { fetchUser(); });
    return unsubscribe;
  }, [navigation]);      

  const openReportModal = (bin) => {
    if (!userId) {
      alert("Devi effettuare il login per poter segnalare un guasto.");
      router.replace('/auth/login');
      return;
    }
    setErrorMessage('');
    setIsSuccess(false);
    setSelectedBin(bin);
    setModalVisible(true);
  };

  // Funzione per inviare la segnalazione al server e aggiornare lo stato del bidone 
  const submitReport = async () => {
    if (!description.trim()) { // se la descrizione è vuota o solo spazi
      setErrorMessage("Inserisci una descrizione del problema.");
      return;
    }

    setSending(true);
    setErrorMessage('');

    // controllo di sicurezza: se per qualche motivo userId o selectedBin non sono settati, l'invio non procede
    if (!userId || !selectedBin) {
      setErrorMessage("Dati utente o bidone non validi. Riprova.");
      setSending(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/report/create`, {
        userId,
        binId: selectedBin._id, 
        description: description.trim() 
      });

      console.log("Risposta server:", response);

      // Se la segnalazione è stata accettata
      if (response.status === 200 || response.status === 201 || response.data.success) {
        
        // Svuotalre il campo di descrizione per la prossima segnalazione
        setDescription('');

        // Aggiornamento immediato dello stato del bidone in UI (solo lato client, per feedback istantaneo)
        if (center && center.bins) {
          const updatedBins = center.bins.map(b => 
            b._id === selectedBin._id ? { ...b, status: 'MANUTENZIONE' } : b 
          );
          
          // Spread operator per creare un oggetto totalmente nuovo, forzando React Web a ridisegnare la pagina
          setCenter({ ...center, bins: updatedBins });
        }

        // Schermata di successo cross-platform (sostituisce l'Alert)
        setIsSuccess(true);

        // Sincronizzazione con il server: dopo aver mostrato il feedback, facciamo una richiesta per aggiornare i dati del centro  (manutenzione, stato dei bidoni, ecc.)
        try {
          const centerRes = await axios.get(`${API_URL}/centers/${centerId}`);
          setCenter(centerRes.data);
        } catch (refreshErr) {
          console.error("Errore refresh:", refreshErr);
        }

      } else {
        setErrorMessage("Il server ha risposto ma non ha salvato la segnalazione.");
      }

    } catch (error) {
      console.error("Errore invio:", error);
      setErrorMessage("Errore di connessione con il server.");
    } finally {
      setSending(false);
    }
  };

  // Funzione per chiudere il modal e resettare gli stati di feedback
  const handleCloseModal = () => {
    setModalVisible(false);
    setIsSuccess(false);
    setErrorMessage('');
    setDescription('');
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

  // Visualizzazione bidoni;
  // Per ogni bidone, mostriamo il tipo di rifiuto, la percentuale di riempimento, e un pulsante per segnalare eventuali problemi (disabilitato se è già in manutenzione)
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
          const isInMaintenance = bin.status === 'MANUTENZIONE';
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

      {/* ── MODAL DI SEGNALAZIONE POPUP ADATTATO WEB/MOBILE ── */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* INTERFACCIA DI SUCCESSO (Sostituisce l'Alert) */}
            {isSuccess ? (
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Grazie!</Text>
                <Text style={styles.successText}>La segnalazione è stata inviata e lo stato del bidone è stato aggiornato.</Text>
                <TouchableOpacity style={styles.closeModalBtn} onPress={handleCloseModal}>
                  <Text style={styles.closeModalBtnText}>Chiudi</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* INTERFACCIA DI COMPILAZIONE STANDARD */
              <View>
                <Text style={styles.modalTitle}>
                  Segnala guasto: {selectedBin?.wasteType.toUpperCase()} ({selectedBin?.binCode})
                </Text>
                
                {errorMessage ? <Text style={styles.modalErrorText}>⚠️ {errorMessage}</Text> : null}
                
                <TextInput
                  style={styles.textArea}
                  placeholder="Spiega il problema riscontrato (es. sportello bloccato, danneggiato...)"
                  multiline={true}
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                />

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]} 
                    onPress={handleCloseModal}
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
            )}

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
  },
  successContainer: { 
    alignItems: 'center', 
    paddingVertical: 10 
  },
  successIcon: { 
    fontSize: 46, 
    marginBottom: 10 
  },
  successTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 8 
  },
  successText: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 20, 
    lineHeight: 20 
  },
  closeModalBtn: { 
    backgroundColor: '#009933', 
    paddingVertical: 10, 
    paddingHorizontal: 30, 
    borderRadius: 8 
  },
  closeModalBtnText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 15 
  }
});