const expess = require('express');
const router = expess.Router();
const Report = require('../models/reports');
const Bin = require('../models/bins');

//POST per creare un nuovo report
router.post('/create', async (req, res) => {
    try {
        const { userId, binId, description } = req.body;

        const bin = await Bin.findById(binId);
        
        if (!bin) {
            return res.status(404).json({ message: 'Bidone non trovato' });
        }
        else if (!description || description.trim() === '') {
            return res.status(400).json({ message: 'La descrizione è obbligatoria' });
        }
        
        const report = new Report({ 
            userId,
            binId,
            description,
            status: 'PENDING'
        });

        await report.save();
        
        //metto il bidone in manutenzione
        await Bin.findByIdAndUpdate(binId, { status: 'MANUTENZIONE' });
        res.status(201).json({ message: 'Report creato con successo', report });
    } catch (error) {
        res.status(500).json({message: 'Errore interno del server durante la creazione del report' });
    }
});

module.exports = router;