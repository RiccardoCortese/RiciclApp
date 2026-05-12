const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Per l'hash delle password
const User = require('../models/user'); // Importa il modello User

//Rotta per la registrazione: Uso POST per inviare i dati del nuovo utente
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body; // Estaggo i dati dal corpo della richiesta

    try {
        console.log("Dati ricevuti:", username, email); // Log dei dati ricevuti 
        // Controllo se l'utente esiste già
        const existingUser = await User.findOne({ email }); //controllo se esiste già un utente con la stessa email
        if (existingUser) {
            console.log("Utente già esistente con email:", email); // Log se l'utente esiste già
            return res.status(400).json({ message: 'Utente già registrato' }); // Se esiste, ritorno un errore
        }

        //ALTRIMENTI
        // Hash della password prima di salvarla
        const salt = await bcrypt.genSalt(10); // Genero un salt per l'hash
        const hashedPassword = await bcrypt.hash(password, salt); // Hash della password

        // Creo un nuovo utente con i dati forniti
        const newUser = new User({
            name: username, // Salvo il nome utente
            email,
            passwordHash: hashedPassword // Salvo la password hashata
        });
        
        await newUser.save(); // Salvo l'utente nel database
        res.status(201).json({ message: 'Utente registrato con successo' }); // Ritorno un messaggio di successo
        console.log("Nuovo utente registrato:", email); // Log del nuovo utente registrato

    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        res.status(500).json({ message: 'Errore del server' }); // Ritorno un errore del server
        console.log(error); // Log dell'errore per il debug
    }
});

module.exports = router; // Esporto il router per poterlo usare in server.js