# Documentazione Tecnica

## Modulo OSM_API — Proxy OpenStreetMap (Nominatim)
### Descrizione
Il modulo **OSM_API** è un proxy backend verso il servizio **Nominatim** di [OpenStreetMap](https://nominatim.openstreetmap.org), il geocoder open-source che converte indirizzi in coordinate e viceversa. Viene utilizzato dalla funzionalità di ricerca indirizzi sulla mappa interattiva di **RiciclApp**.

### Funzionalità Fornite
*   **Geocoding diretto** (`/search`): da testo libero (es. "Via Roma 10, Trento") a coordinate geografiche.
*   **Geocoding inverso** (`/reverse`): da coordinate `(lat, lon)` a indirizzo leggibile.

### Perché un Proxy?
Nominatim richiede un header `User-Agent` identificativo per tutte le richieste. Centralizzare le chiamate nel backend garantisce che questo requisito sia sempre rispettato, evitando che il client venga bloccato dal servizio. Risolve inoltre le restrizioni CORS sul frontend.

### Autenticazione
Endpoint **pubblici** — non richiedono token JWT.

---

## Endpoint

### GET /osm/search — Ricerca per testo (Geocoding diretto)
Cerca luoghi, indirizzi o punti di interesse tramite una stringa di testo libero, delegando la ricerca all'API Nominatim.

**Query Parameters**:
*   **`q`** *(obbligatorio)*: Stringa di ricerca (es. `"Piazza Dante, Trento"`).
*   **`limit`** *(opzionale, default: `5`)*: Numero massimo di risultati da restituire.

**Risposta di successo (`200`)** — array di risultati Nominatim:
```json
[
  {
    "place_id": 123456,
    "display_name": "Piazza Dante, Trento, Provincia di Trento, Trentino-Alto Adige, Italia",
    "lat": "46.0679",
    "lon": "11.1211",
    "type": "square",
    "address": {
      "road": "Piazza Dante",
      "city": "Trento",
      "country": "Italia"
    }
  }
]
```

---

### GET /osm/reverse — Geocoding inverso
Converte una coppia di coordinate geografiche in un indirizzo leggibile.

**Query Parameters**:
*   **`lat`** *(obbligatorio)*: Latitudine in gradi decimali.
*   **`lon`** *(obbligatorio)*: Longitudine in gradi decimali.

**Risposta di successo (`200`)**:
```json
{
  "display_name": "Via Roma, 10, Trento, Provincia di Trento, Italia",
  "address": {
    "road": "Via Roma",
    "house_number": "10",
    "city": "Trento",
    "country": "Italia",
    "postcode": "38122"
  }
}
```

---

## Gestione degli Errori
| Codice | Causa |
|--------|-------|
| `400`  | Parametro `q` assente in `/search`, oppure `lat` o `lon` assenti in `/reverse` |
| `500`  | Errore di rete o risposta HTTP non valida da Nominatim |

---

## Note Implementative
*   **Policy di utilizzo Nominatim**: Il servizio pubblico di Nominatim è gratuito ma soggetto a limiti di utilizzo (max 1 richiesta/secondo). Per ambienti di produzione ad alto traffico è consigliato ospitare una propria istanza Nominatim.
*   **`addressdetails=1`**: La rotta `/search` include sempre il parametro `addressdetails=1` nell'URL verso Nominatim, in modo da ottenere l'oggetto `address` strutturato nei risultati.
*   **Encoding**: Il parametro `q` viene sempre URL-encoded tramite `encodeURIComponent` prima di essere inserito nell'URL Nominatim, per gestire correttamente caratteri speciali e spazi.
