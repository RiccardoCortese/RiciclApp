# Documentazione Tecnica

## Modulo OFM_API — Configurazione OpenFreeMap
### Descrizione
Il modulo **OFM_API** espone un unico endpoint di configurazione che fornisce al frontend di **RiciclApp** tutti i parametri necessari per inizializzare la mappa interattiva tramite [OpenFreeMap](https://openfreemap.org).

**OpenFreeMap** è un servizio di tile vettoriali gratuito e senza chiave API, basato su dati OpenStreetMap. Il frontend utilizza questi dati per inizializzare la libreria di rendering della mappa (MapLibre GL) senza dover gestire configurazioni lato client.

### Perché un Endpoint Backend?
Centralizzare la configurazione della mappa nel backend permette di modificare lo stile, le coordinate di default o il livello di zoom per tutti i client semplicemente aggiornando il server, senza rilasciare una nuova versione dell'app.

### Autenticazione
Endpoint **pubblico** — non richiede token JWT.

---

## Endpoint

### GET /ofm/config — Recupera la configurazione della mappa
Restituisce i parametri di configurazione per l'inizializzazione della mappa interattiva.

**Risposta di successo (`200`)**:
```json
{
  "styleUrl": "https://tiles.openfreemap.org/styles/liberty",
  "center": {
    "lat": 46.0667,
    "lon": 11.1333
  },
  "zoom": 14
}
```

**Descrizione dei campi**:
*   **`styleUrl`**: URL dello stile vettoriale da passare a MapLibre GL (`mapStyle` prop). Utilizza il tema `liberty` di OpenFreeMap.
*   **`center`**: Coordinate geografiche del centro di visualizzazione iniziale della mappa. Il valore di default è impostato su **Trento, Italia**.
*   **`zoom`**: Livello di zoom iniziale della mappa (14 = scala urbana, dettaglio di singole strade).

---

## Note Implementative
*   **Nessuna chiave API**: OpenFreeMap non richiede registrazione né chiave API, a differenza di servizi come Mapbox o Google Maps. Questo semplifica la gestione delle credenziali in produzione.
*   **Stile `liberty`**: È lo stile predefinito di OpenFreeMap, che include strade, edifici, parchi e punti di interesse con etichette in lingua locale.
*   **Configurazione hardcoded**: Le coordinate di Trento e il livello di zoom sono definiti direttamente nel file `OFM_API.js`. Per adattare la mappa a un'altra città è sufficiente modificare quei valori nel backend.
