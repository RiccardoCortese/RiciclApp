# Documentazione Tecnica

## Modulo Utente - Architettura e Flusso
### Descrizione
Il modulo utente gestisce tutte le operazioni sul profilo dell'utente autenticato in **RiciclApp**: visualizzazione dei dati, modifica del nome, cambio e reset della password, ed eliminazione dell'account.

### Autenticazione Richiesta
Tutte le rotte di questo modulo sono **protette**: ogni richiesta deve includere un **token JWT** nell'header `Authorization` nel formato:
```
Authorization: Bearer <token>
```
Il token viene verificato dal middleware `authMiddleware` prima di eseguire qualsiasi operazione.

---

## Endpoint

### GET /user/profile — Recupera il profilo utente
Restituisce i dati del profilo dell'utente autenticato (esclusa la password).

**Risposta di successo (`200`)**:
```json
{
  "user": {
    "id": "665ba1cd2f9f6c001234abcd",
    "name": "Mario Rossi",
    "email": "mario.rossi@gmail.com",
    "role": "registered_user",
    "points": 120
  }
}
```

---

### PATCH /user/profile/name — Aggiorna il nome utente
Modifica il nome visualizzato dell'utente autenticato.

**Body richiesta**:
```json
{ "username": "Nuovo Nome" }
```
*Il nome deve contenere almeno 2 caratteri.*

**Risposta di successo (`200`)**: restituisce l'oggetto `user` aggiornato.

---

### PATCH /user/profile/password — Cambia la password
Permette all'utente di modificare la propria password fornendo quella attuale e quella nuova.

**Body richiesta**:
```json
{
  "oldPassword": "vecchiaPassword123",
  "newPassword": "nuovaPassword456"
}
```
*La nuova password deve essere di almeno 6 caratteri.*

**Flusso**:
1. Verifica che la `oldPassword` corrisponda all'hash salvato su MongoDB (tramite `bcrypt.compare`).
2. Genera un nuovo hash per `newPassword` con `bcrypt`.
3. Aggiorna il campo `passwordHash` nel documento utente.

---

### POST /user/profile/request-password-reset — Richiedi codice di reset
Genera un codice numerico a 6 cifre, lo invia via email all'utente autenticato e salva l'hash del codice nel database.

*Non richiede body.*

**Flusso**:
1. Genera un codice casuale a 6 cifre.
2. Salva l'hash del codice nel campo `passwordResetToken` dell'utente.
3. Invia il codice via email tramite il servizio `sendPasswordResetEmail`.

**Risposta di successo (`200`)**:
```json
{ "message": "Codice di reset inviato via email" }
```

---

### POST /user/profile/reset-password — Reimposta la password con il codice
Verifica il codice ricevuto via email e aggiorna la password.

**Body richiesta**:
```json
{
  "code": "123456",
  "newPassword": "nuovaPassword456"
}
```

**Flusso**:
1. Verifica che esista un `passwordResetToken` nel documento utente.
2. Confronta il codice fornito con l'hash salvato tramite `bcrypt.compare`.
3. Aggiorna `passwordHash` e azzera `passwordResetToken` a `null`.

---

### DELETE /user/delete — Elimina l'account
Elimina definitivamente l'account dell'utente autenticato e invia una email di conferma dell'avvenuta eliminazione.

**Risposta di successo (`200`)**:
```json
{ "message": "Account eliminato con successo" }
```

---

## Gestione degli Errori Comuni
| Codice | Causa |
|--------|-------|
| `400`  | Dati mancanti o non validi nel body (es. password troppo corta, nome troppo breve, codice errato) |
| `401`  | Token JWT assente, scaduto o non valido |
| `404`  | Utente non trovato nel database |
| `500`  | Errore interno del server o errore nell'invio dell'email |

---

## Note Implementative
*   **Sicurezza**: Le password non vengono mai salvate in chiaro. Si utilizza **bcryptjs** con un salt di 10 round per tutti gli hash.
*   **Esclusione passwordHash**: Il campo `passwordHash` viene sempre escluso dalle risposte tramite `.select('-passwordHash')`.
*   **Reset password**: Il codice di reset è monouso — viene annullato (`null`) subito dopo l'uso andato a buon fine.
