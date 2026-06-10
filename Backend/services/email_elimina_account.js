const nodemailer = require('nodemailer'); // Per inviare email di eliminazione account
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

// Funzione per inviare email di eliminazione account
async function sendAccountDeletionEmail({ username, email }) {
    try {
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Account eliminato da RiciclApp',
            text: `Ciao ${username},\n\nIl tuo account su RiciclApp è stato eliminato con successo. Siamo spiacenti di vederti andare via!\n\n
            Ti ricordiamo che puoi sempre registrarti di nuovo in futuro se cambi idea :)\n\n
            Saluti,\n
            Il team di RiciclApp`
        };
        await transporter.sendMail(mailOptions);
        return true; // Email inviata con successo
    } catch (error) {
        return false; // Email non inviata
    }
}

module.exports = { sendAccountDeletionEmail };