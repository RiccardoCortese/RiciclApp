// tests/user.test.js
// Test black-box delle rotte profilo utente (protette da JWT): /api/user/*
// Copre i test case del file Test_cases.xlsx:
//   - Visualizzazione Profilo  TC 18-19
//   - Modifica Username        TC 20-22
//   - Cambio Password Sicuro   TC 23-26
//   - Password Recovery        TC 34, 35, 37, 38
//   - Eliminazione Account     TC 11

const request = require('supertest');
const bcrypt = require('bcryptjs');

const app = require('../app');
const User = require('../models/user');
const { createUser, authHeader } = require('./helpers');

// ─────────────────────────────────────────────────────────────────────────────
// VISUALIZZAZIONE PROFILO  (GET /api/user/profile)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/user/profile — Visualizzazione Profilo', () => {
  test('TC18 — utente autenticato: 200 con i dati del profilo', async () => {
    const user = await createUser({ email: 'prova@example.com' });

    const res = await request(app).get('/api/user/profile').set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('prova@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash'); // mai esporre la password
  });

  test('TC19 — accesso senza login: 401 token mancante', async () => {
    const res = await request(app).get('/api/user/profile');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Accesso negato. Token mancante.');
  });

  test('Token non valido: 401', async () => {
    const res = await request(app)
      .get('/api/user/profile')
      .set({ Authorization: 'Bearer token-fasullo' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token non valido.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MODIFICA USERNAME  (PATCH /api/user/profile/name)
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/user/profile/name — Modifica Username', () => {
  test('TC20 — nuovo username valido: 200 e aggiornamento nel DB', async () => {
    const user = await createUser();

    const res = await request(app)
      .patch('/api/user/profile/name')
      .set(authHeader(user))
      .send({ username: 'nuovoUsername' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Nome aggiornato con successo');
    expect(res.body.user.name).toBe('nuovoUsername');

    const updated = await User.findById(user._id);
    expect(updated.name).toBe('nuovoUsername');
  });

  test('TC22 — username vuoto: 400', async () => {
    const user = await createUser();

    const res = await request(app)
      .patch('/api/user/profile/name')
      .set(authHeader(user))
      .send({ username: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Il nome deve contenere almeno 2 caratteri');
  });

  // NOTA TC21 (username già in uso -> "Username già in uso"): il backend NON
  // applica un vincolo di unicità sul nome (lo schema User rende unica solo la
  // email). Il controllo "Username già in uso" è quindi lato FRONTEND.
  // Il test seguente documenta il comportamento ATTUALE del server: due utenti
  // possono avere lo stesso nome e l'aggiornamento va comunque a buon fine.
  test('TC21 — username duplicato: il backend NON lo blocca (validazione lato frontend)', async () => {
    await createUser({ name: 'usernameEsistente', email: 'altro@example.com' });
    const user = await createUser({ email: 'prova@example.com' });

    const res = await request(app)
      .patch('/api/user/profile/name')
      .set(authHeader(user))
      .send({ username: 'usernameEsistente' });

    expect(res.status).toBe(200); // comportamento reale del backend
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CAMBIO PASSWORD SICURO  (PATCH /api/user/profile/password)
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/user/profile/password — Cambio Password', () => {
  test('TC23 — vecchia password corretta: 200 e password aggiornata', async () => {
    const user = await createUser({ password: 'passwordVecchia' });

    const res = await request(app)
      .patch('/api/user/profile/password')
      .set(authHeader(user))
      .send({ oldPassword: 'passwordVecchia', newPassword: 'passwordNuova' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password aggiornata con successo');

    // La nuova password deve essere effettivamente salvata (hash aggiornato).
    const updated = await User.findById(user._id);
    expect(await bcrypt.compare('passwordNuova', updated.passwordHash)).toBe(true);
  });

  test('TC24 — vecchia password errata: 400', async () => {
    const user = await createUser({ password: 'passwordCorretta' });

    const res = await request(app)
      .patch('/api/user/profile/password')
      .set(authHeader(user))
      .send({ oldPassword: 'passwordErrata', newPassword: 'passwordNuova' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Vecchia password errata');
  });

  test('TC25 — nuova password troppo corta: 400', async () => {
    const user = await createUser({ password: 'passwordCorretta' });

    const res = await request(app)
      .patch('/api/user/profile/password')
      .set(authHeader(user))
      .send({ oldPassword: 'passwordCorretta', newPassword: '123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('La nuova password deve essere lunga almeno 6 caratteri');
  });

  test('TC26 — campi vuoti: 400', async () => {
    const user = await createUser();

    const res = await request(app)
      .patch('/api/user/profile/password')
      .set(authHeader(user))
      .send({ oldPassword: '', newPassword: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Inserisci vecchia e nuova password');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD RECOVERY  (POST /api/user/profile/request-password-reset e /reset-password)
// ─────────────────────────────────────────────────────────────────────────────
describe('Password Recovery', () => {
  test('TC34 — richiesta codice di reset: 200 (email inviata, mockata)', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/user/profile/request-password-reset')
      .set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Codice di reset inviato via email');

    // Il token di reset deve essere stato salvato (hashato) sull'utente.
    const updated = await User.findById(user._id);
    expect(updated.passwordResetToken).toBeTruthy();
  });

  test('TC35 — reset con codice valido: 200 e password reimpostata', async () => {
    const resetCode = '654321';
    const passwordResetToken = await bcrypt.hash(resetCode, 10);
    const user = await createUser({ passwordResetToken });

    const res = await request(app)
      .post('/api/user/profile/reset-password')
      .set(authHeader(user))
      .send({ newPassword: 'nuovaPassword', code: resetCode });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password reimpostata con successo');

    const updated = await User.findById(user._id);
    expect(await bcrypt.compare('nuovaPassword', updated.passwordHash)).toBe(true);
  });

  test('TC37 — reset con codice non valido: 400 "Codice errato"', async () => {
    const passwordResetToken = await bcrypt.hash('654321', 10);
    const user = await createUser({ passwordResetToken });

    const res = await request(app)
      .post('/api/user/profile/reset-password')
      .set(authHeader(user))
      .send({ newPassword: 'nuovaPassword', code: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Codice errato');
  });

  test('TC38 — reset con campi vuoti: 400', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/user/profile/reset-password')
      .set(authHeader(user))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Inserisci la nuova password e il codice');
  });

  // NOTA TC36 (due nuove password diverse -> invio bloccato): il confronto fra i
  // due campi password avviene lato FRONTEND; il backend riceve una sola
  // newPassword. Va quindi testato nella suite del Frontend.
});

// ─────────────────────────────────────────────────────────────────────────────
// ELIMINAZIONE ACCOUNT  (DELETE /api/user/delete)
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/user/delete — Eliminazione Account', () => {
  test('TC11 — account eliminato: 200 e rimosso dal DB', async () => {
    const user = await createUser({ email: 'prova@example.com' });

    const res = await request(app).delete('/api/user/delete').set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Account eliminato con successo');

    const deleted = await User.findById(user._id);
    expect(deleted).toBeNull();
  });

  test('Eliminazione senza login: 401', async () => {
    const res = await request(app).delete('/api/user/delete');

    expect(res.status).toBe(401);
  });
});
