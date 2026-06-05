# RiciclApp

Il presente progetto descrive l'ideazione e la progettazione di un sistema per l'ottimizzazione della raccolta differenziata urbana.
L'obiettivo principale dell'applicazione è duplice: da un lato, semplificare il conferimento dei rifiuti per il cittadino attraverso strumenti di riconoscimento (scansione barcode) e localizzazione dei punti di raccolta con relativo stato di riempimento; dall'altro, fornire agli enti comunali e alle aziende di raccolta una visione d'insieme in tempo reale dello stato del territorio.
Grazie ai dati trasmessi dai sensori IoT installati nei bidoni, l'amministratore può monitorare i livelli di riempimento, identificare le zone critiche e pianificare interventi di svuotamento mirati. Questo approccio permette di passare da una raccolta a calendario a una gestione dinamica "on-demand", riducendo i costi operativi e l'impatto ambientale dei mezzi di trasporto.
Il sistema si avvale di una rete di sensori IoT installati nei bidoni stradali per il monitoraggio in tempo reale dei livelli di riempimento, permettendo agli operatori ecologici di usufruire di percorsi di raccolta ottimizzati.

## Architettura del sistema

```
Backend (Node.js / Express)  ──► App mobile (React Native / Expo)
      │
MongoDB Atlas
```

- Il **backend** espone le API REST, gestisce l'autenticazione e persiste i dati su **MongoDB Atlas**.
- Il **frontend** mobile consente ai cittadini di scansionare barcode, visualizzare la mappa dei punti di raccolta e il loro stato, e ricevere indicazioni sul corretto smaltimento.
- Gli **amministratori** accedono a una vista d'insieme in tempo reale per pianificare le raccolte.

## Strumenti utilizzati

Oltre agli strumenti base discussi e analizzati durante il corso:

- **Node.js** — runtime per il backend
- **MongoDB Atlas** — database cloud

Il gruppo ha fatto uso di strumenti aggiuntivi tra cui:

- **React Native** — framework per il front-end mobile
- **Expo (SDK 54)** — toolchain per sviluppo e testing in ambiente web e nativo su Android
- **JWT + bcryptjs** — autenticazione e hashing delle password
- **Nodemailer** — invio email di verifica e notifica

## Prerequisiti

- **Node.js** v18 o superiore
- **npm** v9 o superiore
- Un cluster **MongoDB Atlas** (o istanza locale di MongoDB)
- Un broker **MQTT** raggiungibile dal backend
- **Expo Go** sul dispositivo mobile (per testare su Android), oppure un browser per la versione web

## Variabili d'ambiente

Prima di avviare il backend, creare il file `Backend/.env` a partire dall'esempio seguente:

```env
PORT=3000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
DB_NAME=riciclapp
JWT_SECRET=una_stringa_segreta_lunga_e_casuale
EMAIL=tuamail@gmail.com
PASSWORD_EMAIL=tua_app_password_gmail
```

> **Nota:** `PASSWORD_EMAIL` deve essere una *App Password* di Google, non la password dell'account. Abilitare la verifica in due passaggi sull'account Gmail e generare una App Password dalle impostazioni di sicurezza.

## Note per testare l'applicazione

### Backend

```bash
cd Backend
npm install
node server.js
```


### Frontend

```bash
cd Frontend
npm install
npx expo start
```

Una volta avviato Expo, scegliere la piattaforma:

- Premere **`w`** per aprire la versione **web** nel browser
- Scansionare il **QR code** con l'app **Expo Go** per testare su **Android**

### Simulazione sensori IoT (opzionale)

Il progetto include un modulo opzionale di simulazione IoT che permette di simulare sensori installati sui bidoni intelligenti.

Per utilizzare la simulazione è necessario avviare separatamente:

#### Listener MQTT

Aprire un nuovo terminale:

```bash
cd Backend
npm run listener
```

Il listener riceve i dati MQTT provenienti dai sensori simulati e aggiorna automaticamente MongoDB.

#### Simulatore sensori

Aprire un secondo terminale:

```bash
cd Backend
npm run simulator
```

Il simulatore genera periodicamente livelli di riempimento casuali per i bidoni e invia tali informazioni tramite MQTT.

#### Flusso simulazione

```text
Simulatore sensori
        ↓
       MQTT
        ↓
     Listener
        ↓
     MongoDB
        ↓
 Backend / Frontend
```

> Nota: backend, listener e simulatore devono essere eseguiti separatamente.


### Limitazioni note
- La versione web non supporta la scansione barcode via fotocamera (funzionalità disponibile solo su Android nativo).
