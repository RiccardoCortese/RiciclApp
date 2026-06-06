// ── Recycling event — management screen ──────────────────────────────────────
// Reachable from the third button of the admin bottom bar. Lists the recycling
// events that are currently running, those scheduled for the future and those
// already ended, and offers a button that starts the creation of a new event
// (which happens on the admin map, see Home_admin.jsx ▸ event-creation mode).
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { API_URL } from '../../src/config';

const AMARANTH = '#C0174D';

// "gg/mm/aaaa hh:mm" — compact Italian date-time for the event cards.
function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventCard({ event }) {
  const types = (event.wasteTypes || []).join(', ') || '—';
  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{event.name}</Text>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Inizio</Text>
        <Text style={styles.cardValue}>{formatDateTime(event.startDate)}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Fine</Text>
        <Text style={styles.cardValue}>{formatDateTime(event.endDate)}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Raggio</Text>
        <Text style={styles.cardValue}>{event.radius} m</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Boost</Text>
        <Text style={[styles.cardValue, styles.boostValue]}>x{event.boost}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Rifiuti potenziati</Text>
        <Text style={styles.cardValue}>{types}</Text>
      </View>
    </View>
  );
}

function Section({ title, events, emptyText }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title} ({events.length})</Text>
      {events.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : (
        events.map((e) => <EventCard key={e._id} event={e} />)
      )}
    </View>
  );
}

export default function EventManagementAdmin() {
  const router = useRouter();

  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const fetchEvents = useCallback(() => {
    setError(false);
    axios.get(`${API_URL}/events/all`)
      .then((r) => setEvents(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { fetchEvents(); }, [fetchEvents]));

  // Bucket the events by their time window relative to now.
  const now      = Date.now();
  const ongoing  = events.filter((e) => +new Date(e.startDate) <= now && +new Date(e.endDate) > now);
  const upcoming = events.filter((e) => +new Date(e.startDate) > now);
  const ended    = events.filter((e) => +new Date(e.endDate) <= now);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header: centered title + close button (top-right → Home) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Eventi di Raccolta</Text>
        <TouchableOpacity
          style={styles.closeButton}
          activeOpacity={0.8}
          onPress={() => router.replace('/(admin)')}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Start the creation of a new recycling event */}
        <TouchableOpacity
          style={styles.createButton}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: '/(admin)', params: { mode: 'createEvent' } })}
        >
          <Text style={styles.createButtonText}>＋  Crea nuovo evento di raccolta</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={AMARANTH} />
            <Text style={styles.stateText}>Caricamento eventi…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateIcon}>⚠️</Text>
            <Text style={styles.stateText}>Impossibile caricare gli eventi.</Text>
            <TouchableOpacity style={styles.retryBtn} activeOpacity={0.8} onPress={fetchEvents}>
              <Text style={styles.retryTxt}>Riprova</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Section title="Eventi in corso"   events={ongoing}  emptyText="Nessun evento attualmente in corso." />
            <Section title="Eventi programmati" events={upcoming} emptyText="Nessun evento programmato." />
            <Section title="Eventi conclusi"    events={ended}    emptyText="Nessun evento concluso." />
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  header: {
    backgroundColor: AMARANTH,
    paddingTop: 20,
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
    zIndex: 10,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 0.3 },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 20, maxWidth: 720, width: '100%', alignSelf: 'center' },

  createButton: {
    backgroundColor: AMARANTH,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: AMARANTH,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
  },
  empty: { fontSize: 14, color: '#999', fontStyle: 'italic', paddingVertical: 6 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: AMARANTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  cardRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 5, gap: 12,
  },
  cardLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  cardValue: { fontSize: 14, color: '#222', flex: 1, textAlign: 'right' },
  boostValue: { color: AMARANTH, fontWeight: '800' },

  stateBox: { alignItems: 'center', paddingVertical: 50, gap: 12 },
  stateIcon: { fontSize: 40 },
  stateText: { fontSize: 16, color: '#666' },
  retryBtn: { marginTop: 6, backgroundColor: AMARANTH, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
