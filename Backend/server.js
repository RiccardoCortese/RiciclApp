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

// Rotte OpenStreetMap
app.use('/api/osm', require('./routes/OSM_API'));

// Rotte Open Food Facts
app.use('/api/off', require('./routes/OFF_API'));

// Rotte OpenFreeMap (configurazione mappa)
app.use('/api/ofm', require('./routes/OFM_API'));

// rotta per il profilo utente
app.use('/api/user', require('./routes/user'));

// Rotte ZXing — barcode scan → product info + disposal categories
app.use('/api/zx', require('./routes/ZX_API'));

// Rotta per i centri di raccolta
app.use('/api/centers', require('./routes/center'));

// Rotte admin (sola lettura — lista utenti per ruolo)
app.use('/api/admin', require('./routes/admin'));

// Rotta per le segnalazioni sui bidoni
app.use('/api/report', require('./routes/report'));

// Rotta per gli eventi di raccolta (Recycling event)
app.use('/api/events', require('./routes/event'));

// Rotta lista premi e partner commerciali
app.use('/api/rewards', require('./routes/reward'));

// Rotta per generare il percorso ottimizzato per l'operatore
app.use('/api/operator', require('./routes/operator'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server in esecuzione sulla porta ${PORT}`));


  // Questo stamperà l'elenco reale senza far crashare Node
  if (app._router && app._router.stack) {
    app._router.stack.forEach((r) => {
      if (r.name === 'router' && r.handle && r.handle.stack) {
        r.handle.stack.forEach((layer) => {
          if (layer.route) {
            console.log(`> Rotta caricata: ${r.regexp} esegue ${layer.route.path}`);
          }
        });
      }
    });
  }
