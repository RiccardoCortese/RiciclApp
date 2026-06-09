import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../src/config';
import axios from 'axios';

import Logo from '../../src/assets/Riciclapp_Logo.png';
import WorkImg from '../../src/assets/Work_in_progess.png';
import calcoloPercorsoImg from '../../src/assets/calcolo_percorso.png';
import UserDefault from '../../src/assets/Profile_image/User_image.png';

// ── Brand color ──────────────────────────────────────────────────────────────
const PRIMARY = '#0097A7'; // cyan

const DEFAULT_CENTER = { lat: 46.0667, lon: 11.1333 };
const DEFAULT_ZOOM = 14;
const OFM_STYLE_FALLBACK = 'https://tiles.openfreemap.org/styles/liberty';

// Grey colour used for the bin markers shown on the map.
const BIN_GREY = '#9E9E9E';

// ── Web map ───────────────────────────────────────────────────────────────────
function WebMap({ targetCenter, styleUrl, centers, bins = [], onCenterClick, activeRoute = [] }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const style = styleUrl || OFM_STYLE_FALLBACK;
  const markersRef = useRef([]); // Riferimento ai marker dei centri, per poterli rimuovere/aggiornare quando la lista dei centri cambia
  const binMarkersRef = useRef([]); // Riferimento ai marker dei bidoni, per poterli rimuovere/aggiornare quando la lista dei bidoni cambia
  const [isMapReady, setIsMapReady] = useState(false); // Stato per tracciare quando la mappa è pronta
  const [maplibreInstance, setMaplibreInstance] = useState(null);
  
  // Effetto per inizializzare la mappa MapLibre GL JS quando il componente viene montato.
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
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
      }); map.on('load', () => { //quando la mappa è completamente caricata, aggiorna lo stato per indicare che è pronta
        mapRef.current = map; 
        setIsMapReady(true); //in questo modo possiamo essere sicuri che la mappa è pronta prima di tentare di aggiungere marker calcolo del percorso
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, [style]);

  // Effetto per centrare la mappa sulla posizione target ogni volta che targetCenter cambia.
  useEffect(() => {
    if (!targetCenter || !mapRef.current) return; 
    mapRef.current.flyTo({ center: [targetCenter[1], targetCenter[0]], zoom: 15 });
  }, [targetCenter]);

  // Effetto per calcolare e disegnare il percorso attivo sulla mappa ogni volta che activeRoute cambia.
  useEffect(() => {

    if (!isMapReady || !mapRef.current) return; // assicuro che la mappa sia pronta prima di procedere con il calcolo del percorso e l'aggiunta dei layer

    const map = mapRef.current;

    if (!mapRef.current || !activeRoute || activeRoute.length < 2) { // se non ci sono abbastanza punti per formare un percorso, rimuovo eventuali layer esistenti e esco
      if (mapRef.current?.getLayer('route-line')) mapRef.current.removeLayer('route-line');
      if (mapRef.current?.getSource('route-source')) mapRef.current.removeSource('route-source');
      return;
    }

    const coordinatesString = activeRoute 
      .map(t => { // estraggo le coordinate in un formato compatto "lng,lat" 
        const coords = t.coordinate || t;
        const lat = coords.lat ?? coords.latitude;
        const lng = coords.lng ?? coords.lon ?? coords.longitude;
        return (lat && lng) ? `${lng},${lat}` : null;
      })
      .filter(Boolean)
      .join(';');

    if (!coordinatesString) return;

    // Chiamo OSRM per ottenere la geometria stradale del percorso da disegnare sulla mappa
    fetch(`https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`)
      .then(response => response.json())
      .then(data => {
        if (!data.routes || data.routes.length === 0) return;
        const roadGeometry = data.routes[0].geometry;

        const addLayerSecureWeb = () => {
          if (map.getLayer('route-line')) map.removeLayer('route-line');
          if (map.getSource('route-source')) map.removeSource('route-source');

          map.addSource('route-source', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: roadGeometry }
          });

          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#009933', 'line-width': 5 }
          });
        };

        if (map.isStyleLoaded()) { addLayerSecureWeb(); } else { map.once('idle', addLayerSecureWeb); }
      })
      .catch(err => console.error("Errore nel calcolo del percorso stradale OSRM:", err));
  }, [activeRoute, isMapReady]);

  // Effetto per aggiornare i marker dei centri sulla mappa ogni volta che la lista dei centri cambia
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !maplibreInstance) return; // assicuro che la mappa sia pronta e che l'istanza di MapLibre sia disponibile prima di procedere

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Per ogni centro, estraggo latitudine e longitudine, creo un marker colorato e un popup con le informazioni del centro. 
    // Aggiungo un listener al popup per gestire i click e invocare onCenterClick quando l'utente clicca sul popup.
    centers.forEach(center => {
      const lat = center?.coordinates?.lat;
      const lng = center?.coordinates?.lng ?? center?.coordinates?.lon;
      if (!lat || !lng) return;

      const marker = new maplibreInstance.Marker({ color: PRIMARY })
        .setLngLat([Number(lng), Number(lat)])
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
  }, [centers, maplibreInstance, isMapReady]);

  // Effetto per aggiornare i marker dei bidoni sulla mappa ogni volta che la lista dei bidoni o dei centri cambia
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !maplibreInstance) return;

    binMarkersRef.current.forEach(m => m.remove());
    binMarkersRef.current = [];
    
    // Creo un dizionario per mappare gli ID dei centri ai loro nomi, in modo da poter mostrare il nome del centro collegato a ciascun bidone nel popup.
    const centersById = {};
    (centers || []).forEach(c => { if (c?._id) centersById[String(c._id)] = c.name; });
    (bins || []).forEach(bin => {
      const lat = bin?.coordinates?.lat;
      const lng = bin?.coordinates?.lng ?? bin?.coordinates?.lon;
      if (!lat || !lng) return;

      const types = (bin.wasteTypes?.length ? bin.wasteTypes : [bin.wasteType]).filter(Boolean).join(', ');
      const centerName = bin.centerId ? (centersById[String(bin.centerId)] || null) : null;
      const marker = new maplibreInstance.Marker({ color: BIN_GREY })
        .setLngLat([Number(lng), Number(lat)])
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
  }, [bins, centers, maplibreInstance, isMapReady]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  );

  map.on('styleimagemissing', (e) => { 
    const id = e.id;
    // Crea un pixel trasparente 1x1 da dare a MapLibre in caso di immagini mancanti, in modo da evitare errori di rendering.
    const placeholder = new Uint8Array([0, 0, 0, 0]);
    if (!map.hasImage(id)) {
      map.addImage(id, { width: 1, height: 1, data: placeholder });
    }
  });
}

// ── Native map (WebView) ──────────────────────────────────────────────────────
function NativeMap({ targetCenter, styleUrl, centers, bins = [], onCenterClick, activeRoute = [] }) {
  const webViewRef = useRef(null);
  const [WebView, setWebView] = useState(null);
  const mapStyle = styleUrl || OFM_STYLE_FALLBACK;

  // Effetto per importare dinamicamente il componente WebView di react-native-webview, in modo da evitare problemi di compatibilità su piattaforme dove non è supportato (es. Android).
  useEffect(() => {
    try {
      const mod = require('react-native-webview');
      setWebView(() => mod.WebView ?? mod.default?.WebView ?? mod.default);
    } catch {
      setWebView(null);
    }
  }, []);

  // Effetto per inviare un messaggio alla WebView ogni volta che targetCenter cambia, in modo da centrare la mappa sulla posizione target.
  useEffect(() => {
    if (!targetCenter || !webViewRef.current) return;
    webViewRef.current.postMessage(
      JSON.stringify({ type: 'flyTo', lat: targetCenter[0], lon: targetCenter[1] })
    );
  }, [targetCenter]);

  // Effetto per inviare un messaggio alla WebView ogni volta che activeRoute cambia, in modo da disegnare il percorso attivo sulla mappa.
  useEffect(() => {
    if (!webViewRef.current) return;
    webViewRef.current.postMessage(
      JSON.stringify({ type: 'drawRoute', route: activeRoute })
    );
  }, [activeRoute]);

  // Funzione per gestire i messaggi in arrivo dalla WebView, ad esempio quando l'utente clicca su un centro sulla mappa. 
  // In questo caso, se il messaggio indica che è stato cliccato un centro, invochiamo onCenterClick con i dati del centro.
  const handleOnMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'centerClicked' && data.center) onCenterClick(data.center);
    } catch { }
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

  // HTML da caricare nella WebView, che include l'inizializzazione di MapLibre GL JS, la gestione dei marker per i centri e i bidoni, e la logica per disegnare il percorso attivo sulla mappa.
  const mapHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link href="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css" rel="stylesheet">
    <script src="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js"></script>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      html,body,#map { width:100%; height:100%; }
      .custom-marker { width:35px !important; height:35px !important; cursor:pointer; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      // Variabili iniziali per la mappa, i centri, i bidoni e la rotta attiva
      var backupRoute = ${JSON.stringify(activeRoute || [])};  
      var mapReady = false;
      const map = new maplibregl.Map({
        container:'map', style:'${mapStyle}',
        center:[${DEFAULT_CENTER.lon},${DEFAULT_CENTER.lat}], zoom:${DEFAULT_ZOOM},
      });
      const centers = ${JSON.stringify(centers || [])};
      const bins = ${JSON.stringify(bins || [])};
      const initialRoute = ${JSON.stringify(activeRoute || [])};
      const centersById = {};
      centers.forEach(c => { if (c && c._id) centersById[String(c._id)] = c.name; });

      function renderPolyline(routeData) {
        if (map.getLayer('route-line')) map.removeLayer('route-line');
        if (map.getSource('route-source')) map.removeSource('route-source');
        if (!routeData || routeData.length < 2) return;

        const coordinatesString = routeData
          .map(t => t.coordinate ? t.coordinate.lng + ',' + t.coordinate.lat : '')
          .filter(Boolean)
          .join(';');

        if (!coordinatesString) return;

        fetch('https://router.project-osrm.org/route/v1/driving/' + coordinatesString + '?overview=full&geometries=geojson')
          .then(function(res) { return res.json(); })
          .then(function(data) {
            if (!data.routes || data.routes.length === 0) return;
            
            const roadGeometry = data.routes[0].geometry;

            const addLayerSecure = function() {
              if (map.getLayer('route-line')) map.removeLayer('route-line');
              if (map.getSource('route-source')) map.removeSource('route-source');
              
              map.addSource('route-source', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: roadGeometry 
                }
              });

              map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route-source',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#009933', 'line-width': 5 }
              });
            };

            if (map.isStyleLoaded()) {
              addLayerSecure();
            } else {
              map.once('idle', addLayerSecure);
            }
          })
          .catch(function(err) { console.error("Errore OSRM nativo:", err); });
      }

      map.on('load', function() {
        mapReady = true; // La mappa è pronta, possiamo ora disegnare la rotta di backup se esiste e aggiungere i marker

        if (backupRoute && backupRoute.length > 0) {
          drawLine(backupRoute);
        }

        renderPolyline(initialRoute);

        centers.forEach((center, index) => {
          if (!center.coordinates?.lng || !center.coordinates?.lat) return;
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.innerHTML = \`<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${PRIMARY}"/>
          </svg>\`;
          function triggerClick() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type:'centerClicked', center:centers[index] }));
            }
            
          }
          el.addEventListener('touchend', e => { e.stopPropagation(); triggerClick(); });
          el.addEventListener('click',    e => { e.stopPropagation(); triggerClick(); });
          new maplibregl.Marker({ element:el })
            .setLngLat([Number(center.coordinates.lng), Number(center.coordinates.lat)])
            .addTo(map);
        });

        bins.forEach((bin) => {
          if (!bin.coordinates || !bin.coordinates.lng || !bin.coordinates.lat) return;
          const types = ((bin.wasteTypes && bin.wasteTypes.length) ? bin.wasteTypes : [bin.wasteType]).filter(Boolean).join(', ');
          const centerName = bin.centerId ? (centersById[String(bin.centerId)] || null) : null;
          const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
            '<div style="font-family:Arial,sans-serif;padding:5px;min-width:170px;">'
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

      document.addEventListener('message', e => {
        try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'drawRoute') {
          backupRoute = msg.route; // aggiorna il backup
          drawLine(msg.route);     // prova a disegnare
        }
      } catch(_) {}
    });
      });
    </script>
  </body>
  </html>`;

  // Renderizza la WebView con l'HTML della mappa, e imposta handleOnMessage per gestire i messaggi in arrivo dalla WebView.
  return (
    <WebView
      ref={webViewRef}
      key={`map-centers-${centers.length}-bins-${bins.length}`}
      source={{ html: mapHtml }}
      style={{ flex: 1 }}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
      onMessage={handleOnMessage}
    />
  );

  map.on('styleimagemissing', function (e) {
    var id = e.id;
    var placeholder = new Uint8Array([0, 0, 0, 0]);
    if (!map.hasImage(id)) {
      map.addImage(id, { width: 1, height: 1, data: placeholder });
    }
  });
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HomeOperatorScreen() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState(''); // Testo attuale nella barra di ricerca
  const [searchResults, setSearchResults] = useState([]); // Risultati filtrati in base alla query di ricerca
  const [selectedCenter, setSelectedCenter] = useState(null); // Centro selezionato dalla ricerca, usato per centrare la mappa quando si conferma la ricerca
  const [mapCenter, setMapCenter] = useState(null); // Coordinate [lat, lon] per centrare la mappa, aggiornate quando si seleziona un risultato di ricerca o si conferma la ricerca
  const [searchError, setSearchError] = useState(false); // Stato per indicare se la ricerca ha fallito (es. nessun risultato trovato), usato per mostrare un feedback visivo all'utente
  const [mapStyleUrl, setMapStyleUrl] = useState(OFM_STYLE_FALLBACK); // URL dello stile della mappa, recuperato dalla configurazione del backend o impostato al fallback se non disponibile
  const [centers, setCenters] = useState([]); // Lista dei centri di raccolta, recuperata dal backend all'avvio dello screen
  const [bins, setBins] = useState([]); // Lista dei bidoni, recuperata dal backend all'avvio dello screen
  const [avatarUri, setAvatarUri] = useState(null); // URI dell'immagine del profilo dell'operatore, recuperata da AsyncStorage all'avvio dello screen

  const [showInfoCard, setShowInfoCard] = useState(false); // Stato per controllare la visibilità della scheda informativa del centro, usato per chiudere la scheda quando si clicca sulla mappa
  const [segnalazioniOpen, setSegnalazioniOpen] = useState(false); // Stato per controllare se la sezione delle segnalazioni è aperta o chiusa, usato per mostrare/nascondere la lista delle segnalazioni assegnate all'operatore

  const [segnalazioni, setSegnalazioni] = useState([]); // Lista delle segnalazioni assegnate all'operatore, recuperata dal backend all'avvio dello screen e ogni volta che lo screen viene focalizzato
  const [activeRoute, setActiveRoute] = useState([]); // Rotta attiva dell'operatore, recuperata da AsyncStorage all'avvio dello screen e ogni volta che lo screen viene focalizzato, usata per disegnare il percorso sulla mappa

  // Effetto per recuperare la configurazione della mappa, i centri di raccolta e i bidoni dal backend quando lo screen viene montato.
  useEffect(() => {
    axios.get(`${API_URL}/ofm/config`)
      .then(r => { if (r.data?.styleUrl) setMapStyleUrl(r.data.styleUrl); })
      .catch(() => { });
    axios.get(`${API_URL}/centers/all`)
      .then(r => setCenters(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCenters([]));
    axios.get(`${API_URL}/centers/bins`)
      .then(r => setBins(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBins([]));
  }, []);

  // Effetto per recuperare l'URI dell'immagine del profilo, la rotta attiva e le segnalazioni assegnate all'operatore ogni volta che lo screen viene focalizzato, in modo da avere sempre dati aggiornati quando l'operatore torna su questo screen.
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('profileAvatarUri').then(uri => setAvatarUri(uri || null));

      AsyncStorage.getItem('active_operator_route')
        .then(storedRoute => {
          if (storedRoute) {
            const parsed = JSON.parse(storedRoute);
            console.log("Rotta caricata in Home:", parsed);
            setActiveRoute(parsed);
          } else {
            setActiveRoute([]);
          }
        })
        .catch(err => console.error("Errore lettura percorso attivo:", err));

      // Recupero le segnalazioni assegnate all'operatore filtrando tutte le segnalazioni per quelle con status "ASSIGNED" e assignedTo uguale all'ID dell'operatore loggato, che recupero da AsyncStorage.
      AsyncStorage.getItem('user').then(userString => {
        if (!userString) {
          console.warn("Attenzione: nessun dato utente trovato in AsyncStorage");
          return;
        }

        const loggedInUser = JSON.parse(userString);
        const currentIdOperatore = loggedInUser.id;

        axios.get(`${API_URL}/report/all`) // recupero tutte le segnalazioni e poi filtro quelle assegnate all'operatore, in modo da avere sempre dati aggiornati anche se le assegnazioni cambiano lato backend mentre l'operatore è su questo screen
          .then(r => {
            const allReports = Array.isArray(r.data?.reports) ? r.data.reports : [];
            const assignedReports = allReports.filter(s => {
              const operatorIdInReport = s.assignedTo;
              return s.status === 'ASSIGNED' && operatorIdInReport === currentIdOperatore;
            });
            setSegnalazioni(assignedReports);
          })
          .catch(err => {
            console.error("Errore nel recupero delle segnalazioni:", err);
            setSegnalazioni([]);
          });

      }).catch(err => {
        console.error("Errore nel recupero di profileId da AsyncStorage:", err);
      });
    }, [])
  );

  // Funzione per rimuovere la rotta attiva, ad esempio quando l'operatore completa un percorso o vuole cancellarlo. 
  // Rimuove la rotta da AsyncStorage e aggiorna lo stato activeRoute a un array vuoto, il che farà scomparire il percorso dalla mappa.
  const rimuoviItinerario = async () => {
    try {
      await AsyncStorage.removeItem('active_operator_route');
      setActiveRoute([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Funzione per costruire la lista degli elementi da mostrare nei risultati di ricerca, combinando centri e bidoni in un unico array con le informazioni necessarie per il rendering dei risultati (nome, tipo, coordinate, ecc.).
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
    return items;
  };
  const searchTypeIcon = (type) => (type === 'center' ? '📍' : '🗑️');

  const handleQueryChange = (text) => {
    setSearchQuery(text);
    setSelectedCenter(null);
    setSearchError(false);
    const q = text.trim().toLowerCase();
    if (!q) { setSearchResults([]); return; }
    setSearchResults(buildSearchItems().filter(it => it.name.toLowerCase().includes(q)).slice(0, 6));
  };

  const selectResult = (item) => {
    setSearchQuery(item.name);
    setSelectedCenter(item);
    setSearchResults([]);
  };

  const handleSearch = () => {
    setSearchResults([]);
    setSearchError(false);
    const q = searchQuery.trim().toLowerCase();
    const target = selectedCenter || buildSearchItems().find(it => it.name.toLowerCase() === q);
    if (target) {
      setMapCenter([target.lat, target.lng]);
    } else {
      setSearchError(true);
      setTimeout(() => setSearchError(false), 2500);
    }
  };

  const closeAllCards = () => {
    setShowInfoCard(false);
  };

  return (
    <View style={styles.container} onStartShouldSetResponder={() => { closeAllCards(); return false; }}>
      <StatusBar style="auto" />

      {Platform.OS === 'web' ? (
        <WebMap
          targetCenter={mapCenter}
          styleUrl={mapStyleUrl}
          centers={centers}
          bins={bins}
          onCenterClick={(center) => router.push(`/centers/${center._id}/bins`)}
          activeRoute={activeRoute}
        />
      ) : (
        <NativeMap
          targetCenter={mapCenter}
          styleUrl={mapStyleUrl}
          centers={centers}
          bins={bins}
          onCenterClick={(center) => router.push(`/centers/${center._id}/bins`)}
          activeRoute={activeRoute}
        />
      )}

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

        {/* ── Segnalazioni dropdown ── */}
        <View style={styles.segnalazioniPanel}>
          <TouchableOpacity
            style={styles.segnalazioniHeader}
            activeOpacity={0.75}
            onPress={() => setSegnalazioniOpen(v => !v)}
          >
            <Text style={styles.segnalazioniTitle}>Segnalazioni</Text>
            <Text style={styles.segnalazioniArrow}>
              {segnalazioniOpen ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {segnalazioniOpen && (
            <View style={styles.segnalazioniList}>
              {segnalazioni.length > 0 ? (
                segnalazioni.map((s, index) => (
                  <TouchableOpacity
                    key={s._id || s.id || index}
                    style={[
                      styles.segnalazioneButton,
                      { alignItems: 'flex-start', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 }
                    ]}
                    activeOpacity={0.8}
                    onPress={() => { }}
                  >
                    <Text style={[styles.segnalazioneText, { fontWeight: '700', marginBottom: 4 }]} numberOfLines={2}>
                      📝 {s.description || 'Segnalazione senza testo'}
                    </Text>
                    <Text style={[styles.segnalazioneText, { fontWeight: '700', marginBottom: 4 }]} numberOfLines={2}>
                      🗑️{s.binType || 'Bidone non specificato'} ({s.binName || 'N/A'})
                    </Text>
                    <Text style={{ color: '#666', fontSize: 12, fontStyle: 'italic' }} numberOfLines={1}>
                      📍 Presso: {s.binCenter || 'Centro non specificato'}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ color: '#fff', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 4 }}>
                  Nessuna segnalazione attiva confermata.
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* ── Floating Close Route Button ── */}
      {activeRoute.length > 0 && (
        <TouchableOpacity style={styles.floatingCloseButton} activeOpacity={0.85} onPress={rimuoviItinerario}>
          <Text style={styles.closeButtonText}>✕ Rimuovi Itinerario Verde</Text>
        </TouchableOpacity>
      )}

      {/* ── Button bar ── */}
      <View style={[styles.buttonBar, { zIndex: 10 }]} pointerEvents="box-none">
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => { closeAllCards(); router.push('/profile'); }}
          >
            <Image source={avatarUri ? { uri: avatarUri } : UserDefault} style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>

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

        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => { closeAllCards(); router.push('/calcolo_percorso'); }}
          >
            <Image source={calcoloPercorsoImg} style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  mapPlaceholder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#d0eef0', alignItems: 'center', justifyContent: 'center',
  },
  placeholderText: {
    color: '#555', fontSize: 14, textAlign: 'center',
    paddingHorizontal: 24, lineHeight: 22,
  },
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
  searchInput: { flex: 1, fontSize: 15, color: '#222' },
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
  floatingCloseButton: {
    position: "absolute",
    bottom: 170,
    right: 24,
    backgroundColor: "#d32f2f",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 30,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
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
  popupSub: { fontSize: 13, color: '#555', marginBottom: 10 },
  popupSectionLabel: { fontSize: 13, fontWeight: '700', color: PRIMARY, marginBottom: 4 },
  popupLine: { fontSize: 14, color: '#333', marginBottom: 2 },
  segnalazioniPanel: {
    width: '100%', maxWidth: 480, marginTop: 10,
    backgroundColor: PRIMARY, borderRadius: 16, borderWidth: 2.5, borderColor: PRIMARY,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 10,
  },
  segnalazioniHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
  },
  segnalazioniTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  segnalazioniArrow: { fontSize: 14, color: '#fff', fontWeight: '700' },
  segnalazioniList: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  segnalazioneButton: {
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 2, borderColor: PRIMARY,
    paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  segnalazioneText: { color: PRIMARY, fontSize: 14, fontWeight: '600' },
});