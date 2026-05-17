import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Image, Platform, Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { API_URL } from '../src/config';

// ---- Disposal logic (used as fallback when ZX_API is unreachable) -----

const PACKAGING_DISPOSAL = {
  plastic:     { label: 'Plastica',       bin: 'Bidone Giallo (Plastica/Metallo)',  color: '#F9A825', icon: '♻️' },
  glass:       { label: 'Vetro',           bin: 'Campana Verde (Vetro)',             color: '#2E7D32', icon: '🫙' },
  cardboard:   { label: 'Carta / Cartone', bin: 'Bidone Blu (Carta/Cartone)',        color: '#1565C0', icon: '📦' },
  paper:       { label: 'Carta',           bin: 'Bidone Blu (Carta/Cartone)',        color: '#1565C0', icon: '📄' },
  metal:       { label: 'Metallo',         bin: 'Bidone Giallo (Plastica/Metallo)',  color: '#F9A825', icon: '🥫' },
  aluminium:   { label: 'Alluminio',       bin: 'Bidone Giallo (Plastica/Metallo)',  color: '#F9A825', icon: '🥫' },
  steel:       { label: 'Acciaio',         bin: 'Bidone Giallo (Plastica/Metallo)',  color: '#F9A825', icon: '🔩' },
  wood:        { label: 'Legno',           bin: 'Centro di Raccolta',               color: '#6D4C41', icon: '🪵' },
  tetra:       { label: 'Tetrapak',        bin: 'Bidone Giallo (Plastica/Metallo)',  color: '#F9A825', icon: '🥛' },
  polystyrene: { label: 'Polistirolo',     bin: 'Bidone Giallo (Plastica/Metallo)',  color: '#F9A825', icon: '📦' },
};

const FALLBACK_DISPOSAL = {
  label: 'Indifferenziato',
  bin: 'Bidone Nero (Rifiuto Generico)',
  color: '#757575',
  icon: '🗑️',
};

function resolveDisposal(product) {
  if (!product) return [FALLBACK_DISPOSAL];
  const tags = (product.packaging_tags || []).join(' ').toLowerCase();
  const text = (product.packaging || '').toLowerCase();
  const combined = `${tags} ${text}`;

  const matches = Object.entries(PACKAGING_DISPOSAL)
    .filter(([key]) => combined.includes(key))
    .map(([, info]) => info);

  const seen = new Set();
  const unique = matches.filter(({ bin }) => {
    if (seen.has(bin)) return false;
    seen.add(bin);
    return true;
  });
  return unique.length > 0 ? unique : [FALLBACK_DISPOSAL];
}

// ---- Ecoscore display info -----

const ECOSCORE_INFO = {
  a: { color: '#1B5E20', text: 'Impatto ambientale molto basso' },
  b: { color: '#388E3C', text: 'Impatto ambientale basso' },
  c: { color: '#F9A825', text: 'Impatto ambientale moderato' },
  d: { color: '#E65100', text: 'Impatto ambientale alto' },
  e: { color: '#B71C1C', text: 'Impatto ambientale molto alto' },
};

// ------ Screen -----

export default function Informations() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [barcode, setBarcode]     = useState('');
  const [product, setProduct]     = useState(null);
  const [disposal, setDisposal]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [searched, setSearched]   = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Prevents onBarcodeScanned firing more than once per scan session
  const scannedRef = useRef(false);

  // ── Product search ──────────────────────────────────────────────────────────
  // Primary path  → ZX_API backend (pre-computes disposal server-side)
  // Fallback path → OpenFoodFacts directly (disposal computed client-side)


  const searchProduct = async (code) => {
    const trimmed = (code ?? barcode).trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setProduct(null);
    setDisposal([]);
    setSearched(true);

    try {
      // --- Primary: ZX_API backend ---
      const { data } = await axios.get(`${API_URL}/zx/scan/${trimmed}`, {
        timeout: 10000,
      });

      if (data.status === 1) {
        setProduct(data.product);
        setDisposal(data.disposal ?? []);
      } else {
        setError(data.error || 'Prodotto non trovato. Verifica il codice e riprova.');
      }
    } catch (primaryErr) {
      // --- Fallback: call OpenFoodFacts directly ---
      // Triggered when the backend is unreachable (wrong IP, not started, etc.)
      console.warn('[ZX_API] Backend non raggiungibile, uso OpenFoodFacts diretto:', primaryErr.message);
      try {
        const { data } = await axios.get(
          `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(trimmed)}.json`,
          {
            timeout: 15000,
            headers: { 'User-Agent': 'RiciclApp/1.0 (riciclapp@example.com)' },
          }
        );

        if (data.status === 1) {
          setProduct(data.product);
          setDisposal(resolveDisposal(data.product));
        } else {
          setError('Prodotto non trovato. Verifica il codice e riprova.');
        }
      } catch (fallbackErr) {
        console.error('[OFF diretto]', fallbackErr.message);
        setError('Nessuna connessione disponibile. Controlla la tua rete e riprova.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ------ Camera handler -----
  const handleBarcodeScan = useCallback(({ data }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setShowScanner(false);
    setBarcode(data);
    searchProduct(data);
  }, []); // stable — relies only on stable setters and the ref

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    scannedRef.current = false;
    setShowScanner(true);
  };

  // ------ Derived display values ------
  const ecoscore = product?.ecoscore_grade;
  const ecoscoreInfo = ecoscore && ecoscore !== 'not-applicable' ? ECOSCORE_INFO[ecoscore] : null;

  // ------ Render ------
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ------ Header ------ */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Info Prodotto</Text>
        <TouchableOpacity style={styles.closeButton} activeOpacity={0.8} onPress={() => router.push('/')}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ------ Hero ------ */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Cerca un Prodotto</Text>
          <Text style={styles.heroSubtitle}>
            {Platform.OS === 'web'
              ? 'Inserisci il codice a barre per scoprire le informazioni sul prodotto e come smaltirlo correttamente'
              : 'Inserisci il codice a barre oppure scansiona la confezione per scoprire come smaltire il prodotto correttamente'}
          </Text>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchCard}>
          <Text style={styles.inputLabel}>Codice a barre</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
              placeholder="es. 8076809513364"
              placeholderTextColor="#bbb"
              value={barcode}
              onChangeText={setBarcode}
              keyboardType="numeric"
              onSubmitEditing={() => searchProduct()}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.searchBtn, !barcode.trim() && styles.searchBtnDisabled]}
              activeOpacity={0.85}
              onPress={() => searchProduct()}
              disabled={!barcode.trim()}
            >
              <Text style={styles.searchBtnText}>Cerca</Text>
            </TouchableOpacity>
          </View>

          {/* Scan button — hidden on web */}
          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.scanBtn} activeOpacity={0.85} onPress={openScanner}>
              <Text style={styles.scanBtnIcon}>📷</Text>
              <Text style={styles.scanBtnText}>Scansiona Codice a Barre</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.hint}>💡 Il codice a barre si trova sulla confezione del prodotto</Text>
        </View>

        {/* ── Loading ── */}
        {loading && (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color="#009933" />
            <Text style={styles.stateText}>Ricerca in corso…</Text>
          </View>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <View style={[styles.stateBox, styles.errorBox]}>
            <Text style={styles.stateIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Empty after search ── */}
        {!loading && searched && !error && !product && (
          <View style={styles.stateBox}>
            <Text style={styles.stateIcon}>🔍</Text>
            <Text style={styles.stateText}>Nessun risultato trovato</Text>
          </View>
        )}

        {/* ── Results ── */}
        {!loading && product && (
          <View style={styles.results}>

            {/* Product identity card */}
            <View style={styles.card}>
              <View style={styles.productHeader}>
                {product.image_front_small_url ? (
                  <Image source={{ uri: product.image_front_small_url }} style={styles.productImage} />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Text style={styles.productImagePlaceholderText}>📦</Text>
                  </View>
                )}
                <View style={styles.productMeta}>
                  <Text style={styles.productName} numberOfLines={3}>
                    {product.product_name || 'Nome non disponibile'}
                  </Text>
                  {product.brands ? (
                    <Text style={styles.productBrand}>{product.brands}</Text>
                  ) : null}
                  {product.quantity ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{product.quantity}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {product.categories ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Categoria</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>
                    {product.categories.split(',')[0].trim()}
                  </Text>
                </View>
              ) : null}

              {product.countries ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Paese di origine</Text>
                  <Text style={styles.infoValue}>{product.countries}</Text>
                </View>
              ) : null}
            </View>

            {/* Eco-score card */}
            {ecoscoreInfo ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Eco-Score</Text>
                <View style={styles.ecoscoreRow}>
                  <View style={[styles.ecoscoreBadge, { backgroundColor: ecoscoreInfo.color }]}>
                    <Text style={styles.ecoscoreLetter}>{ecoscore.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.ecoscoreDesc}>{ecoscoreInfo.text}</Text>
                </View>
              </View>
            ) : null}

            {/* Packaging card */}
            {product.packaging ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Imballaggio</Text>
                <Text style={styles.packagingText}>{product.packaging}</Text>
              </View>
            ) : null}

            {/* Disposal card */}
            <View style={[styles.card, styles.disposalCard]}>
              <Text style={styles.cardTitle}>Come Smaltire ♻️</Text>
              <Text style={styles.disposalSubtitle}>
                Segui queste indicazioni per la raccolta differenziata corretta
              </Text>
              {disposal.map((item, i) => (
                <View key={i} style={[styles.disposalItem, { borderLeftColor: item.color }]}>
                  <Text style={styles.disposalIcon}>{item.icon}</Text>
                  <View style={styles.disposalText}>
                    <Text style={[styles.disposalLabel, { color: item.color }]}>{item.label}</Text>
                    <Text style={styles.disposalBin}>{item.bin}</Text>
                  </View>
                </View>
              ))}
            </View>

          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* ── Camera Scanner Modal — native only ── */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showScanner}
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setShowScanner(false)}
        >
          <View style={styles.scannerContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
              }}
              onBarcodeScanned={handleBarcodeScan}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerHeader}>
                <Text style={styles.scannerTitle}>Scansiona il Codice a Barre</Text>
                <TouchableOpacity
                  style={styles.scannerClose}
                  activeOpacity={0.8}
                  onPress={() => setShowScanner(false)}
                >
                  <Text style={styles.scannerCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerHint}>Inquadra il codice a barre del prodotto</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ---- Styles  -----

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f4' },

  // Header
  header: {
    backgroundColor: '#009933',
    paddingTop: Platform.OS === 'web' ? 20 : 50,
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
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 0.3 },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'web' ? 14 : 44,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },
  bottomPad: { height: 40 },

  // Hero
  hero: { marginBottom: 20 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  heroSubtitle: { fontSize: 15, color: '#555', lineHeight: 22 },

  // Search card
  searchCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  inputLabel: {
    fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1, height: 50, borderWidth: 2, borderColor: '#e0e0e0',
    borderRadius: 12, paddingHorizontal: 16, fontSize: 16,
    color: '#1a1a1a', backgroundColor: '#fafafa',
  },
  searchBtn: {
    height: 50, paddingHorizontal: 22, backgroundColor: '#009933',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  searchBtnDisabled: { backgroundColor: '#ccc' },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  scanBtn: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, height: 50,
    backgroundColor: '#e8f5e9', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#009933',
  },
  scanBtnIcon: { fontSize: 20 },
  scanBtnText: { color: '#009933', fontSize: 15, fontWeight: '700' },
  hint: { marginTop: 12, fontSize: 13, color: '#888' },

  // State boxes
  stateBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  stateIcon: { fontSize: 40 },
  stateText: { fontSize: 16, color: '#666' },
  errorBox: {
    backgroundColor: '#fff3f3', borderRadius: 16,
    paddingHorizontal: 20, marginBottom: 20,
  },
  errorText: { fontSize: 15, color: '#c62828', textAlign: 'center', lineHeight: 22 },

  // Results
  results: { gap: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardTitle: {
    fontSize: 14, fontWeight: '700', color: '#009933',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },

  // Product identity
  productHeader: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  productImage: { width: 80, height: 80, borderRadius: 12, resizeMode: 'contain', backgroundColor: '#f5f5f5' },
  productImagePlaceholder: {
    width: 80, height: 80, borderRadius: 12,
    backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center',
  },
  productImagePlaceholderText: { fontSize: 36 },
  productMeta: { flex: 1, gap: 4 },
  productName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', lineHeight: 24 },
  productBrand: { fontSize: 14, color: '#666' },
  badge: {
    alignSelf: 'flex-start', backgroundColor: '#e8f5e9',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4,
  },
  badgeText: { fontSize: 12, color: '#2e7d32', fontWeight: '600' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 12,
  },
  infoKey: { fontSize: 13, color: '#888', fontWeight: '500', flexShrink: 0 },
  infoValue: { fontSize: 13, color: '#333', fontWeight: '500', textAlign: 'right', flex: 1 },

  // Ecoscore
  ecoscoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ecoscoreBadge: { width: 52, height: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  ecoscoreLetter: { color: '#fff', fontSize: 26, fontWeight: '800' },
  ecoscoreDesc: { fontSize: 15, color: '#444', flex: 1 },

  // Packaging
  packagingText: { fontSize: 14, color: '#444', lineHeight: 21 },

  // Disposal
  disposalCard: { borderWidth: 1.5, borderColor: '#c8e6c9' },
  disposalSubtitle: { fontSize: 13, color: '#666', marginBottom: 14, marginTop: -8, lineHeight: 19 },
  disposalItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, paddingHorizontal: 14,
    borderLeftWidth: 4, borderRadius: 10,
    backgroundColor: '#fafafa', marginBottom: 10,
  },
  disposalIcon: { fontSize: 28 },
  disposalText: { flex: 1, gap: 2 },
  disposalLabel: { fontSize: 16, fontWeight: '700' },
  disposalBin: { fontSize: 13, color: '#555' },

  // Camera scanner
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scannerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingBottom: 70,
  },
  scannerHeader: {
    width: '100%', paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  scannerTitle: {
    color: '#fff', fontSize: 18, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  scannerClose: {
    position: 'absolute', right: 20,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  scannerCloseText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scannerFrame: {
    width: 260, height: 160, borderRadius: 16,
    borderWidth: 3, borderColor: '#00cc44', backgroundColor: 'transparent',
    shadowColor: '#00cc44', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 12, elevation: 8,
  },
  scannerHint: {
    color: '#fff', fontSize: 14, textAlign: 'center', paddingHorizontal: 32,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
});
