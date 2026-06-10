// server.js
// Punto di ingresso di PRODUZIONE: connette il database e avvia il server.
// La costruzione dell'app (middleware + rotte) vive in app.js, così i test
// possono importare l'app senza avviare una porta né connettersi a MongoDB.

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Forza i DNS pubblici di Google per evitare problemi di connessione a MongoDB Atlas

require('dotenv').config();
const connectDB = require('./config/db');
const app = require('./app');

// 1. Connessione al database MongoDB Atlas
connectDB();

// 2. Avvio del server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server in esecuzione sulla porta ${PORT}`));
