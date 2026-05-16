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