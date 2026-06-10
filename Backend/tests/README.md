# Test del Backend — RiciclApp

Test **black-box** delle API REST con **Jest** + **Supertest**, eseguiti contro
un'istanza **MongoDB in memoria** (`mongodb-memory-server`). Nessun test tocca
il database di produzione (MongoDB Atlas) né invia email reali.

## Come eseguire i test

```bash
cd Backend
npm test              # esegue tutti i test una volta
npm run test:watch    # ri-esegue i test ad ogni modifica
npm run test:coverage # esegue i test con report di copertura
```

## Come è organizzato

- `app.js` (nella root del Backend) costruisce l'app Express **senza** avviare il
  server né connettersi al DB → può essere importato da Supertest.
- `server.js` resta il punto d'ingresso di **produzione** (connette il DB + listen).
- `tests/setup.js` avvia il Mongo in memoria, collega Mongoose, svuota le
  collezioni dopo ogni test e mocka l'invio email.
- `tests/helpers.js` contiene le factory per creare utenti/centri/bidoni/report e
  i token JWT usati come precondizioni dei test.

## Mappa di copertura dei Test Case (`Test_cases.xlsx`)

| User Story (TC)                         | File di test          | Stato |
|-----------------------------------------|-----------------------|-------|
| Registrazione (1-7)                     | `auth.test.js`        | ✅ Coperto |
| Email Verification (8, 10)              | `auth.test.js`        | ✅ Coperto |
| Email Verification (9)                  | —                     | ⛔ Frontend (validazione lunghezza codice) |
| Eliminazione Account (11)               | `user.test.js`        | ✅ Coperto |
| Mappa Real-time (12-13)                 | `centers.test.js`     | ✅ Coperto |
| Login JWT (14-17)                       | `auth.test.js`        | ✅ Coperto |
| Visualizzazione Profilo (18-19)         | `user.test.js`        | ✅ Coperto |
| Modifica Username (20, 22)              | `user.test.js`        | ✅ Coperto |
| Modifica Username (21)                  | `user.test.js`        | ⚠️ Documentato: unicità nome non imposta lato server (frontend) |
| Cambio Password Sicuro (23-26)          | `user.test.js`        | ✅ Coperto |
| Inserimeno Codice Enumerativo (27-29)   | `zx.test.js`          | ✅ Coperto (fetch mockato) |
| Scannerizzazione Codice a Barre (30-33) | —                     | ⛔ Frontend/Native (UI fotocamera). L'endpoint di scan è coperto da 27-29 |
| Password Recovery (34, 35, 37, 38)      | `user.test.js`        | ✅ Coperto |
| Password Recovery (36)                  | —                     | ⛔ Frontend (confronto due campi password) |
| Cambio Immagine Profilo (39-40)         | —                     | ⛔ Frontend (nessuna rotta backend dedicata) |
| Dashboard Admin (Admin 1)               | `auth.test.js`        | ✅ Coperto (login admin) |
| Visualizzazione Statistiche zona (2)    | —                     | ⛔ Frontend (statistiche calcolate lato client) |
| Aggiunta Bidone Admin (3-7)             | `admin.test.js`       | ✅ Coperto |
| Mappatura Categorie-Bidoni (8)          | `admin.test.js`       | ✅ Coperto (cambio stato bidone) |
| Gestione Eventi Raccolta (9-10)         | `events.test.js`      | ✅ Coperto |
| Simulatori MQTT Sensori IoT (11-14)     | —                     | ⛔ Fuori scope Supertest (MQTT, non HTTP — serve harness dedicato) |
| Feature punti per scansione (15-16)     | `zx.test.js`          | ✅ Coperto |
| Feature punti per segnalazione (17-18)  | `report.test.js`      | ✅ Coperto |
| Lista Premi (19)                        | `rewards.test.js`     | ✅ Coperto |
| Livello Riempimento Operatore (20)      | `centers.test.js`     | ✅ Coperto (lettura livello) |
| Livello Riempimento Operatore (21)      | —                     | ⛔ Aggiornamento via MQTT (fuori scope) |
| Timer Punti Scansione (22)              | `zx.test.js` (parz.)  | ⚠️ Countdown è UI frontend; il backend fornisce `remainingSeconds` (coperto) |
| Multi utenza (23-25)                    | `auth.test.js`        | ✅ Coperto |
| Segnalazione Danni (26-27)              | `report.test.js`      | ✅ Coperto |
| Percorso ottimale (28)                  | `operator.test.js`    | ✅ Coperto |
| Approvazione Segnalazioni (29-30)       | `report.test.js`      | ✅ Coperto |
| Assegnazione Segnalazioni (31)          | `report.test.js`      | ✅ Coperto |

Legenda: ✅ test black-box dell'API · ⚠️ coperto con nota/limitazione ·
⛔ non testabile via Supertest (è logica Frontend/Native o trasporto MQTT).
