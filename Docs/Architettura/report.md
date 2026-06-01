# Documentazione Tecnica

## Modulo Report - Architettura e Flusso

### Descrizione

Il modulo report gestisce la creazione delle segnalazioni relative ai bidoni intelligenti presenti nell'ecosistema **RiciclApp**. Le segnalazioni consentono agli utenti di notificare problemi quali guasti, danneggiamenti o anomalie riscontrate durante l'utilizzo dei bidoni.

Quando viene creato un report, il sistema aggiorna automaticamente lo stato del bidone associato impostandolo a `SEGNALATO`, permettendo all'amministratore di identificare rapidamente le criticità presenti sul territorio.

### Autenticazione

Le API del modulo report sono progettate per essere utilizzate da utenti autenticati. L'identificativo dell'utente (`userId`) viene associato alla segnalazione per consentire la tracciabilità delle operazioni.

---

# Endpoint

## POST /reports/create — Crea una nuova segnalazione

Crea una nuova segnalazione associata a un bidone esistente.

### Parametri Request Body

```json
{
  "userId": "683a7e4f9b12c8a12345678",
  "binId": "683a7e4f9b12c8a87654321",
  "description": "Il bidone presenta il coperchio danneggiato."
}
```

| Campo       | Tipo              | Obbligatorio | Descrizione                                         |
| ----------- | ----------------- | ------------ | --------------------------------------------------- |
| userId      | String (ObjectId) | Sì           | Identificativo dell'utente che crea la segnalazione |
| binId       | String (ObjectId) | Sì           | Identificativo del bidone segnalato                 |
| description | String            | Sì           | Descrizione dettagliata del problema                |

---

### Flusso

1. Il sistema riceve la richiesta di creazione del report.
2. Verifica l'esistenza del bidone tramite `Bin.findById(binId)`.
3. Verifica che il campo `description` sia valorizzato.
4. Crea una nuova istanza del modello `Report`.
5. Imposta automaticamente lo stato iniziale del report a `PENDING`.
6. Salva il report nel database MongoDB.
7. Aggiorna il bidone associato impostando il suo stato a `SEGNALATO`.
8. Restituisce il report appena creato.

---

### Risposta di successo (`201`)

```json
{
  "message": "Report creato con successo",
  "report": {
    "_id": "683a7e4f9b12c8a99999999",
    "userId": "683a7e4f9b12c8a12345678",
    "binId": "683a7e4f9b12c8a87654321",
    "description": "Il bidone presenta il coperchio danneggiato.",
    "status": "PENDING",
    "createdAt": "2026-06-01T10:15:00.000Z",
    "updatedAt": "2026-06-01T10:15:00.000Z"
  }
}
```

---

# Gestione degli Errori

| Codice | Causa                                                     |
| ------ | --------------------------------------------------------- |
| `400`  | Descrizione mancante o vuota                              |
| `404`  | Bidone non trovato                                        |
| `500`  | Errore interno del server durante la creazione del report |

### Esempio errore 400

```json
{
  "message": "La descrizione è obbligatoria"
}
```

### Esempio errore 404

```json
{
  "message": "Bidone non trovato"
}
```

### Esempio errore 500

```json
{
  "message": "Errore interno del server durante la creazione del report"
}
```

---

# Modelli di Dato

## Report

Salvato nella collection MongoDB `reports`.

| Campo       | Tipo     | Obbligatorio | Descrizione                                          |
| ----------- | -------- | ------------ | ---------------------------------------------------- |
| userId      | ObjectId | Sì           | Riferimento all'utente che ha creato la segnalazione |
| binId       | ObjectId | Sì           | Riferimento al bidone segnalato                      |
| description | String   | Sì           | Descrizione del problema riscontrato                 |
| status      | String   | Automatico   | Stato della segnalazione                             |
| createdAt   | Date     | Automatico   | Timestamp di creazione                               |
| updatedAt   | Date     | Automatico   | Timestamp ultimo aggiornamento                       |

### Valori ammessi per status

| Valore        | Descrizione                                               |
| ------------- | --------------------------------------------------------- |
| `PENDING`     | Segnalazione appena creata e in attesa di presa in carico |
| `IN_PROGRESS` | Segnalazione attualmente in lavorazione                   |
| `RESOLVED`    | Problema risolto e segnalazione chiusa                    |

---

# Relazioni

Il modello Report mantiene relazioni con:

### User

```javascript
userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
}
```

Identifica l'utente che ha effettuato la segnalazione.

### Bin

```javascript
binId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bin'
}
```

Identifica il bidone interessato dalla segnalazione.

---

# Note Implementative

* Lo stato iniziale di ogni report viene impostato automaticamente a `PENDING`.
* In seguito alla creazione del report, il bidone associato viene aggiornato con stato `SEGNALATO`.
* Il modello utilizza l'opzione `timestamps: true`, che genera automaticamente i campi `createdAt` e `updatedAt`.
* I riferimenti `userId` e `binId` utilizzano relazioni MongoDB tramite ObjectId.
* La validazione della descrizione viene effettuata sia a livello applicativo sia tramite il vincolo `required` definito nello schema Mongoose.
