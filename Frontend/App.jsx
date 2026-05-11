import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Rome city center as default map position
const DEFAULT_CENTER = [46.0667, 11.1333];
const DEFAULT_ZOOM = 14;

//Importing images
import Logo from './src/assets/Riciclapp_Logo.png';
import Info from './src/assets/Info_rifiuti.png';
import User from './src/assets/User_icon.png';
import Opz from './src/assets/Opzioni.png';
import { TextInput } from 'react-native-web';


function WebMap() {
  const [MapComponents, setMapComponents] = useState(null);

  useEffect(() => {
    // Inject Leaflet CSS from CDN — Metro bundler cannot process .css imports directly
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Dynamically import react-leaflet to avoid SSR/native issues
    import('react-leaflet').then((rl) => {
      setMapComponents({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
      });
    });

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  if (!MapComponents) return null;

  const { MapContainer, TileLayer } = MapComponents;

  return (
    <MapContainer
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
  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <WebMap />
      ) : (
        // Placeholder for native platforms
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
            placeholder='Cerca una location...'
            placeholderTextColor={'#9999'}            
          />
          
        </View>
      </View>
      {/* -- Barra Bottoni -- */}
      <View style={styles.buttonBar}> 
        <TouchableOpacity style={styles.button} activeOpacity={0.85}>
          <Image source={User} style={styles.buttonIcon}/>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} activeOpacity={0.85}>
          <Image source={Logo} style={styles.buttonIcon}/>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} activeOpacity={0.85}>
          <Image source={Info} style={styles.buttonIcon}/>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.smallButton} activeOpacity={0.85} >
        <Image source={Opz} style={{width: 60, height: 60}}/>
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
  //Mappa
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
  //Bottoni
  buttonBar:{
    flex: 1,
    position: 'absolute',
    bottom: 40, //Li mette verso il fondo a 40
    flexDirection: 'row',
    alignSelf: 'center', //Allienamento orizzontale

    justifyContent: 'center',
    alignItems: 'center',
  },
  button:{
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
  smallButton:{
    position: 'relative',
    alignSelf: 'flex-end',

    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',

    backgroundColor: '#fff',
    margin: 20,
    //borderWidth: 5,
    //borderColor: '#444444',

    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1,
  },
  buttonIcon:{
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
    outlineStyle: 'none', // removes browser focus ring on web
  },
  searchClear: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
});
