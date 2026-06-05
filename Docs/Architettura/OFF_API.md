# Documentazione Tecnica

## Modulo OFF_API — Proxy Open Food Facts
### Descrizione
Il modulo **OFF_API** è un proxy backend che si interpone tra il frontend di **RiciclApp** e le API pubbliche di [Open Food Facts](https://world.openfoodfacts.org). Il suo scopo principale è aggirare le restrizioni CORS che impedirebbero al frontend mobile/web di interrogare direttamente il servizio esterno.

### Perché un Proxy?
Le app React Native su dispositivo fisico non possono effettuare richieste cross-origin verso servizi esterni senza una configurazione CORS permissiva dal lato del server di destinazione. Il proxy backend risolve il problema: il frontend chiama sempre il proprio backend (`localhost:5000`), che si occupa di inoltrare la richiesta a Open Food Facts aggiungendo l'header `User-Agent` richiesto dalla policy del servizio.

### Autenticazione
Endpoint **pubblico** — non richiede token JWT.

---

## Endpoint

### GET /off/product/:barcode — Recupera dati prodotto tramite barcode
Invia una richiesta a `https://world.openfoodfacts.org/api/v0/product/{barcode}.json` e restituisce la risposta al frontend tal quale.

**Parametri**:
*   **`barcode`** *(path, obbligatorio)*: Codice a barre del prodotto (EAN-13, EAN-8, UPC, ecc.).

**Flusso**:
1. Valida la presenza del parametro `barcode`.
2. Costruisce l'URL verso l'API pubblica di Open Food Facts con il barcode URL-encoded.
3. Esegue la richiesta con `fetch`, includendo l'header `User-Agent: RiciclApp/1.0`.
4. Se OFF risponde con `status: 0`, restituisce `404` al frontend.
5. In caso di successo, restituisce l'intero payload JSON di Open Food Facts.

**Risposta di successo (`200`)** — esempio parziale del payload OFF:
```json
{
  "status": 1,
  "product": {
    "product_name": "Nutella",
    "brands": "Ferrero",
    "packaging": "glass, plastic",
    "packaging_tags": ["en:glass", "en:plastic"],
    "ecoscore_grade": "d",
    "image_front_small_url": "https://..."
  }
}
```

---

## Gestione degli Errori
| Codice | Causa |
|--------|-------|
| `400`  | Parametro `barcode` assente nella richiesta |
| `404`  | Prodotto non trovato nel database Open Food Facts (`status: 0`) |
| `500`  | Errore di rete o risposta HTTP non valida da Open Food Facts |

---

## Note Implementative
*   **User-Agent obbligatorio**: Open Food Facts richiede un header `User-Agent` identificativo per le richieste automatizzate. L'assenza di questo header può causare il blocco delle richieste da parte del servizio esterno.
*   **Nessuna trasformazione**: Questo proxy non trasforma né filtra i dati. Il payload completo di Open Food Facts viene restituito intatto. La logica di interpretazione del packaging è delegata al modulo **ZX_API**.
*   **Utilizzo previsto**: Questo endpoint è pensato per ricerche manuali di prodotti. Per la scansione barcode integrata con le categorie di smaltimento, usare `GET /api/zx/scan/:barcode`.
