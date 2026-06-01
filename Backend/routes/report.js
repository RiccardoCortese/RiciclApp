const expess = require('express');
const router = expess.Router();
const Report = require('../models/reports');
const Bin = require('../models/bin');

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
        await Bin.findByIdAndUpdate(binId, { status: 'SEGNALATO' });
        res.status(201).json({ message: 'Report creato con successo', report });
    } catch (error) {
        res.status(500).json({message: 'Errore interno del server durante la creazione del report' });
    }
});

//GET per recuperare tutte le segnalazioni (per admin)
router.get('/all', async (req, res) => {
    try {
        const reports = await Report.find().populate('userId', 'name email role').populate('binId', 'location status');
        console.log('Segnalazioni recuperate:', reports);

        // aggiungo nome del bidone a ogni report e tipologia
        const reportsWithBinInfo = await Promise.all(reports.map(async (report) => {
            const bin = await Bin.findById(report.binId);
            return {
                ...report._doc,
                binName: bin?.binCode || 'Nome non disponibile',
                binType: bin?.wasteType || 'Tipologia non disponibile'
            };
        }));
        console.log('Segnalazioni con info del bidone:', reportsWithBinInfo);
        res.status(200).json({ reports: reportsWithBinInfo });
    } catch (error) {
        res.status(500).json({ message: 'Errore interno del server durante il recupero delle segnalazioni' });
    }
});


module.exports = router;