import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Dimensions, Image, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../src/config';
import axios from 'axios';

import Logo     from '../../src/assets/Riciclapp_Logo.png';
import WorkImg  from '../../src/assets/Work_in_progess.png';
import admin_report from '../../src/assets/admin_report.png';
import UserDefault from '../../src/assets/Profile_image/User_image.png';

// ── Brand color ──────────────────────────────────────────────────────────────
const PRIMARY = '#C0174D'; // amaranth

// Half viewport height minus top/bottom margins used by the two menus
const MENU_MAX_HEIGHT = Dimensions.get('window').height / 2 - 69;

const DEFAULT_CENTER = { lat: 46.0667, lon: 11.1333 };
const DEFAULT_ZOOM   = 14;
const OFM_STYLE_FALLBACK = 'https://tiles.openfreemap.org/styles/liberty';

// ── Web map (admin is web-only so we only need this variant) ─────────────────
function WebMap({ targetCenter, styleUrl, centers, onCenterClick }) {
  const mapRef       = useRef(null);
  const containerRef = useRef(null);
  const style        = styleUrl || OFM_STYLE_FALLBACK;
  const [maplibreInstance, setMaplibreInstance] = useState(null);
  const markersRef   = useRef([]);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
    document.head.appendChild(link);

    import('maplibre-gl').then((mod) => {
      if (!containerRef.current) return;
      const maplibregl = mod.default ?? mod;
      setMaplibreInstance(maplibregl);
      const map = new maplibregl.Map({
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
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    centers.forEach(center => {
      if (!center.coordinates) return;
      const marker = new maplibreInstance.Marker({ color: PRIMARY })
        .setLngLat([Number(center.coordinates.lng), Number(center.coordinates.lat)])
        .addTo(mapRef.current);
      const popupHtml = `
        <div style="font-family:Arial,sans-serif;padding:5px;cursor:pointer;" id="popup-click-${center._id}">
          <h3 style="color:${PRIMARY};margin:0 0 4px 0;text-decoration:underline;">${center.name}</h3>
          <p style="margin:0;font-size:12px;color:#666;">${center.address || ''}</p>
          <p style="margin:4px 0 0 0;font-size:11px;color:${PRIMARY};font-weight:bold;">👉 Clicca qui per vedere i bidoni</p>
        </div>`;
      const popup = new maplibreInstance.Popup({ offset: 25 }).setHTML(popupHtml);
      popup.once('open', () => {
        setTimeout(() => {
          const el = document.getElementById(`popup-click-${center._id}`);
          if (el) el.onclick = () => onCenterClick(center);
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

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HomeAdminScreen() {
  const router = useRouter();

  // Mobile guard — alert once on mount
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Accesso non disponibile',
        'Admin mode can be reached only via Web, sorry! go on a computer please!',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchResults,  setSearchResults]  = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [mapCenter,      setMapCenter]      = useState(null);
  const [searchError,    setSearchError]    = useState(false);
  const [mapStyleUrl,    setMapStyleUrl]    = useState(OFM_STYLE_FALLBACK);
  const [centers,        setCenters]        = useState([]);
  const [avatarUri,      setAvatarUri]      = useState(null);

  // Dropdown menus
  const [operatorsOpen, setOperatorsOpen] = useState(true);
  const [citizensOpen,  setCitizensOpen]  = useState(true);
  const [operators,     setOperators]     = useState([]);
  const [citizens,      setCitizens]      = useState([]);

  // Card visibility
  const [showInfoCard, setShowInfoCard] = useState(false); // logo / version card

  useEffect(() => {
    axios.get(`${API_URL}/ofm/config`)
      .then(r => { if (r.data?.styleUrl) setMapStyleUrl(r.data.styleUrl); })
      .catch(() => {});
    axios.get(`${API_URL}/centers/all`)
      .then(r => setCenters(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCenters([]));

    // Fetch operators and citizens lists (admin-only endpoints)
    AsyncStorage.getItem('token').then(token => {
      const auth = { headers: { Authorization: `Bearer ${token}` } };
      axios.get(`${API_URL}/admin/users?role=operator`, auth)
        .then(r => setOperators(Array.isArray(r.data) ? r.data : []))
        .catch(() => setOperators([]));
      axios.get(`${API_URL}/admin/users?role=user`, auth)
        .then(r => setCitizens(Array.isArray(r.data) ? r.data : []))
        .catch(() => setCitizens([]));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('profileAvatarUri').then(uri => setAvatarUri(uri || null));
    }, [])
  );

  const handleQueryChange = (text) => {
    setSearchQuery(text);
    setSelectedCenter(null);
    setSearchError(false);
    const q = text.trim().toLowerCase();
    if (!q) { setSearchResults([]); return; }
    setSearchResults(centers.filter(c => c.name.toLowerCase().includes(q)).slice(0, 5));
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

  const closeAllCards = () => {
    setShowInfoCard(false);
  };

  //button per la side bar a sinistra 
  const sideButtons = [
  { id: 0, icon: WorkImg},
  { id: 1, icon: WorkImg},
  //  REPORT ADMIN
  { id: 2, icon: admin_report, label: 'Segnalazioni', onPress: () => router.push('/report_admin') }, 
  { id: 3, icon: WorkImg},
  { id: 4, icon: WorkImg},
];

  // ── Mobile fallback ──────────────────────────────────────────────────────────
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.mobileFallback}>
        <Text style={styles.mobileMessage}>
          Admin mode can be reached only via Web.{'\n'}Please use a computer.
        </Text>
      </View>
    );
  }

  // ── Web view ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container} onStartShouldSetResponder={() => { closeAllCards(); return false; }}>
      <StatusBar style="auto" />

      {/* Map */}
      <WebMap
        targetCenter={mapCenter}
        styleUrl={mapStyleUrl}
        centers={centers}
        onCenterClick={(center) => router.push(`/centers/${center._id}/bins`)}
      />

      {/* ── Search bar ── */}
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

      {/* ── Left vertical tool bar ── */}
      <View style={[styles.sideBar, { zIndex: 10 }]}>
        {sideButtons.map((btn) => (
          <TouchableOpacity
            key={btn.id}
            style={styles.sideButton}
            activeOpacity={0.85}
            onPress={btn.onPress}
          >
            <Image source={btn.icon} style={styles.sideButtonIcon} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Right panels: Operators + Citizens stacked ── */}
      <View style={styles.rightPanels}>

        {/* Operators */}
        <View style={styles.dropdownCard}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Operators</Text>
            <TouchableOpacity
              onPress={() => setOperatorsOpen(v => !v)}
              style={styles.dropdownArrowBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownArrow}>{operatorsOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          </View>
          {operatorsOpen && (
            <ScrollView style={styles.dropdownContent} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {operators.length === 0 ? (
                <Text style={styles.dropdownEmpty}>_ no operators found</Text>
              ) : operators.map((op, i) => (
                <Text key={op._id ?? i} style={styles.dropdownItem}>
                  {'◆  '}{op.name ?? op.username ?? op.email ?? '—'}
                </Text>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Citizens — sits directly below Operators, follows it */}
        <View style={styles.dropdownCard}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Citizens</Text>
            <TouchableOpacity
              onPress={() => setCitizensOpen(v => !v)}
              style={styles.dropdownArrowBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownArrow}>{citizensOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          </View>
          {citizensOpen && (
            <ScrollView style={styles.dropdownContent} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {citizens.length === 0 ? (
                <Text style={styles.dropdownEmpty}>_ no citizens found</Text>
              ) : citizens.map((c, i) => (
                <Text key={c._id ?? i} style={styles.dropdownItem}>
                  {'◆  '}{c.name ?? c.username ?? c.email ?? '—'}
                </Text>
              ))}
            </ScrollView>
          )}
        </View>

      </View>

      {/* ── Button bar ── */}
      <View style={[styles.buttonBar, { zIndex: 10 }]} pointerEvents="box-none">

        {/* LEFT — User info */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => { closeAllCards(); router.push('/profile'); }}
          >
            <Image source={avatarUri ? { uri: avatarUri } : UserDefault} style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>

        {/* CENTER — Logo / version */}
        <View style={styles.buttonWrapper}>
          {showInfoCard && (
            <View style={styles.popupCard}>
              <Text style={styles.popupTitle}>Riciclapp</Text>
              <Text style={styles.popupSub}>Version Alpha 1.0.0</Text>
              <Text style={styles.popupSectionLabel}>Developers</Text>
              <Text style={styles.popupLine}>Binco Francesco</Text>
              <Text style={styles.popupLine}>Cortese Riccardo</Text>
              <Text style={styles.popupLine}>Giovagnetti Lorenzo</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => setShowInfoCard(v => !v)}
          >
            <Image source={Logo} style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>

        {/* RIGHT — Work in progress */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => { closeAllCards(); router.push('/work'); }}
          >
            <Image source={WorkImg} style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },

  mobileFallback: {
    flex: 1, backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center',
  },
  mobileMessage: {
    fontSize: 18, fontWeight: '600', color: '#555',
    textAlign: 'center', paddingHorizontal: 32, lineHeight: 28,
  },

  // Search
  searchBarWrapper: {
    position: 'absolute', top: 50, left: 0, right: 0,
    alignItems: 'center', paddingHorizontal: 24,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 480,
    backgroundColor: '#fff', borderRadius: 30, borderWidth: 2.5, borderColor: PRIMARY,
    paddingHorizontal: 16, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 8,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#222', outlineStyle: 'none' },
  searchErrorBox: {
    width: '100%', maxWidth: 480, backgroundColor: '#d32f2f',
    borderRadius: 10, marginTop: 6, paddingVertical: 8,
    paddingHorizontal: 16, alignItems: 'center',
  },
  searchErrorText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  resultsDropdown: {
    width: '100%', maxWidth: 480, backgroundColor: '#fff',
    borderRadius: 16, marginTop: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 10, overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  resultItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  resultIcon: { fontSize: 16 },
  resultText: { fontSize: 14, color: '#333', lineHeight: 20 },
  resultSubText: { fontSize: 12, color: '#888', lineHeight: 16 },

  // Left vertical tool bar
  sideBar: {
    position: 'absolute',
    left: 64,
    top: 64,
    bottom: 64,
    backgroundColor: '#444',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  sideButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#fff',
    borderWidth: 5,
    borderColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  sideButtonIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },

  // Button bar
  buttonBar: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 24,
  },
  buttonWrapper: { alignItems: 'center' },
  button: {
    width: 110, height: 110, borderRadius: 55, overflow: 'hidden',
    backgroundColor: '#fff', borderWidth: 5, borderColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8, marginHorizontal: 20,
  },
  buttonIcon: { width: 100, height: 100, resizeMode: 'contain' },

  // ── Dropdown menus ────────────────────────────────────────────────────────────
  rightPanels: {
    position: 'absolute',
    top: 64,
    right: 64,
    width: 300,
    zIndex: 15,
    flexDirection: 'column',
    gap: 8,
  },
  dropdownCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  dropdownHeader: {
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dropdownTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dropdownArrowBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dropdownArrow: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownContent: {
    backgroundColor: 'rgba(15, 15, 15, 0.88)',
    maxHeight: MENU_MAX_HEIGHT - 46, // subtract header height
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  dropdownItem: {
    color: '#FFD700',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier New',
    fontSize: 13,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  dropdownEmpty: {
    color: 'rgba(255, 215, 0, 0.5)',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier New',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },

  // Popup cards
  popupCard: {
    position: 'absolute', bottom: 120,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 2, borderColor: PRIMARY,
    paddingVertical: 14, paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 12, zIndex: 20, minWidth: 180,
  },
  popupTitle: { fontSize: 18, fontWeight: '700', color: PRIMARY, marginBottom: 2 },
  popupSub:   { fontSize: 13, color: '#555', marginBottom: 10 },
  popupSectionLabel: { fontSize: 13, fontWeight: '700', color: PRIMARY, marginBottom: 4 },
  popupLine:  { fontSize: 14, color: '#333', marginBottom: 2 },
  popupBadge: {
    marginTop: 4, borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3,
    fontSize: 13, fontWeight: '700',
  },
});
