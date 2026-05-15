import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../src/config';

import Logo from '../src/assets/Riciclapp_Logo.png';
import Info from '../src/assets/Info_rifiuti.png';
import UserDefault from '../src/assets/Profile_image/User_image.png';

const DEFAULT_CENTER = { lat: 46.0667, lon: 11.1333 }; // Trento, Italy
const DEFAULT_ZOOM = 14;
const OFM_STYLE_FALLBACK = 'https://tiles.openfreemap.org/styles/liberty';

// ─── Web map: MapLibre GL JS rendered directly in the browser ────────────────
function WebMap({ targetCenter, styleUrl }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const style = styleUrl || OFM_STYLE_FALLBACK;

  useEffect(() => {
    // Load MapLibre CSS from CDN (Metro bundler doesn't handle CSS imports)
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
    document.head.appendChild(link);

    let map;
    // Dynamic import keeps maplibre-gl out of the native bundle
    import('maplibre-gl').then((mod) => {
      if (!containerRef.current) return;
      const maplibregl = mod.default ?? mod;
      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [DEFAULT_CENTER.lon, DEFAULT_CENTER.lat],
        zoom: DEFAULT_ZOOM,
        attributionControl: true,
      });
      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, [style]);

  useEffect(() => {
    if (!targetCenter || !mapRef.current) return;
    // targetCenter is [lat, lon]; MapLibre expects [lon, lat]
    mapRef.current.flyTo({ center: [targetCenter[1], targetCenter[0]], zoom: 15 });
  }, [targetCenter]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
    />
  );
}

// ─── Native map: MapLibre GL JS in a WebView (requires development build) ───
function NativeMap({ targetCenter, styleUrl }) {
  const webViewRef = useRef(null);
  const [WebView, setWebView] = useState(null);
  const mapStyle = styleUrl || OFM_STYLE_FALLBACK;

  useEffect(() => {
    // Lazy-require so Metro doesn't bundle WebView on web platform
    try {
      const mod = require('react-native-webview');
      setWebView(() => mod.WebView ?? mod.default?.WebView ?? mod.default);
    } catch {
      setWebView(null);
    }
  }, []);

  useEffect(() => {
    if (!targetCenter || !webViewRef.current) return;
    webViewRef.current.postMessage(
      JSON.stringify({ type: 'flyTo', lat: targetCenter[0], lon: targetCenter[1] })
    );
  }, [targetCenter]);

  if (!WebView) {
    return (
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>
          Mappa Android: installa react-native-webview{'\n'}e usa un development build
        </Text>
      </View>
    );
  }

  const mapHtml = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link href="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css" rel="stylesheet">
  <script src="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = new maplibregl.Map({
      container: 'map',
      style: '${mapStyle}',
      center: [${DEFAULT_CENTER.lon}, ${DEFAULT_CENTER.lat}],
      zoom: ${DEFAULT_ZOOM},
    });
    function handleMsg(e) {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'flyTo') map.flyTo({ center: [msg.lon, msg.lat], zoom: 15 });
      } catch (_) {}
    }
    // Both events needed: Android uses document, iOS uses window
    document.addEventListener('message', handleMsg);
    window.addEventListener('message', handleMsg);
  </script>
</body>
</html>`;

  return (
    <WebView
      ref={webViewRef}
      source={{ html: mapHtml }}
      style={{ flex: 1 }}
      javaScriptEnabled
      originWhitelist={['*']}
    />
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [mapCenter, setMapCenter] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [mapStyleUrl, setMapStyleUrl] = useState(OFM_STYLE_FALLBACK);
  const [avatarUri, setAvatarUri] = useState(null);
  const [showInfoCard, setShowInfoCard] = useState(false);

  useEffect(() => {
    // Check auth token
    AsyncStorage.getItem('token').then((token) => setLoggedIn(!!token));
    // Fetch map config from backend (/api/ofm/config)
    fetch(`${API_URL}/ofm/config`)
      .then((r) => r.json())
      .then((data) => { if (data?.styleUrl) setMapStyleUrl(data.styleUrl); })
      .catch(() => {}); // silently fall back to OFM_STYLE_FALLBACK
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('profileAvatarUri').then((uri) => setAvatarUri(uri || null));
    }, [])
  );

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
    <View style={styles.container} onStartShouldSetResponder={() => { if (showInfoCard) { setShowInfoCard(false); } return false; }}>
      {Platform.OS === 'web' ? (
        <WebMap targetCenter={mapCenter} styleUrl={mapStyleUrl} />
      ) : (
        <NativeMap targetCenter={mapCenter} styleUrl={mapStyleUrl} />
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
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.85}
          onPress={() => router.push(loggedIn ? '/profile' : '/auth/register')}
        >
          <Image
            source={avatarUri ? { uri: avatarUri } : UserDefault}
            style={styles.buttonIcon}
          />
        </TouchableOpacity>

        <View style={styles.logoWrapper}>
          {showInfoCard && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Riciclapp</Text>
              <Text style={styles.infoVersion}>Version Alpha 1.0.0</Text>
              <Text style={styles.infoSectionLabel}>Developers</Text>
              <Text style={styles.infoName}>Binco Francesco</Text>
              <Text style={styles.infoName}>Cortese Riccardo</Text>
              <Text style={styles.infoName}>Giovagnetti Lorenzo</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => setShowInfoCard((v) => !v)}
          >
            <Image source={Logo} style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={() => router.push('/informations')}>
          <Image source={Info} style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  mapPlaceholder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#d0e8c0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 22,
  },
  buttonBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  button: {
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
  logoWrapper: {
    alignItems: 'center',
  },
  infoCard: {
    position: 'absolute',
    bottom: 120,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#009933',
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 20,
    minWidth: 180,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#009933',
    marginBottom: 2,
  },
  infoVersion: {
    fontSize: 13,
    color: '#555',
    marginBottom: 10,
  },
  infoSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 4,
  },
  infoName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  buttonIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
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
