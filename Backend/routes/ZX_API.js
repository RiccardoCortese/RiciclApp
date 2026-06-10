const express = require('express');
const router = express.Router();
const User = require('../models/user');
const RecyclingEvent = require('../models/event');

// Punti base assegnati per una scansione (prima dell'eventuale boost evento).
const BASE_SCAN_POINTS = 5;

// Calcola il moltiplicatore di punti dovuto agli eventi di raccolta: se l'utente
// è iscritto a un evento attualmente attivo che potenzia uno dei tipi di rifiuto
// del prodotto scansionato, applica il boost più alto fra gli eventi idonei.
// Restituisce 1 (nessun boost) se non ci sono eventi idonei.
async function eventBoostFor(userId, disposalLabels) {
  if (!userId || !Array.isArray(disposalLabels) || disposalLabels.length === 0) return 1;
  const now = new Date();
  const events = await RecyclingEvent.find({
    startDate: { $lte: now },
    endDate:   { $gt: now },
    participants: userId,
  }).lean();

  let best = 1;
  for (const ev of events) {
    const types = ev.wasteTypes || [];
    if (types.some(t => disposalLabels.includes(t)) && ev.boost > best) {
      best = ev.boost;
    }
  }
  return best;
}

// Rotta per la scansione del codice a barre tramite ZXing/expo-camera e recupero dati da Open Food Facts
// Ordered disposal categories. A scanned product is matched against every
// packaging signal Open Food Facts exposes, so localized terms (e.g. the Italian
// "plastica") and resin codes (pet, hdpe, ldpe, pp, ps…) all map to the right
// bin. Categories are listed by priority: for a given bin the first matching
// category wins, so "Indifferenziato" is only used when nothing matches at all.
const DISPOSAL_CATEGORIES = [
  {
    info: { label: 'Plastica', bin: 'Bidone Giallo (Plastica/Metallo)', color: '#F9A825', icon: '♻️' },
    keywords: [
      'plastic', 'plastica', 'plastik', 'plastique', 'plastico', 'cellophane',
      'pet', 'pet-1', 'pet1', 'rpet', 'hdpe', 'pe-hd', 'pehd', 'ldpe', 'pe-ld', 'peld',
      'pp', 'ps', 'pvc', 'o7', 'polyethylene', 'polypropylene', 'polietilene', 'polipropilene',
    ],
  },
  {
    info: { label: 'Vetro', bin: 'Campana Verde (Vetro)', color: '#2E7D32', icon: '🫙' },
    keywords: ['glass', 'vetro', 'glas', 'verre', 'vidrio'],
  },
  {
    info: { label: 'Carta / Cartone', bin: 'Bidone Blu (Carta/Cartone)', color: '#1565C0', icon: '📦' },
    keywords: ['cardboard', 'carton', 'cartone', 'cartoncino', 'paperboard', 'corrugated', 'karton'],
  },
  {
    info: { label: 'Carta', bin: 'Bidone Blu (Carta/Cartone)', color: '#1565C0', icon: '📄' },
    keywords: ['paper', 'carta', 'papier', 'papel', 'kraft'],
  },
  {
    info: { label: 'Metallo', bin: 'Bidone Giallo (Plastica/Metallo)', color: '#F9A825', icon: '🥫' },
    keywords: ['metal', 'metallo', 'metallic', 'metaal', 'tin', 'tinplate', 'latta', 'banda-stagnata'],
  },
  {
    info: { label: 'Alluminio', bin: 'Bidone Giallo (Plastica/Metallo)', color: '#F9A825', icon: '🥫' },
    keywords: ['aluminium', 'aluminum', 'alluminio'],
  },
  {
    info: { label: 'Acciaio', bin: 'Bidone Giallo (Plastica/Metallo)', color: '#F9A825', icon: '🔩' },
    keywords: ['steel', 'acciaio', 'inox'],
  },
  {
    info: { label: 'Legno', bin: 'Centro di Raccolta', color: '#6D4C41', icon: '🪵' },
    keywords: ['wood', 'legno', 'bois', 'holz', 'madera'],
  },
  {
    info: { label: 'Tetrapak', bin: 'Bidone Giallo (Plastica/Metallo)', color: '#F9A825', icon: '🥛' },
    keywords: ['tetra', 'tetrapak', 'tetra-pak', 'tetra-brik', 'brick', 'brik', 'beverage-carton'],
  },
  {
    info: { label: 'Polistirolo', bin: 'Bidone Giallo (Plastica/Metallo)', color: '#F9A825', icon: '📦' },
    keywords: ['polystyrene', 'polistirolo', 'polistirene', 'styrofoam', 'eps'],
  },
];

const FALLBACK_DISPOSAL = {
  label: 'Indifferenziato',
  bin: 'Bidone Nero (Rifiuto Generico)',
  color: '#757575',
  icon: '🗑️',
};

// Whole-word (token) match: anything that is not a letter or digit counts as a
// boundary, so "plastic" matches "en:plastic" and "pet" matches "pet-1" while
// short resin codes like "pp"/"ps" never leak into unrelated words.
function matchesKeyword(text, keyword) {
  const escaped = keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(text);
}

// Collects every packaging signal Open Food Facts exposes — the tag lists, the
// free-text fields and the structured "packagings" array — into one lowercase
// string. Reading all of them (not just packaging/packaging_tags) is what stops
// products whose material lives only in packaging_materials_tags / packagings
// from wrongly falling back to "Indifferenziato".
function collectPackagingText(product) {
  const parts = [];
  const addTags = (arr) => { if (Array.isArray(arr)) parts.push(arr.join(' ')); };

  addTags(product.packaging_tags);
  addTags(product.packaging_materials_tags);
  addTags(product.packagings_materials_tags);
  if (product.packaging) parts.push(product.packaging);
  if (product.packaging_text) parts.push(product.packaging_text);

  if (Array.isArray(product.packagings)) {
    for (const pk of product.packagings) {
      if (!pk) continue;
      if (typeof pk.material === 'string') parts.push(pk.material);
      else if (pk.material && pk.material.id) parts.push(pk.material.id);
      addTags(pk.material_tags);
    }
  }

  return parts.join(' ').toLowerCase();
}

function resolveDisposal(product) {
  if (!product) return [FALLBACK_DISPOSAL];

  const combined = collectPackagingText(product);
  if (!combined.trim()) return [FALLBACK_DISPOSAL];

  const seenBin = new Set();
  const result = [];
  for (const cat of DISPOSAL_CATEGORIES) {
    if (!cat.keywords.some((kw) => matchesKeyword(combined, kw))) continue;
    if (seenBin.has(cat.info.bin)) continue;
    seenBin.add(cat.info.bin);
    result.push(cat.info);
  }

  return result.length > 0 ? result : [FALLBACK_DISPOSAL];
}

// GET /api/zx/scan/:barcode
// Receives a barcode scanned via ZXing/expo-camera on the client.
// Fetches product data from Open Food Facts with a hard timeout and returns
// a clean payload including pre-computed disposal categories.
router.get('/scan/:barcode', async (req, res) => {
  const { barcode } = req.params;
  const { userId } = req.query;
  if (!barcode) return res.status(400).json({ error: 'Barcode obbligatorio' });

  // Hard 8-second timeout on the upstream Open Food Facts call so that
  // a slow external API cannot leave the frontend in an infinite loading state.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RiciclApp/1.0 (riciclapp@example.com)' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`OFF HTTP ${response.status}`);

    const data = await response.json();

    if (data.status === 0) {
      return res.status(404).json({ status: 0, error: 'Prodotto non trovato' });
    }

    const p = data.product;
    const disposal = resolveDisposal(p);

    const cooldownMs = 10 * 60 * 1000; // 10 minuti

    let reward = {
      granted: false,
      canReceiveReward: false,
      pointsAdded: 0,
      totalPoints: null,
      remainingSeconds: null,
      nextRewardAt: null,
      message: 'Utente non specificato'
    };


    if (userId) {
      const user = await User.findById(userId);

      if (user) {
        const now = new Date();
        const lastScan = user.lastScanRewardAt;

        if (!lastScan || now - lastScan >= cooldownMs) {
          // Boost evento: i partecipanti a un evento attivo che potenzia uno dei
          // tipi di rifiuto del prodotto ricevono i punti moltiplicati.
          const disposalLabels = (disposal || []).map(d => d.label);
          const boost = await eventBoostFor(userId, disposalLabels);
          const gained = BASE_SCAN_POINTS * boost;

          user.points = (user.points || 0) + gained;
          user.lastScanRewardAt = now;
          await user.save();

          const nextRewardAt = new Date(now.getTime() + cooldownMs);

          reward = {
            granted: true,
            canReceiveReward: false,
            pointsAdded: gained,
            boost,
            totalPoints: user.points,
            remainingSeconds: Math.ceil(cooldownMs / 1000),
            nextRewardAt,
            message: boost > 1
              ? `Punti scansione aggiunti (boost evento x${boost})`
              : 'Punti scansione aggiunti'
          };
        } else {
          const remainingMs = cooldownMs - (now - lastScan);
          const remainingSeconds = Math.ceil(remainingMs / 1000);
          const nextRewardAt = new Date(lastScan.getTime() + cooldownMs);

          reward = {
            granted: false,
            canReceiveReward: false,
            pointsAdded: 0,
            totalPoints: user.points,
            remainingSeconds,
            nextRewardAt,
            message: 'Attendere prima di ottenere altri punti da una scansione'
          };
        }
      }
    }

    return res.json({
      status: 1,
      barcode,
      product: {
        product_name:          p.product_name || null,
        brands:                p.brands || null,
        quantity:              p.quantity || null,
        categories:            p.categories || null,
        countries:             p.countries || null,
        packaging:             p.packaging || null,
        packaging_tags:        p.packaging_tags || [],
        ecoscore_grade:        p.ecoscore_grade || null,
        image_front_small_url: p.image_front_small_url || null,
      },
      disposal,
      reward
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error('ZX scan timeout: Open Food Facts did not respond in 8 s');
      return res.status(504).json({ status: 0, error: 'Timeout nella ricerca del prodotto' });
    }
    console.error('ZX scan error:', err.message);
    return res.status(500).json({ status: 0, error: 'Errore nel recupero dati dal database prodotti' });
  }
});

module.exports = router;
