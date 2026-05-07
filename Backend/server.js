const express = require('express');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

// 1. connessione al database MongoDB Atlas
connectDB();

// 2. Middleware per leggere i JSON (utile per la registrazione)
app.use(express.json());

// 3. Rotte di prova
app.get('/', (req, res) => {
  res.send('Server RiciclApp attivo e connesso ad Atlas!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server in esecuzione sulla porta ${PORT}`));