import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../src/config';
import { useRouter } from 'expo-router';

export default function RewardsScreen() {
  const router = useRouter();

  // Stati per lista premi
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchRewards();
  }, []);

  // Recupera da MongoDB la lista dei premi e attività commerciali
  const fetchRewards = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const response = await axios.get(`${API_URL}/rewards`);
      setRewards(response.data || []);
    } catch (error) {
      console.error('Errore recupero premi:', error);
      setErrorMessage('Errore nel caricamento della lista premi.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#009933" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButtonInline} onPress={() => router.back()}>
        <Text style={styles.backButtonInlineText}>⬅ Indietro</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Lista Premi</Text>
      <Text style={styles.subtitle}>
        Attività commerciali che offrono sconti in cambio di punti.
      </Text>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {rewards.length > 0 ? (
        rewards.map((reward) => (
          <View key={reward._id} style={styles.rewardCard}>
            <View style={styles.rewardHeader}>
              <Text style={styles.partnerName}>
                {reward.partnerName || 'Attività commerciale'}
              </Text>

              <Text style={styles.pointsBadge}>
                {reward.pointsCost || 0} pt
              </Text>
            </View>

            <Text style={styles.rewardName}>
              {reward.name || 'Premio'}
            </Text>

            <Text style={styles.rewardDescription}>
              {reward.description || 'Nessuna descrizione disponibile'}
            </Text>

            <View style={styles.cardFooter}>
              <Text style={styles.partnerAddress}>
                📍 {reward.partnerAddress || 'Indirizzo non disponibile'}
              </Text>

              <Text style={styles.availabilityText}>
                Disponibili: {reward.availability ?? 'N/D'}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>
          Nessun premio disponibile al momento.
        </Text>
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
    alignItems: 'center'
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
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333'
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 6,
    marginBottom: 20
  },
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  partnerName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#009933',
    flex: 1,
    marginRight: 8
  },
  pointsBadge: {
    backgroundColor: '#e8f5e9',
    color: '#009933',
    fontWeight: 'bold',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    overflow: 'hidden'
  },
  rewardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6
  },
  rewardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10
  },
  partnerAddress: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4
  },
  availabilityText: {
    fontSize: 13,
    color: '#777',
    fontWeight: '600'
  },
  errorText: {
    color: '#cc0000',
    marginBottom: 14,
    fontWeight: '600'
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    marginTop: 30
  }
});