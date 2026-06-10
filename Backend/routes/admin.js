const express = require('express');
const router  = express.Router();

const mongoose       = require('mongoose');
const User           = require('../models/user');
const Bin            = require('../models/bin');
const Center         = require('../models/collection_center');
const authMiddleware = require('../middleware/authMiddleware');

// Tipi di rifiuto selezionabili. Coincidono con le categorie di smaltimento
// dei prodotti scansionabili tramite Open Food Facts (vedi DISPOSAL_CATEGORIES
// in routes/ZX_API.js), deduplicate per etichetta. Questo definisce anche il
// numero massimo di tipi che un singolo bidone può accettare.
const WASTE_TYPES = [
    'Plastica',
    'Vetro',
    'Carta / Cartone',
    'Carta',
    'Metallo',
    'Alluminio',
    'Acciaio',
    'Legno',
    'Tetrapak',
    'Polistirolo',
    'Indifferenziato',
];

// ── GET /api/admin/users?role=<role>  (sola lettura) ─────────────────────────
// Restituisce la lista degli utenti filtrata per ruolo.
// Valori accettati:  role=operator  →  operatori
//             role=user      →  cittadini (alias di registered_user nel DB)
// Richiede un token JWT valido.
router.get('/users', authMiddleware, async (req, res) => {
    try {
        const { role } = req.query;

        // Mappa l'alias "user" usato dal frontend al valore reale nel DB
        const dbRole = role === 'user' ? 'registered_user' : role;

        if (!dbRole) {
            return res.status(400).json({ message: 'Parametro role mancante' });
        }

        // Sola lettura — restituisce solo ID, nome ed email, mai la password
        const users = await User
            .find({ role: dbRole })
            .select('name email role')
            .lean();

        res.status(200).json(users);
    } catch (error) {
        console.error('Errore durante il recupero degli utenti (admin):', error);
        res.status(500).json({ message: 'Errore del server' });
    }
});

// ── GET /api/admin/waste-types ───────────────────────────────────────────────
// Elenco dei tipi di rifiuto selezionabili per un nuovo bidone.
router.get('/waste-types', authMiddleware, (req, res) => {
    res.status(200).json(WASTE_TYPES);
});

// ── GET /api/admin/bins ──────────────────────────────────────────────────────
// Restituisce i bidoni piazzati liberamente sulla mappa (quelli con coordinate).
router.get('/bins', authMiddleware, async (req, res) => {
    try {
        const bins = await Bin
            .find({ 'coordinates.lat': { $ne: null }, 'coordinates.lng': { $ne: null } })
            .lean();
        res.status(200).json(bins);
    } catch (error) {
        console.error('Errore durante il recupero dei bidoni (admin):', error);
        res.status(500).json({ message: 'Errore del server' });
    }
});

// ── POST /api/admin/bins ─────────────────────────────────────────────────────
// Crea un nuovo bidone piazzato sulla mappa dall'admin.
// Body: { name, address, coordinates: { lat, lng }, wasteTypes: [..],
//         centerId?, area?, status? }
// Lo stato predefinito è "OK" se il bidone è collegato a un centro di raccolta,
// altrimenti "GUASTO" (un bidone senza centro è considerato non operativo).
router.post('/bins', authMiddleware, async (req, res) => {
    try {
        const { name, address, coordinates, wasteTypes, centerId, area, status } = req.body || {};

        // Validazione: nome, indirizzo, coordinate valide e almeno un tipo di rifiuto.
        if (!name || !String(name).trim()) {
            return res.status(400).json({ message: 'Nome del bidone obbligatorio' });
        }
        if (!address || !String(address).trim()) {
            return res.status(400).json({ message: 'Indirizzo del bidone obbligatorio' });
        }
        const lat = Number(coordinates?.lat);
        const lng = Number(coordinates?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return res.status(400).json({ message: 'Coordinate non valide' });
        }
        const types = Array.isArray(wasteTypes)
            ? wasteTypes.filter(t => t && String(t).trim())
            : [];
        if (types.length === 0) {
            return res.status(400).json({ message: 'Serve almeno un tipo di rifiuto' });
        }

        // Centro di raccolta opzionale: se assente il bidone resta "orfano" (centerId null).
        let center = null;
        if (centerId) {
            if (!mongoose.Types.ObjectId.isValid(centerId)) {
                return res.status(400).json({ message: 'ID del centro non valido' });
            }
            center = centerId;
        }

        // Stato: rispetta una scelta esplicita dell'admin se valida, altrimenti
        // "OK" con un centro collegato, "GUASTO" senza.
        const finalStatus = ADMIN_STATUSES.includes(status)
            ? status
            : (center ? 'OK' : 'GUASTO');

        // binCode e sensorCode generati automaticamente per i bidoni piazzati.
        const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

        const bin = await Bin.create({
            binCode:    `BIN-${unique}`,
            name:       String(name).trim(),
            address:    String(address).trim(),
            coordinates: { lat, lng },
            area:       area ? String(area).trim() : undefined,
            wasteTypes: types,
            wasteType:  types[0], // Compatibilità col campo legacy
            centerId:   center || undefined,
            status:     finalStatus,
            sensor:     { sensorCode: `SENS-${unique}` },
        });

        res.status(201).json(bin);
    } catch (error) {
        console.error('Errore durante la creazione del bidone (admin):', error);
        res.status(500).json({ message: 'Errore del server' });
    }
});

// Stati selezionabili dall'admin (etichette → valore nel DB)
const ADMIN_STATUSES = ['OK', 'GUASTO', 'MANUTENZIONE'];

// ── PATCH /api/admin/bins/:id/status ─────────────────────────────────────────
// Aggiorna lo stato di un bidone: Operativo (OK), Guasto (GUASTO),
// In riparazione (MANUTENZIONE).
router.patch('/bins/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body || {};
        if (!ADMIN_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Stato non valido' });
        }
        const bin = await Bin.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );
        if (!bin) {
            return res.status(404).json({ message: 'Bidone non trovato' });
        }
        res.status(200).json(bin);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'ID del bidone non valido' });
        }
        console.error('Errore durante l\'aggiornamento dello stato del bidone (admin):', error);
        res.status(500).json({ message: 'Errore del server' });
    }
});

// ── DELETE /api/admin/bins/:id ───────────────────────────────────────────────
// Elimina definitivamente un bidone dal database.
router.delete('/bins/:id', authMiddleware, async (req, res) => {
    try {
        const deleted = await Bin.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Bidone non trovato' });
        }
        res.status(200).json({ message: 'Bidone eliminato', id: req.params.id });
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'ID del bidone non valido' });
        }
        console.error('Errore durante l\'eliminazione del bidone (admin):', error);
        res.status(500).json({ message: 'Errore del server' });
    }
});

// ── POST /api/admin/centers ──────────────────────────────────────────────────
// Crea un nuovo centro di raccolta piazzato sulla mappa dall'admin.
// Body: { name, address, area, coordinates: { lat, lng }, openingHours? }
// Se "openingHours" è assente/vuoto si applica il default dello schema.
// Auto-assegnazione: se è l'unico centro nel quartiere (area), tutti i bidoni
// orfani della stessa area gli vengono collegati e quelli "GUASTO" tornano "OK".
router.post('/centers', authMiddleware, async (req, res) => {
    try {
        const { name, address, area, coordinates, openingHours } = req.body || {};

        if (!name || !String(name).trim()) {
            return res.status(400).json({ message: 'Nome del centro obbligatorio' });
        }
        if (!address || !String(address).trim()) {
            return res.status(400).json({ message: 'Indirizzo del centro obbligatorio' });
        }
        if (!area || !String(area).trim()) {
            return res.status(400).json({ message: 'Quartiere (area) del centro obbligatorio' });
        }
        const lat = Number(coordinates?.lat);
        const lng = Number(coordinates?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return res.status(400).json({ message: 'Coordinate non valide' });
        }

        const areaName = String(area).trim();

        const centerData = {
            name:        String(name).trim(),
            address:     String(address).trim(),
            area:        areaName,
            coordinates: { lat, lng },
        };
        // Imposta gli orari solo se forniti, altrimenti lascia il default dello schema.
        if (openingHours && String(openingHours).trim()) {
            centerData.openingHours = String(openingHours).trim();
        }

        const center = await Center.create(centerData);

        // Auto-assegnazione dei bidoni orfani se questo è l'unico centro del quartiere.
        let assignedBins = 0;
        const centersInArea = await Center.countDocuments({ area: areaName });
        if (centersInArea === 1) {
            const orphanFilter = {
                area: areaName,
                $or: [{ centerId: null }, { centerId: { $exists: false } }],
            };
            const res1 = await Bin.updateMany(orphanFilter, { centerId: center._id });
            // I bidoni appena collegati che erano "GUASTO" (perché senza centro) tornano "OK".
            await Bin.updateMany(
                { centerId: center._id, status: 'GUASTO' },
                { status: 'OK' }
            );
            assignedBins = res1.modifiedCount ?? res1.nModified ?? 0;
        }

        res.status(201).json({ ...center.toObject(), assignedBins });
    } catch (error) {
        console.error('Errore durante la creazione del centro (admin):', error);
        res.status(500).json({ message: 'Errore del server' });
    }
});

module.exports = router;
