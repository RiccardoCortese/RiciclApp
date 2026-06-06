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

// Grey colour used for the bin markers shown on the map.
const BIN_GREY = '#9E9E9E';

// Recycling-event circle colours (shared look with the admin map).
const EVENT_FILL    = '#FFEB3B';
const EVENT_OUTLINE = '#000000';

// "gg/mm/aaaa hh:mm" — compact Italian date-time for event popups.
function formatEventDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// GeoJSON polygon approximating a metric circle around (lat,lng).
function circlePolygon(lat, lng, radiusMeters, steps = 64) {
  const coords = [];
  const latR = radiusMeters / 111320;
  const lngR = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    coords.push([lng + lngR * Math.cos(a), lat + latR * Math.sin(a)]);
  }
  return { type: 'Polygon', coordinates: [coords] };
}

function eventsToFeatureCollection(events) {
  return {
    type: 'FeatureCollection',
    features: (events || [])
      .filter(e => Number.isFinite(Number(e?.coordinates?.lat)) && Number.isFinite(Number(e?.coordinates?.lng)))
      .map(e => ({
        type: 'Feature',
        properties: { id: String(e._id), name: e.name || '' },
        geometry: circlePolygon(Number(e.coordinates.lat), Number(e.coordinates.lng), Number(e.radius) || 0),
      })),
  };
}

// HTML shown in the click popup of an event circle (citizen — read only).
function eventPopupHtml(e) {
  const types = (e.wasteTypes || []).join(', ') || '—';
  return `
    <div style="font-family:Arial,sans-serif;padding:6px;min-width:200px;">
      <h3 style="color:#222;margin:0 0 6px 0;">${e.name || 'Evento'}</h3>
      <p style="margin:2px 0;font-size:12px;color:#666;">📅 Inizio: <b>${formatEventDateTime(e.startDate)}</b></p>
      <p style="margin:2px 0;font-size:12px;color:#666;">🏁 Fine: <b>${formatEventDateTime(e.endDate)}</b></p>
      <p style="margin:2px 0;font-size:12px;color:#666;">📏 Raggio: <b>${e.radius} m</b></p>
      <p style="margin:2px 0;font-size:12px;color:#666;">♻️ Rifiuti potenziati: <b>${types}</b></p>
      <p style="margin:6px 0 0 0;font-size:13px;color:#C0174D;font-weight:bold;">⚡ Punti x${e.boost} nell'area</p>
    </div>`;
}

// ------- Web map -------
function WebMap({ targetCenter, styleUrl, centers, bins = [], events = [], onCenterClick }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const style = styleUrl || OFM_STYLE_FALLBACK;
  const [maplibreInstance, setMaplibreInstance] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef([]);
  const binMarkersRef = useRef([]);
  const eventLabelsRef = useRef([]);

  // Keep the latest events reachable from the once-only click handler.
  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; }, [events]);

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

      map.on('load', () => {
        // Recycling-event circles: translucent yellow fill + black outline.
        map.addSource('events', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'events-fill', type: 'fill', source: 'events',
          paint: { 'fill-color': EVENT_FILL, 'fill-opacity': 0.35 },
        });
        map.addLayer({
          id: 'events-line', type: 'line', source: 'events',
          paint: { 'line-color': EVENT_OUTLINE, 'line-width': 2 },
        });
        // Click an event circle → show its characteristics (read only).
        map.on('click', 'events-fill', (e) => {
          if (!e.features.length) return;
          const ev = eventsRef.current.find(x => String(x._id) === String(e.features[0].properties.id));
          if (!ev) return;
          new maplibregl.Popup({ offset: 8 }).setLngLat(e.lngLat).setHTML(eventPopupHtml(ev)).addTo(map);
        });
        map.on('mouseenter', 'events-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'events-fill', () => { map.getCanvas().style.cursor = ''; });
        setMapReady(true);
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, [style]);

  // Draw the event circles + a centred name label per event.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !maplibreInstance) return;
    map.getSource('events')?.setData(eventsToFeatureCollection(events));

    eventLabelsRef.current.forEach(m => m.remove());
    eventLabelsRef.current = [];
    (events || []).forEach((e) => {
      const lat = Number(e?.coordinates?.lat);
      const lng = Number(e?.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const el = document.createElement('div');
      el.textContent = e.name || '';
      el.style.cssText =
        'font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#000;' +
        'text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;white-space:nowrap;pointer-events:none;';
      const marker = new maplibreInstance.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      eventLabelsRef.current.push(marker);
    });
  }, [events, mapReady, maplibreInstance]);

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

  // Grey bin markers with a minimal banner: name, waste types, connected center.
  useEffect(() => {
    if (!mapRef.current || !maplibreInstance) return;
    binMarkersRef.current.forEach(m => m.remove());
    binMarkersRef.current = [];
    const centersById = {};
    (centers || []).forEach(c => { if (c?._id) centersById[String(c._id)] = c.name; });
    (bins || []).forEach(bin => {
      const lat = Number(bin?.coordinates?.lat);
      const lng = Number(bin?.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const types = (bin.wasteTypes?.length ? bin.wasteTypes : [bin.wasteType]).filter(Boolean).join(', ');
      const centerName = bin.centerId ? (centersById[String(bin.centerId)] || null) : null;
      const marker = new maplibreInstance.Marker({ color: BIN_GREY })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
      const popup = new maplibreInstance.Popup({ offset: 25 }).setHTML(`
        <div style="font-family:Arial,sans-serif;padding:5px;min-width:170px;">
          <h3 style="color:#444;margin:0 0 4px 0;">${bin.name || 'Bidone'}</h3>
          <p style="margin:0;font-size:12px;color:${BIN_GREY};font-weight:bold;">${types || '—'}</p>
          <p style="margin:6px 0 0 0;font-size:12px;color:#666;">🏢 ${centerName || 'Nessun centro collegato'}</p>
        </div>`);
      marker.setPopup(popup);
      binMarkersRef.current.push(marker);
    });
  }, [bins, centers, maplibreInstance]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  );
}

// ---- Native map -----
function NativeMap({ targetCenter, styleUrl, centers, bins = [], events = [], onCenterClick }) {
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
    const bins = ${JSON.stringify(bins || [])};
    const events = ${JSON.stringify(events || [])};
    const centersById = {};
    centers.forEach(c => { if (c && c._id) centersById[String(c._id)] = c.name; });

    function circlePolygon(lat, lng, radiusMeters, steps) {
      steps = steps || 64;
      const coords = [];
      const latR = radiusMeters / 111320;
      const lngR = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180));
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * 2 * Math.PI;
        coords.push([lng + lngR * Math.cos(a), lat + latR * Math.sin(a)]);
      }
      return { type: 'Polygon', coordinates: [coords] };
    }
    function fmtDate(v) {
      const d = new Date(v);
      if (isNaN(d.getTime())) return '—';
      const p = (n) => String(n).padStart(2, '0');
      return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    map.on('load', () => {
      // Recycling-event circles + centred name labels + click popups.
      const eventFeatures = events
        .filter(e => e && e.coordinates && e.coordinates.lat != null && e.coordinates.lng != null)
        .map(e => ({ type: 'Feature', properties: { id: String(e._id) },
          geometry: circlePolygon(Number(e.coordinates.lat), Number(e.coordinates.lng), Number(e.radius) || 0) }));
      map.addSource('events', { type: 'geojson', data: { type: 'FeatureCollection', features: eventFeatures } });
      map.addLayer({ id: 'events-fill', type: 'fill', source: 'events',
        paint: { 'fill-color': '${EVENT_FILL}', 'fill-opacity': 0.35 } });
      map.addLayer({ id: 'events-line', type: 'line', source: 'events',
        paint: { 'line-color': '${EVENT_OUTLINE}', 'line-width': 2 } });

      events.forEach((e) => {
        if (!e || !e.coordinates || e.coordinates.lat == null || e.coordinates.lng == null) return;
        const el = document.createElement('div');
        el.textContent = e.name || '';
        el.style.cssText = 'font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#000;text-shadow:0 0 3px #fff,0 0 3px #fff;white-space:nowrap;pointer-events:none;';
        new maplibregl.Marker({ element: el }).setLngLat([Number(e.coordinates.lng), Number(e.coordinates.lat)]).addTo(map);
      });

      const eventsById = {};
      events.forEach(e => { if (e && e._id) eventsById[String(e._id)] = e; });
      map.on('click', 'events-fill', (ev) => {
        if (!ev.features.length) return;
        const e = eventsById[String(ev.features[0].properties.id)];
        if (!e) return;
        const types = ((e.wasteTypes && e.wasteTypes.length) ? e.wasteTypes : []).join(', ') || '—';
        const html = '<div style="font-family:Arial,sans-serif;padding:6px;min-width:190px;">'
          + '<h3 style="color:#222;margin:0 0 6px 0;">' + (e.name || 'Evento') + '</h3>'
          + '<p style="margin:2px 0;font-size:12px;color:#666;">📅 Inizio: <b>' + fmtDate(e.startDate) + '</b></p>'
          + '<p style="margin:2px 0;font-size:12px;color:#666;">🏁 Fine: <b>' + fmtDate(e.endDate) + '</b></p>'
          + '<p style="margin:2px 0;font-size:12px;color:#666;">📏 Raggio: <b>' + e.radius + ' m</b></p>'
          + '<p style="margin:2px 0;font-size:12px;color:#666;">♻️ ' + types + '</p>'
          + '<p style="margin:6px 0 0 0;font-size:13px;color:#C0174D;font-weight:bold;">⚡ Punti x' + e.boost + ' nell\\'area</p>'
          + '</div>';
        new maplibregl.Popup({ offset: 8 }).setLngLat(ev.lngLat).setHTML(html).addTo(map);
      });

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

      // Grey bin markers with a minimal info popup (view only)
      bins.forEach((bin) => {
        if (!bin.coordinates || !bin.coordinates.lng || !bin.coordinates.lat) return;
        const types = ((bin.wasteTypes && bin.wasteTypes.length) ? bin.wasteTypes : [bin.wasteType]).filter(Boolean).join(', ');
        const centerName = bin.centerId ? (centersById[String(bin.centerId)] || null) : null;
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
          '<div style="font-family:Arial,sans-serif;padding:5px;min-width:160px;">'
          + '<h3 style="color:#444;margin:0 0 4px 0;">' + (bin.name || 'Bidone') + '</h3>'
          + '<p style="margin:0;font-size:12px;color:#9E9E9E;font-weight:bold;">' + (types || '—') + '</p>'
          + '<p style="margin:6px 0 0 0;font-size:12px;color:#666;">🏢 ' + (centerName || 'Nessun centro collegato') + '</p>'
          + '</div>'
        );
        new maplibregl.Marker({ color: '#9E9E9E' })
          .setLngLat([Number(bin.coordinates.lng), Number(bin.coordinates.lat)])
          .setPopup(popup)
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
      key={`map-centers-${centers.length}-bins-${bins.length}-events-${events.length}`}
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
  const [bins, setBins] = useState([]);
  const [events, setEvents] = useState([]);

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

    axios.get(`${API_URL}/centers/bins`)
      .then((response) => {
        setBins(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => setBins([]));

    // Recycling events (visible read-only to citizens).
    axios.get(`${API_URL}/events/all`)
      .then((response) => {
        setEvents(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => setEvents([]));
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
          bins={bins}
          events={events}
          onCenterClick={(center) => router.push(`/centers/${center._id}/bins`)} />
      ) : (
        <NativeMap
          targetCenter={mapCenter}
          styleUrl={mapStyleUrl}
          centers={centers}
          bins={bins}
          events={events}
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
