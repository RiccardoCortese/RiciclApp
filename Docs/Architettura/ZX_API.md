# Documentazione Tecnica

## Modulo ZX_API — Scansione Barcode e Categorizzazione Rifiuti
### Descrizione
Il modulo **ZX_API** è il cuore della funzionalità di scansione prodotti di **RiciclApp**. Riceve un codice a barre scansionato tramite la fotocamera del dispositivo (usando **ZXing** via `expo-camera`), recupera i dati del prodotto da Open Food Facts, e restituisce al frontend un payload arricchito con le **categorie di smaltimento** pre-calcolate, pronte per essere mostrate all'utente.

### Flusso Completo
```
Dispositivo (fotocamera)
    │ scansiona barcode
    ▼
Frontend (expo-camera / ZXing)
    │ GET /api/zx/scan/:barcode
    ▼
Backend ZX_API
    │ fetch con timeout 8s
    ▼
Open Food Facts API
    │ dati prodotto (packaging, packaging_tags)
    ▼
Backend ZX_API — resolveDisposal()
    │ mappa keyword packaging → categoria smaltimento
    ▼
Frontend
    └─ mostra nome prodotto + bidoni corretti
```

### Autenticazione
Endpoint **pubblico** — non richiede token JWT.

---

## Endpoint

### GET /zx/scan/:barcode — Scansiona barcode e ottieni istruzioni di smaltimento
Recupera i dati del prodotto da Open Food Facts e calcola le categorie di smaltimento in base ai materiali di imballaggio dichiarati.

**Parametri**:
*   **`barcode`** *(path, obbligatorio)*: Codice a barre del prodotto (EAN-13, EAN-8, UPC, ecc.).

**Timeout**: La chiamata verso Open Food Facts ha un **timeout fisso di 8 secondi**. Superato questo limite, il backend restituisce `504` evitando che il frontend rimanga bloccato su un caricamento infinito.

**Risposta di successo (`200`)**:
```json
{
  "status": 1,
  "barcode": "3017620422003",
  "product": {
    "product_name": "Nutella",
    "brands": "Ferrero",
    "quantity": "400 g",
    "categories": "Spreads, Sweet spreads",
    "countries": "Italy",
    "packaging": "glass, plastic",
    "packaging_tags": ["en:glass", "en:plastic"],
    "ecoscore_grade": "d",
    "image_front_small_url": "https://..."
  },
  "disposal": [
    {
      "label": "Vetro",
      "bin": "Campana Verde (Vetro)",
      "color": "#2E7D32",
      "icon": "🫙"
    },
    {
      "label": "Plastica",
      "bin": "Bidone Giallo (Plastica/Metallo)",
      "color": "#F9A825",
      "icon": "♻️"
    }
  ]
}
```

---

## Logica di Smaltimento — `resolveDisposal()`
La funzione `resolveDisposal` analizza i campi `packaging` e `packaging_tags` del prodotto e cerca corrispondenze con una mappa di keyword predefinita. Restituisce sempre almeno un elemento (il fallback `Indifferenziato` se nessuna keyword corrisponde).

### Tabella di Mappatura

| Keyword rilevata | Categoria | Bidone | Colore |
|---|---|---|---|
| `plastic`, `polystyrene`, `tetra` | Plastica / Polistirolo / Tetrapak | Bidone Giallo (Plastica/Metallo) | `#F9A825` |
| `metal`, `aluminium`, `steel` | Metallo / Alluminio / Acciaio | Bidone Giallo (Plastica/Metallo) | `#F9A825` |
| `glass` | Vetro | Campana Verde (Vetro) | `#2E7D32` |
| `cardboard`, `paper` | Carta / Cartone | Bidone Blu (Carta/Cartone) | `#1565C0` |
| `wood` | Legno | Centro di Raccolta | `#6D4C41` |
| *(nessuna corrispondenza)* | Indifferenziato | Bidone Nero (Rifiuto Generico) | `#757575` |

*I duplicati vengono rimossi: se un prodotto ha sia `plastic` che `polystyrene`, il Bidone Giallo appare una sola volta nel risultato.*

---

## Gestione degli Errori
| Codice | Causa |
|--------|-------|
| `400`  | Parametro `barcode` assente |
| `404`  | Prodotto non trovato nel database Open Food Facts (`status: 0`) |
| `504`  | Timeout: Open Food Facts non ha risposto entro 8 secondi |
| `500`  | Errore generico durante il recupero dei dati |

---

## Note Implementative
*   **AbortController**: Il timeout di 8 secondi è implementato tramite l'API nativa `AbortController` + `AbortSignal`, che interrompe la richiesta `fetch` lato Node.js senza lasciare connessioni pendenti.
*   **Differenza con OFF_API**: Il modulo `OFF_API` restituisce il payload grezzo di Open Food Facts. Il modulo `ZX_API` lo processa e aggiunge il campo `disposal` pre-calcolato, ottimizzando il lavoro necessario lato client.
*   **Campi null**: I campi del prodotto assenti in Open Food Facts vengono restituiti esplicitamente come `null` invece di essere omessi, per semplificare la gestione nel frontend.
