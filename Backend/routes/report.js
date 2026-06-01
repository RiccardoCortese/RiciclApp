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
        try {
            const reports = await Report.find()
                .populate('userId', 'name email role')
                .populate({
                    path: 'binId',
                    select: 'binCode wasteType status centerId',
                    populate: {
                        path: 'centerId',
                        select: 'name'
                    }
                });

            console.log('Segnalazioni recuperate dal DB:', reports);

            const reportsWithBinInfo = reports.map(report => {
                const reportData = report._doc || report;

                return {
                    ...reportData,
                    binName: reportData.binId?.binCode || 'Nome non disponibile',
                    binType: reportData.binId?.wasteType || 'Tipologia non disponibile',
                    binCenter: reportData.binId?.centerId?.name || 'Centro non disponibile'
                };
            });

            return res.status(200).json({ success: true, reports: reportsWithBinInfo });

        } catch (error) {
            console.error('Errore nel controller report/all:', error);

            return res.status(500).json({
                success: false,
                message: 'Errore interno del server durante il recupero delle segnalazioni.',
                error: error.message
            });
        }

        
        res.status(200).json({ reports: reportsWithBinInfo });
    } catch (error) {
        res.status(500).json({ message: 'Errore interno del server durante il recupero delle segnalazioni' });
    }
});


module.exports = router;