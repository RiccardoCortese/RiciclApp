const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Per l'hash delle password
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Importa il modello User
const { sendVerificationEmail } = require('../services/email_verification'); // Importa la funzione per inviare email di verifica
const user = require('../models/user');

//Rotta per la registrazione: Uso POST per inviare i dati del nuovo utente
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body; // Estaggo i dati dal corpo della richiesta
    
    // --- CONTROLLO DEI DATI INSERITI ---
    if (!username || !email || !password) { // Controllo se tutti i campi sono presenti
        return res.status(400).json({ message: 'Compila tutti i campi' }); 
    }
    else if (password.length < 6) { // Controllo se la password è abbastanza lunga
        return res.status(400).json({ message: 'La password deve essere lunga almeno 6 caratteri' }); 
    }
    else if (!/\S+@\S+\.\S+/.test(email)) { // Controllo se l'email è in un formato valido
        return res.status(400).json({ message: 'Email non valida' });
    }

    try {
        // Controllo se l'utente esiste già
        const existingUser = await User.findOne({ email }); //controllo se esiste già un utente con la stessa email
        if (existingUser) {
            return res.status(400).json({ message: 'Utente già registrato' }); 
        }

        //ALTRIMENTI
        
        // --- INVIO MAIL CON CODICE DI VERIFICA ---
        // Invio l'email di verifica
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Genera un codice di verifica a 6 cifre
        const hashedVerificationCode = await bcrypt.hash(verificationCode, 10); // Hash del codice di verifica prima di salvarlo nel database
        const emailSent = await sendVerificationEmail({ username, email }, verificationCode); // Invio l'email di verifica all'utente

        if (!emailSent) { // Se l'email non è stata inviata correttamente, ritorno un errore
            return res.status(500).json({ message: 'Errore durante l\'invio dell\'email di verifica' });
        }
        

        // --- CREAZIONE UTENTE NEL DATABASE ---
        // Hash della password prima di salvarla
        const salt = await bcrypt.genSalt(10); // Genero un salt per l'hash
        const hashedPassword = await bcrypt.hash(password, salt); // Hash della password

        // Creo un nuovo utente con i dati forniti
        const newUser = new User({
            name: username, 
            email,
            passwordHash: hashedPassword, 
            isVerified: false, 
            verificationToken: hashedVerificationCode 
        });
        await newUser.save(); // Salvo l'utente nel database
        res.status(201).json({ message: 'Utente registrato con successo' }); // Ritorno un messaggio di successo
        console.log("Nuovo utente registrato:", email); // Log del nuovo utente registrato

    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        res.status(500).json({ message: 'Errore del server' }); // Ritorno un errore del server

    }
});

// Rotta per il login: controllo email e password dell'utente
router.post('/login', async (req, res) => {
    const { email, password } = req.body; // Estraggo email e password dal corpo della richiesta

    if (!email || !password) { // Controllo se email e password sono presenti
        return res.status(400).json({ message: 'Compila tutti i campi' }); 
    }

    if (!/\S+@\S+\.\S+/.test(email)) { // Controllo se l'email è in un formato valido
        return res.status(400).json({ message: 'Email non valida' }); 
    }
    

    try {
        // Cerco l'utente tramite email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Email o password non validi' });
        }

        if (user.isVerified === false) { // Controllo se l'utente ha verificato l'email
        return res.status(400).json({ message: 'Email non verificata. Controlla la tua casella di posta.' }); 
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

        console.log(`Utente ${email} ha effettuato il login`); // Log del login effettuato

    } catch (error) {
        console.error('Errore durante il login:', error);
        res.status(500).json({ message: 'Errore del server' });
    }
});

router.post('/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;

        //Cerca l'utente nel database
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "Utente non trovato" });
        }

        // Controllo se il codice corrisponde
        if (!await bcrypt.compare(code, user.verificationToken)) {
            return res.status(400).json({ message: "Codice errato" });
        }

        user.isVerified = true;
        user.verificationToken = undefined; 
        await user.save(); // Salva le modifiche all'utente nel database

        res.status(200).json({ message: "Email verificata con successo! Ora puoi effettuare il login." });
    } catch (error) {
        res.status(500).json({ message: "Errore durante la verifica" });
    }
});

module.exports = router; 

