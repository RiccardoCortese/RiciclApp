const exress = require('express');
const router = exress.Router();
const Report = require('../models/reports');
const Center = require('../models/collection_center');
const Bin = require('../models/bin');

// rotta per generare il percorso ottimizzato per l'operatore
// il percorso è generato in base alle segnalazioni che appartengono all'operatore e ai centri di raccolta pieni (>= 80% di capacità)

router.get('/optimized-route/:operatorId', async (req, res) => {
    try {
        const operatorId = req.params.operatorId;

        // recupera tutte le segnalazioni dell'operatore
        const reports = await Report.find({ 
            assignedTo: operatorId,
            status: 'ASSIGNED' // considera solo le segnalazioni assegnate
        }).populate({ // popola i dati del centro di raccolta associato alla segnalazione
            path: 'binId',
            populate: {
                path: 'centerId'
            }
        });

        // filtra i centri di raccolta pieni (>= 80% di capacità)
        const fullBins = await Bin.find({
            'fillLevel': { $gte: 80 }
        });

        const fullCenters = [];
        for (const bin of fullBins) {
            if (bin.centerId) {
                const center = await Center.findById(bin.centerId);
                if (center) { 
                    fullCenters.push({
                        center: center,
                        bin: bin
                    });
                }
            }
        }

        // crea una lista di punti da visitare (segnalazioni + centri pieni)
        const pointsToVisit = [];

        reports.forEach(report => {
            if (report.binId && report.binId.centerId) {
                pointsToVisit.push({
                    id: report.id,
                    type: 'INTERVENTO',
                    titolo: 'Intervento: ' + (report.description || "Guasto sconosciuto"),
                    indirizzo: report.binId.centerId.address || "Indirizzo sconosciuto",
                    coordinate: {
                        lat: report.binId.centerId.coordinates.lat,
                        lng: report.binId.centerId.coordinates.lng
                    }
                });
            }
        });

        fullCenters.forEach(item => {
            const center = item.center;
            const centerbin = item.bin;
            pointsToVisit.push({
                id: center.id,
                type: 'SVUOTAMENTO',
                titolo: 'Svuotamento: ' + (center.name + ' - ' + centerbin.wasteType + ' (' + centerbin.binCode + ')' || "Centro sconosciuto"),
                indirizzo: center.address || "Indirizzo sconosciuto",
                coordinate: {
                    lat: center.coordinates.lat,
                    lng: center.coordinates.lng
                }
            });
        });
        console.log("Punti da visitare:", pointsToVisit);
        res.status(200).json({ 
            success: true,
            tappe: pointsToVisit 
        });
    } catch (error) {
        console.error('Errore nel generare il percorso ottimizzato:', error);
        res.status(500).json({ error: 'Errore nel generare il percorso ottimizzato' });
    }
});

module.exports = router;

