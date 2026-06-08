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
