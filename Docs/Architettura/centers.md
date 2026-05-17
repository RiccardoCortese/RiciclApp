# Documentazione Tecnica

## Modulo Centri di Raccolta - Architettura e Flusso
### Descrizione
Il modulo centri di raccolta espone le API pubbliche di **RiciclApp** per la consultazione dei centri di raccolta differenziata e dei relativi bidoni intelligenti. Questi endpoint sono utilizzati principalmente dalla mappa interattiva dell'applicazione.

### Autenticazione
Le rotte di questo modulo sono **pubbliche**: non richiedono token JWT e sono accessibili da qualsiasi client.

---

## Endpoint

### GET /centers/all — Recupera tutti i centri di raccolta
Restituisce la lista completa dei centri di raccolta presenti nel database MongoDB (collection `collection_centers`).

**Risposta di successo (`200`)**:
```json
[
  {
    "_id": "665b8f5d2f9f6c0012345678",
    "name": "Centro Raccolta Milano Nord",
    "address": "Via Roma 10",
    "area": "Milano Nord",
    "openingHours": "Lun-Ven 8:00-18:00, Sab 9:00-13:00, Dom chiuso",
    "coordinates": {
      "lat": 45.4642,
      "lng": 9.1900
    },
    "createdAt": "2026-05-16T09:00:00.000Z"
  }
]
```

---

### GET /centers/:id — Recupera un centro con i suoi bidoni
Restituisce i dettagli di un singolo centro di raccolta, arricchiti con l'array dei bidoni (`bins`) ad esso associati.

**Parametri**:
*   **`id`** *(path, obbligatorio)*: ID MongoDB del centro di raccolta.

**Flusso**:
1. Cerca il centro su MongoDB tramite `Center.findById(id)`.
2. Recupera i bidoni associati tramite `Bin.find({ centerId: id })`, con una query che accetta sia ObjectId che stringa per robustezza.
3. Aggiunge l'array `bins` al documento centro e restituisce l'oggetto arricchito.

**Risposta di successo (`200`)**:
```json
{
  "_id": "665b8f5d2f9f6c0012345678",
  "name": "Centro Raccolta Milano Nord",
  "address": "Via Roma 10",
  "area": "Milano Nord",
  "openingHours": "Lun-Ven 8:00-18:00, Sab 9:00-13:00, Dom chiuso",
  "coordinates": { "lat": 45.4642, "lng": 9.1900 },
  "createdAt": "2026-05-16T09:00:00.000Z",
  "bins": [
    {
      "_id": "665b90ad2f9f6c0012349999",
      "binCode": "BIN001",
      "wasteType": "plastica",
      "fillLevel": 75,
      "status": "OK",
      "centerId": "665b8f5d2f9f6c0012345678",
      "sensor": {
        "sensorCode": "SENS123",
        "batteryLevel": 87,
        "lastUpdate": "2026-05-16T10:30:00.000Z"
      }
    }
  ]
}
```

---

## Gestione degli Errori
| Codice | Causa |
|--------|-------|
| `400`  | L'ID fornito non è un ObjectId MongoDB valido |
| `404`  | Nessun centro trovato con l'ID specificato |
| `500`  | Errore interno del server durante il recupero dei dati |

---

## Modelli di Dato

### Centro di Raccolta (`CollectionCenter`)
Salvato nella collection MongoDB `collection_centers`.

| Campo          | Tipo     | Obbligatorio | Descrizione                        |
|----------------|----------|--------------|------------------------------------|
| `name`         | String   | Sì           | Nome del centro                    |
| `address`      | String   | Sì           | Indirizzo fisico                   |
| `area`         | String   | Sì           | Area geografica di competenza      |
| `openingHours` | String   | No           | Orari di apertura (testo libero)   |
| `coordinates`  | Object   | Sì           | `{ lat: Number, lng: Number }`     |
| `createdAt`    | Date     | Automatico   | Timestamp di creazione             |

### Bidone (`Bin`)
Ogni bidone è collegato a un centro tramite `centerId`.

| Campo        | Tipo   | Valori ammessi                                                        |
|--------------|--------|-----------------------------------------------------------------------|
| `wasteType`  | String | `carta`, `plastica`, `vetro`, `umido`, `indifferenziato`, `olio esausto` |
| `fillLevel`  | Number | 0–100 (percentuale di riempimento)                                    |
| `status`     | String | `OK`, `MANUTENZIONE`, `PIENO`                                         |

---

## Note Implementative
*   **Accesso pubblico**: Questi endpoint non richiedono autenticazione perché i dati dei centri sono informazioni pubbliche consultabili da qualsiasi utente dell'app, inclusi gli utenti non registrati.
*   **Doppia query `centerId`**: La ricerca dei bidoni usa `$or: [{ centerId: id }, { centerId: id.toString() }]` per gestire eventuali inconsistenze di tipo (ObjectId vs stringa) nel database.
*   **Risposta arricchita**: Il metodo `.lean()` viene usato su `findById` per ottenere un oggetto JavaScript plain modificabile, al quale viene poi aggiunto il campo `bins` dinamicamente prima della risposta.
