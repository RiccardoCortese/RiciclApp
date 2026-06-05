const express = require('express');
const router  = express.Router();

const User           = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');

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

module.exports = router;
