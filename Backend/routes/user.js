const express = require('express');
const router = express.Router();

const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const { sendAccountDeletionEmail } = require('../services/email_elimina_account'); // Importa la funzione per inviare email di eliminazione account
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

module.exports = router;
