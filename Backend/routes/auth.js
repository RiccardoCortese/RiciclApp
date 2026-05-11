const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Per l'hash delle password
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Importa il modello User

//Rotta per la registrazione: Uso POST per inviare i dati del nuovo utente
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body; // Estaggo i dati dal corpo della richiesta

    try {
        console.log("Dati ricevuti:", name, email, password); // Log dei dati ricevuti (escludo la password per sicurezza)
        // Controllo se l'utente esiste già
        const existingUser = await User.findOne({ email }); //controllo se esiste già un utente con la stessa email
        if (existingUser) {
            return res.status(400).json({ message: 'Utente già registrato' }); // Se esiste, ritorno un errore
        }

        //ALTRIMENTI
        // Hash della password prima di salvarla
        const salt = await bcrypt.genSalt(10); // Genero un salt per l'hash
        const hashedPassword = await bcrypt.hash(password, salt); // Hash della password

        // Creo un nuovo utente con i dati forniti
        const newUser = new User({
            name,
            email,
            passwordHash: hashedPassword // Salvo la password hashata
        });
        
        await newUser.save(); // Salvo l'utente nel database
        res.status(201).json({ message: 'Utente registrato con successo' }); // Ritorno un messaggio di successo

    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        res.status(500).json({ message: 'Errore del server' }); // Ritorno un errore del server
    }
});

// Rotta per il login: controllo email e password dell'utente
router.post('/login', async (req, res) => {
    const { email, password } = req.body; // Estraggo email e password dal corpo della richiesta

    try {
        // Cerco l'utente tramite email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Email o password non validi' });
        }

        // Confronto la password inserita con quella salvata nel database
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Email o password non validi' });
        }
        
        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1d'
            }
        );

        // Se email e password sono corrette, il login va a buon fine
        res.status(200).json({
            message: 'Login effettuato con successo',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                points: user.points
            }
        });

    } catch (error) {
        console.error('Errore durante il login:', error);
        res.status(500).json({ message: 'Errore del server' });
    }
});

module.exports = router; // Esporto il router per poterlo usare in server.js
