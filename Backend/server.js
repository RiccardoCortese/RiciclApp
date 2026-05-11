const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // serve per forzare l'uso di DNS pubblici (Google) e risolvere problemi di connessione a MongoDB Atlas perchè alcuni ISP bloccano i DNS di default

const express = require('express');
const connectDB = require('./config/db');
require('dotenv').config();
const cors = require('cors'); // Middleware per abilitare CORS (Cross-Origin Resource Sharing) e permettere al frontend di comunicare con il backend senza problemi di CORS

const app = express();
app.use(cors());
// 1. connessione al database MongoDB Atlas
connectDB();

// 2. Middleware per leggere i JSON (utile per la registrazione)
app.use(express.json());


// ---- ROTTE ----

//rotta per l'autenticazione (registrazione e login)
app.use('/api/auth', require('./routes/auth')); // Tutte le rotte di autenticazione (registrazione e login) saranno accessibili tramite /api/auth/<register o login>

// Rotte di prova
app.get('/', (req, res) => {
  res.send('Server RiciclApp attivo e connesso ad Atlas!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server in esecuzione sulla porta ${PORT}`));