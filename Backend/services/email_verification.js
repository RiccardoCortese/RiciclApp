const nodemailer = require('nodemailer'); // Per inviare email di verifica
const dotenv = require('dotenv');

dotenv.config(); // Carica le variabili d'ambiente da .env

// Configura il trasportatore per nodemailer (es. Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: process.env.EMAIL, 
        pass: process.env.PASSWORD_EMAIL 
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Funzione per inviare email di verifica
async function sendVerificationEmail({ username, email }, verificationCode) {
    try {
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Verifica la tua email per RiciclApp',
            text: `Ciao ${username},\n\nGrazie per esserti registrato a RiciclApp! Per favore, verifica la tua email inserendo il seguente codice nell'app:\n\n${verificationCode}\n\nSe non hai richiesto questa registrazione, ignora questa email.\n\nSaluti,\nIl team di RiciclApp`
        };

        await transporter.sendMail(mailOptions);
        return true; // Email inviata con successo
    } catch (error) {
        return false; // Email non inviata
    }
}

module.exports = { sendVerificationEmail };