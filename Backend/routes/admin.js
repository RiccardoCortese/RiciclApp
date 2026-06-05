const express = require('express');
const router  = express.Router();

const User           = require('../models/user');
const Bin            = require('../models/Bin');
const authMiddleware = require('../middleware/authMiddleware');

// Tipi di rifiuto selezionabili. Coincidono con le categorie di smaltimento
// dei prodotti scansionabili tramite Open Food Facts (vedi PACKAGING_DISPOSAL
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
// Accettati:  role=operator  →  operatori
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

        // Sola lettura — restituisce solo id, nome ed email, mai la password
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
// Body: { name, address, coordinates: { lat, lng }, wasteTypes: [..] }
router.post('/bins', authMiddleware, async (req, res) => {
    try {
        const { name, address, coordinates, wasteTypes } = req.body || {};

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

        // binCode e sensorCode generati automaticamente per i bidoni piazzati.
        const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

        const bin = await Bin.create({
            binCode:    `BIN-${unique}`,
            name:       String(name).trim(),
            address:    String(address).trim(),
            coordinates: { lat, lng },
            wasteTypes: types,
            wasteType:  types[0], // compatibilità col campo legacy
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

module.exports = router;
