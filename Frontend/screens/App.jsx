import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../src/config';

import Logo from '../src/assets/Riciclapp_Logo.png';
import Info from '../src/assets/Info_rifiuti.png';
import User from '../src/assets/User_icon.png';
import Opz from '../src/assets/Opzioni.png';

const DEFAULT_CENTER = [46.0667, 11.1333];
const DEFAULT_ZOOM = 14;

function WebMap({ targetCenter }) {
  const [MapComponents, setMapComponents] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    import('react-leaflet').then((rl) => {
      setMapComponents({ MapContainer: rl.MapContainer, TileLayer: rl.TileLayer });
    });

    return () => { document.head.removeChild(link); };
  }, []);

  // Fly to the selected location whenever targetCenter changes
  useEffect(() => {
    if (targetCenter && mapRef.current) {
      mapRef.current.flyTo(targetCenter, 15);
    }
  }, [targetCenter]);

  if (!MapComponents) return null;

  const { MapContainer, TileLayer } = MapComponents;

  return (
    <MapContainer
      ref={mapRef}
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={StyleSheet.flatten(styles.map)}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
    </MapContainer>
  );
}

export default function App() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [mapCenter, setMapCenter] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('token'); // Controllo se esiste un token di autenticazione
      setLoggedIn(!!token); // Se esiste, l'utente è considerato loggato, altrimenti no
    };
    checkToken();
  }, []);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`${API_URL}/osm/search?q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectResult = (result) => {
    setMapCenter([parseFloat(result.lat), parseFloat(result.lon)]);
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };



  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <WebMap targetCenter={mapCenter} />
      ) : (
        <View style={[styles.map, styles.mapPlaceholder]}>
          <Text style={styles.placeholderText}>Mappa non disponibile su questa piattaforma</Text>
        </View>
      )}

      {/* ── Search Bar ── */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca una location..."
            placeholderTextColor="#9999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator size="small" color="#009933" style={{ marginLeft: 8 }} />}
        </View>

        {/* Results Dropdown */}
        {searchResults.length > 0 && (
          <View style={styles.resultsDropdown}>
            {searchResults.map((result, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.resultItem, i < searchResults.length - 1 && styles.resultItemBorder]}
                activeOpacity={0.7}
                onPress={() => selectResult(result)}
              >
                <Text style={styles.resultIcon}>📍</Text>
                <Text style={styles.resultText} numberOfLines={2}>{result.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── Button Bar ── */}
      <View style={styles.buttonBar}>
        <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={ () => {
            if (loggedIn) {
              router.push('/profile');
            } else {
              router.push('/auth/register');
            }
          }
        }>
          <Image source={User} style={styles.buttonIcon} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} activeOpacity={0.85}>
          <Image source={Logo} style={styles.buttonIcon} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={() => router.push('/informations')}>
          <Image source={Info} style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.smallButton} activeOpacity={0.85}>
        <Image source={Opz} style={{ width: 60, height: 60 }} />
      </TouchableOpacity>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    backgroundColor: '#d0e8c0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#555',
    fontSize: 16,
  },
  buttonBar: {
    flex: 1,
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    position: 'relative',
    alignSelf: 'center',
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 5,
    borderColor: '#009933',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1,
    marginHorizontal: 20,
  },
  smallButton: {
    position: 'relative',
    alignSelf: 'flex-end',
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#fff',
    margin: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1,
  },
  buttonIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  // ── Search Bar ──
  searchBarWrapper: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fff',
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#009933',
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    outlineStyle: 'none',
  },
  // ── Dropdown ──
  resultsDropdown: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  resultItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultIcon: {
    fontSize: 16,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
