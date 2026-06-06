const expess = require('express');
const router = expess.Router();
const Report = require('../models/reports');
const Bin = require('../models/bin');
const User = require('../models/user');

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
            console.error("Errore update report:", error);
            res.status(500).json({
                message: 'Errore interno del server durante l\'aggiornamento dello stato del report',
                error: error.message
            });
        }

        
        res.status(200).json({ reports: reportsWithBinInfo });
    } catch (error) {
        res.status(500).json({ message: 'Errore interno del server durante il recupero delle segnalazioni' });
    }
});

//PUT per aggiornare lo stato di una segnalazione (es. da PENDING a RESOLVED)
router.put('/update/:reportId', async (req, res) => {
    try {
        const { reportId } = req.params;
        const { status } = req.body;

        const report = await Report.findById(reportId);

        if (!report) {
            return res.status(404).json({ message: 'Report non trovato' });
        }

        const previousStatus = report.status;

        report.status = status;
        await report.save();

        if (status === 'RESOLVED' || status === 'REJECTED') {
            await Bin.findByIdAndUpdate(report.binId, { status: 'OK' });
            await Report.findByIdAndDelete(reportId);
        } else if (status === 'IN_PROGRESS') {
            console.log("Entrato nel blocco ACCEPT");

            await Bin.findByIdAndUpdate(report.binId, { status: 'MANUTENZIONE' });
            console.log("Bidone aggiornato");

            if (previousStatus !== 'IN_PROGRESS') {
                await User.findByIdAndUpdate(report.userId, {
                    $inc: { points: 10 }
                });
                console.log("Punti utente aggiornati");
            }
        }

        res.status(200).json({ message: 'Stato del report aggiornato con successo', report });
    } catch (error) {
        res.status(500).json({ message: 'Errore interno del server durante l\'aggiornamento dello stato del report' });
    }
});

router.put('/assign/:reportId', async (req, res) => {
    try {
        const { reportId } = req.params;
        const { assignedTo } = req.body;

        if (!assignedTo) {
            return res.status(400).json({ success: false, message: "ID operatore mancante." });
        }

        // Trova il report e aggiorna sia il campo dell'operatore sia lo status
        const updatedReport = await Report.findByIdAndUpdate(
            reportId,
            {
                assignedTo: assignedTo,
                status: 'ASSIGNED' // Cambiamo lo status in ASSIGNED
            },
            { new: true }
        );

        if (!updatedReport) {
            return res.status(404).json({ success: false, message: "Segnalazione non trovata." });
        }

        return res.status(200).json({
            success: true,
            message: "Operatore assegnato con successo.",
            report: updatedReport
        });
    } catch (error) {
        console.error("Errore durante l'assegnazione:", error);
        return res.status(500).json({ success: false, message: "Errore del server." });
    }
});
module.exports = router;