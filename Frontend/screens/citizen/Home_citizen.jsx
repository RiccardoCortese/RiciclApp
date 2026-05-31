import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../src/config';

import Logo from '../../src/assets/Riciclapp_Logo.png';
import Info from '../../src/assets/Info_rifiuti.png';
import UserDefault from '../../src/assets/Profile_image/User_image.png';
import axios from 'axios';

const DEFAULT_CENTER = { lat: 46.0667, lon: 11.1333 };
const DEFAULT_ZOOM = 14;
const OFM_STYLE_FALLBACK = 'https://tiles.openfreemap.org/styles/liberty';

// ------- Web map -------
function WebMap({ targetCenter, styleUrl, centers, onCenterClick }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const style = styleUrl || OFM_STYLE_FALLBACK;
  const [maplibreInstance, setMaplibreInstance] = useState(null);
  const markersRef = useRef([]);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
    document.head.appendChild(link);

    let map;
    import('maplibre-gl').then((mod) => {
      if (!containerRef.current) return;
      const maplibregl = mod.default ?? mod;

      setMaplibreInstance(maplibregl);

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
    mapRef.current.flyTo({ center: [targetCenter[1], targetCenter[0]], zoom: 15 });
  }, [targetCenter]);

  useEffect(() => {
    if (!mapRef.current || !maplibreInstance) return;

    const map = mapRef.current;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    centers.forEach(center => {
      if (!center.coordinates) return;

      const marker = new maplibreInstance.Marker({ color: 'green' })
        .setLngLat([Number(center.coordinates.lng), Number(center.coordinates.lat)])
        .addTo(map);

      const popupHtml = `
          <div style="font-family: Arial, sans-serif; padding: 5px; cursor: pointer;" id="popup-click-${center._id}">
            <h3 style="color: #009933; margin: 0 0 4px 0; text-decoration: underline;">${center.name}</h3>
            <p style="margin: 0; font-size: 12px; color: #666;">${center.address || ''}</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #009933; font-weight: bold;">👉 Clicca qui per vedere i bidoni</p>
          </div>
        `;
      const popup = new maplibreInstance.Popup({ offset: 25 }).setHTML(popupHtml);
      popup.once('open', () => {
        setTimeout(() => {
          const container = document.getElementById(`popup-click-${center._id}`);
          if (container) {
            container.onclick = () => { onCenterClick(center); };
          }
        }, 50);
      });
      marker.setPopup(popup);

      markersRef.current.push(marker);
    });
  }, [centers, maplibreInstance]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  );
}

// ---- Native map -----
function NativeMap({ targetCenter, styleUrl, centers, onCenterClick }) {
  const webViewRef = useRef(null);
  const [WebView, setWebView] = useState(null);
  const mapStyle = styleUrl || OFM_STYLE_FALLBACK;

  useEffect(() => {
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

  const handleOnMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'centerClicked' && data.center) {
        onCenterClick(data.center);
      }
    } catch (error) {
      console.error("Errore nel ricevere il messaggio dalla WebView:", error);
    }
  };

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link href="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css" rel="stylesheet">
  <script src="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .custom-marker { width: 35px !important; height: 35px !important; cursor: pointer; }
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

    const centers = ${JSON.stringify(centers || [])};

    map.on('load', () => {
      centers.forEach((center, index) => {
        if (!center.coordinates || !center.coordinates.lng || !center.coordinates.lat) return;

        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.innerHTML = \`
          <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#009933"/>
          </svg>
        \`;

        function triggerClick() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'centerClicked',
              center: centers[index]
            }));
          }
        }

        el.addEventListener('touchend', (e) => { e.stopPropagation(); triggerClick(); });
        el.addEventListener('click', (e) => { e.stopPropagation(); triggerClick(); });

        new maplibregl.Marker({ element: el })
          .setLngLat([Number(center.coordinates.lng), Number(center.coordinates.lat)])
          .addTo(map);
      });
    });

    document.addEventListener('message', function(e) {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'flyTo') map.flyTo({ center: [msg.lon, msg.lat], zoom: 15 });
      } catch (_) {}
    });
  </script>
</body>
</html>`;

  return (
    <WebView
      ref={webViewRef}
      key={`map-centers-${centers.length}`}
      source={{ html: mapHtml }}
      style={{ flex: 1 }}
      javaScriptEnabled
      domStorageEnabled={true}
      originWhitelist={['*']}
      mixedContentMode="always"
      onMessage={handleOnMessage}
    />
  );
}

// ------- Main screen (logged-in citizen) -------
export default function HomeCitizenScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [searchError, setSearchError] = useState(false);
  const [mapStyleUrl, setMapStyleUrl] = useState(OFM_STYLE_FALLBACK);
  const [avatarUri, setAvatarUri] = useState(null);
  const [showInfoCard, setShowInfoCard] = useState(false);
  const [centers, setCenters] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/ofm/config`)
      .then((response) => {
        if (response.data?.styleUrl) setMapStyleUrl(response.data.styleUrl);
      })
      .catch(() => {});

    axios.get(`${API_URL}/centers/all`)
      .then((response) => {
        setCenters(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => setCenters([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('profileAvatarUri').then((uri) => setAvatarUri(uri || null));
    }, [])
  );

  const handleQueryChange = (text) => {
    setSearchQuery(text);
    setSelectedCenter(null);
    setSearchError(false);
    const q = text.trim().toLowerCase();
    if (!q) { setSearchResults([]); return; }
    const matches = centers.filter(c => c.name.toLowerCase().includes(q)).slice(0, 5);
    setSearchResults(matches);
  };

  const selectCenter = (center) => {
    setSearchQuery(center.name);
    setSelectedCenter(center);
    setSearchResults([]);
  };

  const handleSearch = () => {
    setSearchResults([]);
    setSearchError(false);
    const target = selectedCenter || centers.find(
      c => c.name.toLowerCase() === searchQuery.trim().toLowerCase()
    );
    if (target?.coordinates) {
      setMapCenter([target.coordinates.lat, target.coordinates.lng]);
    } else {
      setSearchError(true);
      setTimeout(() => setSearchError(false), 2500);
    }
  };

  return (
    <View style={styles.container} onStartShouldSetResponder={() => { if (showInfoCard) { setShowInfoCard(false); } return false; }}>
      {Platform.OS === 'web' ? (
        <WebMap
          targetCenter={mapCenter}
          styleUrl={mapStyleUrl}
          centers={centers}
          onCenterClick={(center) => router.push(`/centers/${center._id}/bins`)} />
      ) : (
        <NativeMap
          targetCenter={mapCenter}
          styleUrl={mapStyleUrl}
          centers={centers}
          onCenterClick={(center) => router.push(`/centers/${center._id}/bins`)} />
      )}

      {/* ── Search Bar ── */}
      <View style={[styles.searchBarWrapper, { zIndex: 10 }]} pointerEvents="box-none">
        <View style={styles.searchBar}>
          <TouchableOpacity onPress={handleSearch} activeOpacity={0.7}>
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca una location..."
            placeholderTextColor="#9999"
            value={searchQuery}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        {searchError && (
          <View style={styles.searchErrorBox}>
            <Text style={styles.searchErrorText}>Location not found</Text>
          </View>
        )}

        {searchResults.length > 0 && (
          <View style={styles.resultsDropdown}>
            {searchResults.map((center, i) => (
              <TouchableOpacity
                key={center._id ?? i}
                style={[styles.resultItem, i < searchResults.length - 1 && styles.resultItemBorder]}
                activeOpacity={0.7}
                onPress={() => selectCenter(center)}
              >
                <Text style={styles.resultIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultText} numberOfLines={1}>{center.name}</Text>
                  {center.address ? <Text style={styles.resultSubText} numberOfLines={1}>{center.address}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── Button Bar ── */}
      <View style={[styles.buttonBar, { zIndex: 10 }]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.85}
          onPress={() => router.push('/profile')}
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
  container: { flex: 1, position: 'relative' },
  mapPlaceholder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#d0e8c0', alignItems: 'center', justifyContent: 'center',
  },
  placeholderText: { color: '#555', fontSize: 14, textAlign: 'center', paddingHorizontal: 24, lineHeight: 22 },
  buttonBar: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  button: {
    width: 110, height: 110, borderRadius: 55, overflow: 'hidden',
    backgroundColor: '#fff', borderWidth: 5, borderColor: '#009933',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8, zIndex: 1, marginHorizontal: 20,
  },
  logoWrapper: { alignItems: 'center' },
  infoCard: {
    position: 'absolute', bottom: 120,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 2, borderColor: '#009933',
    paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 12, zIndex: 20, minWidth: 180,
  },
  infoTitle: { fontSize: 18, fontWeight: '700', color: '#009933', marginBottom: 2 },
  infoVersion: { fontSize: 13, color: '#555', marginBottom: 10 },
  infoSectionLabel: { fontSize: 13, fontWeight: '700', color: '#2e7d32', marginBottom: 4 },
  infoName: { fontSize: 14, color: '#333', marginBottom: 2 },
  buttonIcon: { width: 100, height: 100, resizeMode: 'contain' },
  searchBarWrapper: {
    position: 'absolute', top: 50, left: 0, right: 0,
    alignItems: 'center', zIndex: 10, paddingHorizontal: 24,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 480,
    backgroundColor: '#fff', borderRadius: 30, borderWidth: 2.5, borderColor: '#009933',
    paddingHorizontal: 16, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 8,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchErrorBox: {
    width: '100%', maxWidth: 480, backgroundColor: '#d32f2f',
    borderRadius: 10, marginTop: 6, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center',
  },
  searchErrorText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  searchInput: { flex: 1, fontSize: 15, color: '#222', outlineStyle: 'none' },
  resultsDropdown: {
    width: '100%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 16, marginTop: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10, overflow: 'hidden',
  },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  resultItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  resultIcon: { fontSize: 16 },
  resultText: { fontSize: 14, color: '#333', lineHeight: 20 },
  resultSubText: { fontSize: 12, color: '#888', lineHeight: 16 },
});
