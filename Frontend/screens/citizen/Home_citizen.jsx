import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Platform, StyleSheet,
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


// True when a center/bin marker visually covers the given screen point. Markers
// are drawn above the event circles, so when one sits on the clicked spot it
// wins the interaction (its own popup handles the click) and the event handler
// stands down. When no marker is there, the click falls through to the event.
function markerCoversPoint(map, items, point) {
  if (!map || !point || !Array.isArray(items)) return false;
  const HALF_W = 16, ABOVE = 42, BELOW = 4; // default maplibre pin, anchored at its tip
  for (const it of items) {
    const lat = Number(it?.coordinates?.lat);
    const lng = Number(it?.coordinates?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const p = map.project([lng, lat]);
    if (point.x >= p.x - HALF_W && point.x <= p.x + HALF_W &&
        point.y >= p.y - ABOVE && point.y <= p.y + BELOW) {
      return true;
    }
  }
  return false;
}

// ------- Web map -------
function WebMap({ targetCenter, styleUrl, centers, bins = [], events = [], onCenterClick, onEventClick }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const style = styleUrl || OFM_STYLE_FALLBACK;
  const [maplibreInstance, setMaplibreInstance] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef([]);
  const binMarkersRef = useRef([]);
  const eventLabelsRef = useRef([]);

  // Keep the latest events + click callback reachable from once-only handlers.
  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; }, [events]);
  const onEventClickRef = useRef(onEventClick);
  useEffect(() => { onEventClickRef.current = onEventClick; }, [onEventClick]);

  // Latest centers/bins, reachable from the once-only event click handler so it
  // can yield to a bin/center marker sitting on top of the clicked spot.
  const centersRef = useRef(centers);
  useEffect(() => { centersRef.current = centers; }, [centers]);
  const binsRef = useRef(bins);
  useEffect(() => { binsRef.current = bins; }, [bins]);

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
        // Click an event circle → open the characteristics modal (with join btn).
        map.on('click', 'events-fill', (e) => {
          if (!e.features.length) return;
          // A bin/center marker on this spot is a level above the event → it wins.
          if (markerCoversPoint(map, [...(centersRef.current || []), ...(binsRef.current || [])], e.point)) return;
          const ev = eventsRef.current.find(x => String(x._id) === String(e.features[0].properties.id));
          if (ev) onEventClickRef.current?.(ev);
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
function NativeMap({ targetCenter, styleUrl, centers, bins = [], events = [], onCenterClick, onEventClick }) {
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
      } else if (data.type === 'eventClicked' && data.id) {
        const ev = (events || []).find(x => String(x._id) === String(data.id));
        if (ev) onEventClick?.(ev);
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
    // A bin/center marker on the clicked spot is a level above the event circle,
    // so it wins the interaction; only an empty spot falls through to the event.
    function markerCoversPoint(point) {
      const HALF_W = 16, ABOVE = 42, BELOW = 4;
      const items = centers.concat(bins);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || !it.coordinates) continue;
        const lat = Number(it.coordinates.lat), lng = Number(it.coordinates.lng);
        if (!isFinite(lat) || !isFinite(lng)) continue;
        const p = map.project([lng, lat]);
        if (point.x >= p.x - HALF_W && point.x <= p.x + HALF_W &&
            point.y >= p.y - ABOVE && point.y <= p.y + BELOW) return true;
      }
      return false;
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

      // Click an event circle → notify React Native to open the modal (with the
      // "Partecipa" button). The webview cannot perform the authenticated join.
      map.on('click', 'events-fill', (ev) => {
        if (!ev.features.length) return;
        if (markerCoversPoint(ev.point)) return; // a bin/center on top wins
        const id = String(ev.features[0].properties.id);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'eventClicked', id: id }));
        }
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
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [searchError, setSearchError] = useState(false);
  const [mapStyleUrl, setMapStyleUrl] = useState(OFM_STYLE_FALLBACK);
  const [avatarUri, setAvatarUri] = useState(null);
  const [showInfoCard, setShowInfoCard] = useState(false);
  const [centers, setCenters] = useState([]);
  const [bins, setBins] = useState([]);
  const [events, setEvents] = useState([]);
  const [viewingEvent, setViewingEvent] = useState(null); // event shown in the modal
  const [currentUserId, setCurrentUserId] = useState(null);
  const [joining, setJoining] = useState(false);
  const [endedPopup, setEndedPopup] = useState(null);     // {events:[{name}], points} after settle

  // Only events that have not ended are shown on the map / searchable.
  const activeEvents = events.filter((e) => +new Date(e.endDate) > Date.now());

  const fetchEvents = useCallback(() => {
    axios.get(`${API_URL}/events/all`)
      .then((response) => setEvents(Array.isArray(response.data) ? response.data : []))
      .catch(() => setEvents([]));
  }, []);

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
    fetchEvents();

    // Current user id, used to tell whether the citizen already joined an event.
    AsyncStorage.getItem('user').then((stored) => {
      try {
        const u = stored ? JSON.parse(stored) : null;
        setCurrentUserId(u?.id || u?._id || null);
      } catch { setCurrentUserId(null); }
    });

    // Settle any events that ended while the user was away: awards +10 once per
    // event and surfaces a thank-you popup. Refreshes the list afterwards so the
    // concluded events drop off the map.
    AsyncStorage.getItem('token').then((token) => {
      if (!token) return;
      axios.post(`${API_URL}/events/settle`, {}, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => {
          const s = Array.isArray(r.data?.settled) ? r.data.settled : [];
          if (s.length > 0) {
            setEndedPopup({ events: s, points: r.data?.pointsAwarded ?? s.length * 10 });
            fetchEvents();
          }
        })
        .catch(() => {});
    });
  }, [fetchEvents]);

  // Whether the current citizen is already a participant of the given event.
  const isJoined = (ev) =>
    !!currentUserId && (ev?.participants || []).some((p) => String(p) === String(currentUserId));

  // Join the currently-viewed event → unlocks its point boost on matching scans.
  const joinEvent = async () => {
    if (!viewingEvent || joining) return;
    if (isJoined(viewingEvent)) return;
    setJoining(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const { data } = await axios.post(
        `${API_URL}/events/${viewingEvent._id}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (data?.event) {
        setViewingEvent(data.event);              // reflect joined state in the modal
        setEvents((prev) => prev.map((e) => (String(e._id) === String(data.event._id) ? data.event : e)));
      } else {
        fetchEvents();
      }
      Alert.alert('Iscrizione effettuata', `Ora ricevi i punti x${viewingEvent.boost} sui rifiuti potenziati di questo evento.`);
    } catch (e) {
      Alert.alert('Errore', e?.response?.data?.message || 'Impossibile iscriversi all\'evento. Riprova.');
    } finally {
      setJoining(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('profileAvatarUri').then((uri) => setAvatarUri(uri || null));
    }, [])
  );

  // Unified searchable elements: collection centers, bins and (active) events.
  const buildSearchItems = () => {
    const items = [];
    (centers || []).forEach((c) => {
      const lat = Number(c?.coordinates?.lat), lng = Number(c?.coordinates?.lng);
      if (c?.name && Number.isFinite(lat) && Number.isFinite(lng))
        items.push({ key: `c_${c._id}`, type: 'center', name: c.name, lat, lng, subtitle: c.address || 'Centro di raccolta' });
    });
    (bins || []).forEach((b) => {
      const lat = Number(b?.coordinates?.lat), lng = Number(b?.coordinates?.lng);
      if (b?.name && Number.isFinite(lat) && Number.isFinite(lng))
        items.push({ key: `b_${b._id}`, type: 'bin', name: b.name, lat, lng, subtitle: b.address || 'Bidone' });
    });
    (activeEvents || []).forEach((e) => {
      const lat = Number(e?.coordinates?.lat), lng = Number(e?.coordinates?.lng);
      if (e?.name && Number.isFinite(lat) && Number.isFinite(lng))
        items.push({ key: `e_${e._id}`, type: 'event', name: e.name, lat, lng, subtitle: 'Evento di raccolta' });
    });
    return items;
  };
  const searchTypeIcon = (type) => (type === 'center' ? '📍' : type === 'bin' ? '🗑️' : '🎪');

  const handleQueryChange = (text) => {
    setSearchQuery(text);
    setSelectedTarget(null);
    setSearchError(false);
    const q = text.trim().toLowerCase();
    if (!q) { setSearchResults([]); return; }
    setSearchResults(buildSearchItems().filter(it => it.name.toLowerCase().includes(q)).slice(0, 6));
  };

  const selectResult = (item) => {
    setSearchQuery(item.name);
    setSelectedTarget(item);
    setSearchResults([]);
  };

  const handleSearch = () => {
    setSearchResults([]);
    setSearchError(false);
    const q = searchQuery.trim().toLowerCase();
    const target = selectedTarget || buildSearchItems().find(it => it.name.toLowerCase() === q);
    if (target) {
      setMapCenter([target.lat, target.lng]);
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
          events={activeEvents}
          onEventClick={(ev) => setViewingEvent(ev)}
          onCenterClick={(center) => router.push(`/centers/${center._id}/bins`)} />
      ) : (
        <NativeMap
          targetCenter={mapCenter}
          styleUrl={mapStyleUrl}
          centers={centers}
          bins={bins}
          events={activeEvents}
          onEventClick={(ev) => setViewingEvent(ev)}
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

        {/* ── Bottone Lista Premi ── */}
        <TouchableOpacity
          style={styles.rewardsFloatingButton}
          activeOpacity={0.85}
          onPress={() => router.push('/rewards')}
        >
          <Text style={styles.rewardsFloatingButtonText}>
            🎁 Premi
          </Text>
        </TouchableOpacity>

        {searchError && (
          <View style={styles.searchErrorBox}>
            <Text style={styles.searchErrorText}>Location not found</Text>
          </View>
        )}

        {searchResults.length > 0 && (
          <View style={styles.resultsDropdown}>
            {searchResults.map((item, i) => (
              <TouchableOpacity
                key={item.key ?? i}
                style={[styles.resultItem, i < searchResults.length - 1 && styles.resultItemBorder]}
                activeOpacity={0.7}
                onPress={() => selectResult(item)}
              >
                <Text style={styles.resultIcon}>{searchTypeIcon(item.type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultText} numberOfLines={1}>{item.name}</Text>
                  {item.subtitle ? <Text style={styles.resultSubText} numberOfLines={1}>{item.subtitle}</Text> : null}
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

      {/* ── Event ended: thank-you for participation + 10 points granted ── */}
      {endedPopup && (
        <View style={styles.eventOverlay}>
          <TouchableOpacity style={styles.eventBackdrop} activeOpacity={1} onPress={() => setEndedPopup(null)} />
          <View style={styles.eventCard}>
            <Text style={styles.endedTitle}>🎉 Grazie per aver partecipato!</Text>
            <Text style={styles.endedBody}>
              {endedPopup.events.length === 1
                ? `L'evento "${endedPopup.events[0].name}" è terminato.`
                : `${endedPopup.events.length} eventi a cui partecipavi sono terminati.`}
            </Text>
            <View style={styles.eventBoostBanner}>
              <Text style={styles.eventBoostTxt}>+{endedPopup.points} punti per la partecipazione</Text>
            </View>
            <TouchableOpacity style={styles.joinBtn} activeOpacity={0.85} onPress={() => setEndedPopup(null)}>
              <Text style={styles.joinTxt}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Event characteristics modal (click on an event) + join button ── */}
      {viewingEvent && (
        <View style={styles.eventOverlay}>
          <TouchableOpacity style={styles.eventBackdrop} activeOpacity={1} onPress={() => setViewingEvent(null)} />
          <View style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle} numberOfLines={1}>{viewingEvent.name}</Text>
              <TouchableOpacity style={styles.eventCloseBtn} activeOpacity={0.7} onPress={() => setViewingEvent(null)}>
                <Text style={styles.eventCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.eventRow}>
              <Text style={styles.eventLabel}>Inizio</Text>
              <Text style={styles.eventValue}>{formatEventDateTime(viewingEvent.startDate)}</Text>
            </View>
            <View style={styles.eventRow}>
              <Text style={styles.eventLabel}>Fine</Text>
              <Text style={styles.eventValue}>{formatEventDateTime(viewingEvent.endDate)}</Text>
            </View>
            <View style={styles.eventRow}>
              <Text style={styles.eventLabel}>Raggio</Text>
              <Text style={styles.eventValue}>{viewingEvent.radius} m</Text>
            </View>
            <View style={styles.eventRow}>
              <Text style={styles.eventLabel}>Rifiuti potenziati</Text>
              <Text style={styles.eventValue}>{(viewingEvent.wasteTypes || []).join(', ') || '—'}</Text>
            </View>
            <View style={styles.eventBoostBanner}>
              <Text style={styles.eventBoostTxt}>⚡ Punti x{viewingEvent.boost} sui rifiuti potenziati</Text>
            </View>

            {/* Join the event → grants the boost on matching scans */}
            {isJoined(viewingEvent) ? (
              <View style={[styles.joinBtn, styles.joinedBtn]}>
                <Text style={styles.joinedTxt}>✓ Sei iscritto a questo evento</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.joinBtn, joining && styles.joinBtnDisabled]}
                activeOpacity={joining ? 1 : 0.85}
                onPress={joinEvent}
              >
                <Text style={styles.joinTxt}>{joining ? 'Iscrizione…' : 'Partecipa all\'evento'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },

  // ── Event characteristics modal ─────────────────────────────────────────────
  eventOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', zIndex: 40,
  },
  eventBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  eventCard: {
    width: '90%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 18,
    paddingHorizontal: 22, paddingTop: 16, paddingBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 14,
  },
  eventHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  eventTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  eventCloseBtn: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f2f2f2', marginLeft: 8,
  },
  eventCloseTxt: { fontSize: 16, color: '#444', fontWeight: '700' },
  eventRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f4f4f4', gap: 12,
  },
  eventLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  eventValue: { fontSize: 14, color: '#222', flex: 1, textAlign: 'right' },
  eventBoostBanner: {
    marginTop: 14, backgroundColor: '#FFF8E1', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#FFEB3B', paddingVertical: 10, alignItems: 'center',
  },
  eventBoostTxt: { fontSize: 14, fontWeight: '800', color: '#C0174D' },
  joinBtn: {
    marginTop: 16, backgroundColor: '#009933', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  joinBtnDisabled: { backgroundColor: '#9bd3ad' },
  joinTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  joinedBtn: { backgroundColor: '#e8f5e9', borderWidth: 1.5, borderColor: '#009933' },
  joinedTxt: { color: '#2e7d32', fontSize: 15, fontWeight: '700' },
  endedTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  endedBody: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },

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
  rewardsFloatingButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#009933',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8
  },
  rewardsFloatingButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
});
