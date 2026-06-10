# Test del Frontend — RiciclApp

Test di **componente** degli screen React Native / Expo con **Jest** (preset
`jest-expo`) e **@testing-library/react-native**. Gli screen vengono renderizzati
in memoria; le dipendenze esterne (backend HTTP, storage, navigazione, fotocamera)
sono **mockate**, quindi nessun test contatta la rete o richiede un emulatore.

## Come eseguire i test

```bash
cd Frontend
npm test              # esegue tutti i test una volta
npm run test:watch    # ri-esegue ad ogni modifica
npm run test:coverage # esegue con report di copertura
```

## Come è organizzato

- `jest.setup.js` — mock globali: `AsyncStorage`, `expo-router` (gli spy di
  navigazione sono esposti come `__router`) e la funzione globale `alert()`.
- `__mocks__/axios.js` — mock di axios condiviso (`post/get/patch/delete` come spy).
- `tests/*.test.jsx` — un file per screen. I moduli nativi pesanti (expo-camera,
  expo-image-picker, expo-file-system, @expo/vector-icons) sono mockati nei
  singoli file che li usano.

Cosa verificano i test: rendering dei campi, **chiamata all'endpoint giusto** con
il body corretto, gestione del successo (navigazione, salvataggio token, messaggi
di conferma) e degli errori (alert col messaggio del backend), e la **validazione
lato client** dove esiste davvero (es. codice di 6 cifre, password che coincidono).

## Mappa di copertura dei Test Case (`Test_cases.xlsx`)

| User Story (TC)                      | File di test                 | Stato |
|--------------------------------------|------------------------------|-------|
| Registrazione (1-7)                  | `register.test.jsx`          | ✅ Coperto (TC2-7: messaggi dal backend) |
| Email Verification (8, 10)           | `verify_email.test.jsx`      | ✅ Coperto |
| Email Verification (9)               | `verify_email.test.jsx`      | ✅ Coperto (validazione client "6 cifre") |
| Login JWT (14-17)                    | `login.test.jsx`             | ✅ Coperto |
| Multi utenza (23-25)                 | `login.test.jsx`             | ✅ Coperto (login con ruoli) |
| Visualizzazione Profilo (18)         | `profile.test.jsx`           | ✅ Coperto |
| Modifica Username (20, 22)           | `profile.test.jsx`           | ✅ Coperto |
| Cambio Password Sicuro (23, 25, 26)  | `profile.test.jsx`           | ✅ Coperto |
| Password Recovery (34, 35, 36, 38)   | `profile.test.jsx`           | ✅ Coperto (TC36: password che non coincidono — solo client) |
| Inserimeno Codice Enumerativo (27-29)| `informations.test.jsx`      | ✅ Coperto (ricerca prodotto) |
| Eliminazione Account (11)            | `elimina_account.test.jsx`   | ✅ Coperto |
| Scannerizzazione Codice a Barre (30-33) | —                         | ⛔ Native (fotocamera reale, permessi). La ricerca codice è coperta da 27-29 |
| Cambio Immagine Profilo (39-40)      | —                            | ⛔ Native/Web (image picker + file system; UI fuori dallo scopo del test) |
| Visualizzazione Statistiche zona     | —                            | ⛔ Mappa interattiva (Leaflet/WebView) |
| Timer Punti Scansione (22)           | —                            | ⛔ Countdown UI |

Legenda: ✅ test di componente · ⛔ non testabile in modo affidabile a questo
livello (fotocamera/file system/mappa interattiva). Le rotte API dietro questi
flussi sono comunque coperte dai test del Backend (`Backend/tests/`).
