# Documentazione Tecnica

## Modulo di Registrazione - Architettura e Flusso
### Descrizione
Il modulo di registrazione permette la creazione di un nuovo profilo utente nel sistema **RiciclApp**.

### Requisiti di Input
Per completare la registrazione, il sistema richiede:
*   **Username**: Nome univoco visualizzato nell'app.
*   **Email**: Indirizzo di posta elettronica (utilizzato come identificativo principale).
*   **Password**: Stringa alfanumerica per la sicurezza dell'accesso.

### Architettura del Flusso
Il processo segue il seguente flusso:

1.  **Frontend (React Native)**:
    *   Cattura i dati tramite componenti `TextInput`.
    *   Invia una richiesta asincrona tramite **Axios**.
    *   Gestisce l'indirizzo del server tramite una variabile globale `API_URL` configurata con l'IP locale della macchina di sviluppo per permettere la comunicazione con i dispositivi fisici.

2.  **Backend (Node.js/Express)**:
    *   Riceve i dati ed effettua una validazione di base.
    *   **Sicurezza**: Applica l'hashing della password prima della persistenza (non salviamo mai password in chiaro).
    *   **Database**: Crea un nuovo record nella collection `users` di MongoDB.

## Gestione delle Problematiche di Rete
Durante lo sviluppo su dispositivi fisici Android/iOS, abbiamo implementato le seguenti soluzioni per garantire la connettività:
*   **Configurazione IP**: Utilizzo dell'IP privato del PC (es. 192.168.x.x) al posto di *localhost*.
*   **CORS**: Abilitazione del Cross-Origin Resource Sharing nel backend, in modo da permettere le richieste provenienti da domini diversi.
*   **Cleartext Traffic**: Configurazione del file `app.json` di Expo per permettere il traffico HTTP durante i test locali.

