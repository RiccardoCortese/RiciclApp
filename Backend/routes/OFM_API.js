const express = require('express');
const router = express.Router();

// OpenFreeMap is a free, no-API-key tile service (https://openfreemap.org)
const OFM_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// Returns the map configuration for the frontend to consume
router.get('/config', (_req, res) => {
  res.json({
    styleUrl: OFM_STYLE_URL,
    center: { lat: 46.0667, lon: 11.1333 }, // Trento, Italy
    zoom: 14,
  });
});

module.exports = router;
