const express = require('express');
const router = express.Router();

const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const { sendPasswordResetEmail } = require('../services/email_verification');
const { sendAccountDeletionEmail } = require('../services/email_elimina_account');

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

// Rotta protetta per richiedere il reset della password tramite codice email
router.post('/profile/request-password-reset', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedResetCode = await bcrypt.hash(resetCode, 10);

        user.passwordResetToken = hashedResetCode;
        await user.save();

        const emailSent = await sendPasswordResetEmail({ username: user.name, email: user.email }, resetCode);

        if (!emailSent) {
            return res.status(500).json({ message: 'Errore durante l\'invio dell\'email' });
        }

        res.status(200).json({ message: 'Codice di reset inviato via email' });
        console.log(`Codice di reset inviato a ${user.email}`);

    } catch (error) {
        console.error('Errore durante la richiesta di reset password:', error);
        res.status(500).json({ message: 'Errore del server' });
    }
});

// Rotta protetta per reimpostare la password con il codice ricevuto via email
router.post('/profile/reset-password', authMiddleware, async (req, res) => {
    try {
        const { newPassword, code } = req.body;

        if (!newPassword || !code) {
            return res.status(400).json({ message: 'Inserisci la nuova password e il codice' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'La nuova password deve essere lunga almeno 6 caratteri' });
        }

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        if (!user.passwordResetToken) {
            return res.status(400).json({ message: 'Nessun reset richiesto. Premi prima il pulsante per ricevere il codice.' });
        }

        const isCodeValid = await bcrypt.compare(code, user.passwordResetToken);

        if (!isCodeValid) {
            return res.status(400).json({ message: 'Codice errato' });
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        user.passwordResetToken = null;
        await user.save();

        res.status(200).json({ message: 'Password reimpostata con successo' });
        console.log(`Password reimpostata per l'utente ${user.email}`);

    } catch (error) {
        console.error('Errore durante il reset della password:', error);
        res.status(500).json({ message: 'Errore del server' });
    }
});

// Rotta protetta per eliminare l'account dell'utente loggato con token JWT
router.delete('/delete', authMiddleware, async (req, res) => {
    try {
        // req.user.userId arriva dal token JWT verificato nel middleware
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({message: "Utente non trovato"});
        }

        // Elimina l'utente dal database, funzione findByIdAndDelete è più efficiente perché elimina direttamente senza dover prima recuperare l'utente
        //è una funzione di mongoose
        await User.findByIdAndDelete(req.user.userId); 

        // Invia l'email di eliminazione account
        await sendAccountDeletionEmail({ username: user.name, email: user.email });

        res.status(200).json({message: "Account eliminato con successo"});
    } catch (error) {
        console.error('Errore durante l\'eliminazione dell\'account:', error);
        res.status(500).json({message: 'Errore del server'});
    }
});

//rotta per ottenere tutti gli utenti (solo per admin)
router.get('/all', authMiddleware, async (req, res) => {
    try {
        // Verifica che l'utente sia un admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accesso negato: solo admin possono accedere a questa risorsa' });
        }

        const users = await User.find({}, { password: 0, passwordResetToken: 0 }); // Esclude i campi sensibili
        console.log("Utenti recuperati:", users);
        res.status(200).json({ users });
    } catch (error) {
        console.error('Errore durante il recupero degli utenti:', error);
        res.status(500).json({ message: 'Errore del server' });
    }
});

module.exports = router;
