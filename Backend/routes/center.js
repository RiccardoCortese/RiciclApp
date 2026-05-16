const express = require('express');
const router = express.Router();
const Center = require('../models/collection_center'); 


// Rotta per visualizzare tutti i centri di raccolta
router.get('/all', async (req, res) => {
    try {
        const centers = await Center.find(); // Recupero tutti i centri di raccolta dal database
        res.status(200).json(centers); // Ritorno i centri di raccolta come risposta
    } catch (error) {
        console.error('Errore durante il recupero dei centri di raccolta:', error);
        res.status(500).json({ message: 'Errore del server' }); // Ritorno un errore del server
    }
});



module.exports = router;
