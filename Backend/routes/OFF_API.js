const express = require('express');
const router = express.Router();

// Proxy Open Food Facts — avoids CORS issues on the frontend
router.get('/product/:barcode', async (req, res) => {
  const { barcode } = req.params;
  if (!barcode) return res.status(400).json({ error: 'Barcode obbligatorio' });

  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RiciclApp/1.0 (riciclapp@example.com)' },
    });
    if (!response.ok) throw new Error(`OFF HTTP ${response.status}`);
    const data = await response.json();

    if (data.status === 0) {
      return res.status(404).json({ status: 0, error: 'Prodotto non trovato' });
    }

    res.json(data);
  } catch (err) {
    console.error('OFF product error:', err.message);
    res.status(500).json({ error: 'Errore nel recupero dati da OpenFoodFacts' });
  }
});

module.exports = router;
