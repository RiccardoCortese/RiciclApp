const express = require('express');
const router = express.Router();
const Center = require('../models/collection_center'); 
const Bin = require('../models/Bin');
const mongoose = require('mongoose'); 

//Rotta per visualizzare tutti i centri di raccolta
router.get('/all', async (req, res) => {
    try {
        const centers = await Center.find(); 
        return res.status(200).json(centers); 
    } catch (error) {
        console.error('Errore durante il recupero dei centri di raccolta:', error);
        return res.status(500).json({ message: 'Errore del server' }); 
    }
});

// Rotta per i bidoni "non assegnati" (senza centro di raccolta).
// Restituisce uno pseudo-centro così che la vista di dettaglio possa gestirli
// con la stessa interfaccia di un centro reale. Va dichiarata PRIMA di "/:id"
// per non essere oscurata dalla rotta dinamica.
router.get('/unassigned', async (req, res) => {
    try {
        const bins = await Bin.find({
            $or: [{ centerId: null }, { centerId: { $exists: false } }],
        });
        return res.json({
            _id: 'unassigned',
            name: 'Bidoni non assegnati',
            address: 'Bidoni senza centro di raccolta collegato',
            bins: bins || [],
        });
    } catch (error) {
        console.error('Errore durante il recupero dei bidoni non assegnati:', error);
        return res.status(500).json({ message: 'Errore del server' });
    }
});

// Tutti i bidoni piazzati sulla mappa (con coordinate valide). Pubblico: serve
// a mostrare i bidoni anche sulle mappe di cittadini e operatori, non solo admin.
// Va dichiarata PRIMA di "/:id" per non essere oscurata dalla rotta dinamica.
router.get('/bins', async (req, res) => {
    try {
        const bins = await Bin.find({
            'coordinates.lat': { $ne: null },
            'coordinates.lng': { $ne: null },
        }).lean();
        return res.json(bins);
    } catch (error) {
        console.error('Errore durante il recupero dei bidoni (mappa):', error);
        return res.status(500).json({ message: 'Errore del server' });
    }
});

router.get('/bins/:binId/fill-level', async (req, res) => {
  try {
    const { binId } = req.params;

    const bin = await Bin.findById(binId);

    if (!bin) {
      return res.status(404).json({ message: 'Bidone non trovato' });
    }

    const fillLevel = Number(bin.fillLevel || 0);

    let fillColor;
    let fillLabel;

    if (fillLevel >= 80) {
      fillColor = '#d32f2f';
      fillLabel = 'Pieno';
    } else if (fillLevel >= 50) {
      fillColor = '#f9a825';
      fillLabel = 'Medio riempimento';
    } else {
      fillColor = '#2e7d32';
      fillLabel = 'Disponibile';
    }

    bin.status = fillLevel >= 80 ? 'PIENO' : 'OK';
    await bin.save();

    return res.status(200).json({
      _id: bin._id,
      binCode: bin.binCode,
      name: bin.name,
      wasteType: bin.wasteType,
      wasteTypes: bin.wasteTypes,
      fillLevel,
      status: bin.status,
      fillColor,
      fillLabel,
      sensor: bin.sensor,
      updatedAt: bin.updatedAt,
    });
  } catch (error) {
    console.error('Errore recupero livello riempimento:', error);
    return res.status(500).json({ message: 'Errore server' });
  }
});

//Rotta per il singolo centro + i suoi bidoni
router.get('/:id', async (req, res) => {
  try {
    const centerId = req.params.id;

    // Cerca il centro su MongoDB usando l'ID e trasformo in oggetto JS modificabile 
    const center = await Center.findById(centerId).lean();
    
    if (!center) {
      return res.status(404).json({
        success: false,
        message: "Centro di raccolta non trovato nel database."
      });
    }

    // array con condizioni per cercare i bidoni associati al centro, considerando sia l'ID come ObjectId che come stringa (per sicurezza)
    const queryCondizioni = [
      { centerId: centerId }, 
      { centerId: centerId.toString() } 
    ];

    //Bidoni associati
    const bins = await Bin.find({ $or: queryCondizioni });

    //aggiungo i bidoni all'oggetto del centro prima di restituirlo al frontend
    center.bins = bins || [];

    // Restituisce l'oggetto completo al frontend 
    return res.json(center);

  } catch (error) {

    if (error.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false, 
        message: "L'ID del centro fornito non è valido." 
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: "Errore interno del server durante il recupero dei dati." 
    });
  }
});

module.exports = router;