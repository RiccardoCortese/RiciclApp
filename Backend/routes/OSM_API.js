const express = require('express');
const router = express.Router();

const NOMINATIM_HEADERS = { 'User-Agent': 'RiciclApp/1.0 (riciclapp@example.com)' };

// Geocoding search — returns up to `limit` locations matching the query
router.get('/search', async (req, res) => {
  const { q, limit = 5 } = req.query;
  if (!q) return res.status(400).json({ error: 'Parametro q obbligatorio' });

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=${limit}&addressdetails=1`;
    const response = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('OSM search error:', err.message);
    res.status(500).json({ error: 'Errore nel recupero dati da Nominatim' });
  }
});

// Reverse geocoding — returns address for a given lat/lon
router.get('/reverse', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'Parametri lat e lon obbligatori' });

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const response = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('OSM reverse error:', err.message);
    res.status(500).json({ error: 'Errore nel recupero dati da Nominatim' });
  }
});

module.exports = router;
