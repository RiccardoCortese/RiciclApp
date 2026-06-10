const express = require('express');
const router = express.Router();

// Connessione a OpenFreeMap  (https://openfreemap.org)
const OFM_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// Restituisce la configurazione della mappa usata dal frontend
router.get('/config', (_req, res) => {
  res.json({
    styleUrl: OFM_STYLE_URL,
    center: { lat: 46.0667, lon: 11.1333 }, // Trento, Italia
    zoom: 14,
  });
});

module.exports = router;
