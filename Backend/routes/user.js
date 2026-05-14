const express = require('express');
const router = express.Router();

const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

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

// Rotta protetta per modificare il nome dell'utente loggato
router.patch('/profile/name', authMiddleware, async (req, res) => {
    try {
        const { username } = req.body;

        if (!username || username.trim().length < 2) {
            return res.status(400).json({
                message: 'Il nome deve contenere almeno 2 caratteri'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { name: username.trim() },
            { new: true, runValidators: true }
        ).select('-passwordHash');

        if (!user) {
            return res.status(404).json({
                message: 'Utente non trovato'
            });
        }

        res.status(200).json({
            message: 'Nome aggiornato con successo',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                points: user.points
            }
        });

    } catch (error) {
        console.error('Errore durante la modifica del nome:', error);
        res.status(500).json({
            message: 'Errore del server'
        });
    }
});

// Rotta protetta per modificare la password dell'utente loggato
router.patch('/profile/password', authMiddleware, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                message: 'Inserisci vecchia e nuova password'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: 'La nuova password deve essere lunga almeno 6 caratteri'
            });
        }

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: 'Utente non trovato'
            });
        }

        const isOldPasswordCorrect = await bcrypt.compare(
            oldPassword,
            user.passwordHash
        );

        if (!isOldPasswordCorrect) {
            return res.status(400).json({
                message: 'Vecchia password errata'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        user.passwordHash = newPasswordHash;
        await user.save();

        res.status(200).json({
            message: 'Password aggiornata con successo'
        });

    } catch (error) {
        console.error('Errore durante la modifica della password:', error);
        res.status(500).json({
            message: 'Errore del server'
        });
    }
});

module.exports = router;
