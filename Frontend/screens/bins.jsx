import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { API_URL } from '../src/config';
import { useRouter } from 'expo-router';

export default function BinScreen({ centerId, onBack }) {
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  

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
          
          //formattazione nome 
          const formattedWasteType = bin.wasteType 
            ? bin.wasteType.charAt(0).toUpperCase() + bin.wasteType.slice(1) 
            : 'Rifiuto';

          return (
            <View key={bin._id || index} style={styles.binRow}>
              <View style={styles.binInfoText}>
                {/* MODIFICATO: Usiamo bin.wasteType recuperato dal tuo database */}
                <Text style={styles.binType}>{formattedWasteType}</Text>
                <Text style={[styles.binPercentage, { color: isAlmostFull ? '#cc0000' : '#555' }]}>
                  {bin.fillLevel}% {isAlmostFull ? '⚠️ Quasi Pieno' : ''}
                </Text>
              </View>
              <View style={styles.progressBarBackground}>
                <View style={[
                  styles.progressBarFill, 
                  { 
                    width: `${bin.fillLevel}%`, 
                    backgroundColor: isAlmostFull ? '#cc0000' : (bin.color || '#009933') 
                  }
                ]} />
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.noBinsText}>Nessun bidone monitorato in questo centro.</Text>
      )}
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
  }
});