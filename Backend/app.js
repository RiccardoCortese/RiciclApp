// app.js
// Costruisce e configura l'applicazione Express SENZA avviare il server
// (nessun app.listen) e SENZA connettersi al database.
//
// Questo permette di importare `app` nei test con supertest, che esegue le
// rotte in memoria senza aprire una porta di rete. In produzione è invece
// server.js a richiedere questo file, connettersi a MongoDB e mettersi in
// ascolto sulla porta.

const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());            // Abilita le richieste cross-origin dal frontend
app.use(express.json());    // Parsing automatico del corpo JSON delle richieste

// ---- ROTTE ----
app.use('/api/auth', require('./routes/auth'));        // Registrazione, login, verifica email
app.use('/api/osm', require('./routes/OSM_API'));      // Proxy OpenStreetMap (Nominatim)
app.use('/api/off', require('./routes/OFF_API'));      // Proxy Open Food Facts
app.use('/api/ofm', require('./routes/OFM_API'));      // Configurazione mappa (OpenFreeMap)
app.use('/api/user', require('./routes/user'));        // Profilo utente (protetto da JWT)
app.use('/api/zx', require('./routes/ZX_API'));        // Scansione barcode + punti scansione
app.use('/api/centers', require('./routes/center'));   // Centri di raccolta e bidoni
app.use('/api/admin', require('./routes/admin'));      // Funzioni admin (bidoni, centri, utenti)
app.use('/api/report', require('./routes/report'));    // Segnalazioni guasti bidoni
app.use('/api/events', require('./routes/event'));     // Eventi di raccolta
app.use('/api/rewards', require('./routes/reward'));   // Lista premi e partner commerciali
app.use('/api/operator', require('./routes/operator')); // Percorso ottimizzato operatore

module.exports = app;
