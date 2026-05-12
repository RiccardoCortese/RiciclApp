const express = require('express');
const router = express.Router();

const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');

// Rotta protetta per ottenere i dati dell'utente loggato
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        // req.user.userId arriva dal token JWT verificato nel middleware
        const user = await User.findById(req.user.userId).select('-passwordHash');

        if (!user) {
            return res.status(404).json({
                message: 'Utente non trovato'
            });
        }

        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                points: user.points
            }
        });

    } catch (error) {
        console.error('Errore durante il recupero del profilo:', error);
        res.status(500).json({
            message: 'Errore del server'
        });
    }
});

module.exports = router;
