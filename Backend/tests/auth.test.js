// tests/auth.test.js
// Test black-box delle rotte di autenticazione: /api/auth/*
// Copre i test case del file Test_cases.xlsx:
//   - Registrazione            TC 1-7
//   - Email Verification       TC 8-10
//   - Login JWT                TC 14-17
//   - Multi utenza             TC 23-25
//   - Dashboard Admin (login)  TC 1 (sezione Admin)

const request = require('supertest');
const bcrypt = require('bcryptjs');

const app = require('../app');
const User = require('../models/user');
const { createUser, createOperator, createAdmin } = require('./helpers');

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRAZIONE  (POST /api/auth/register)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/register — Registrazione', () => {
  const valid = { username: 'username', email: 'prova@example.com', password: 'password' };

  test('TC1 — registrazione valida: 201 e utente salvato nel DB', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Utente registrato con successo');

    // L'utente viene salvato nel database con email verificata = false
    const saved = await User.findOne({ email: 'prova@example.com' });
    expect(saved).not.toBeNull();
    expect(saved.isVerified).toBe(false);
  });

  test('TC2 — email con formato non valido: 400 "Email non valida"', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, email: 'provaexamplecom' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email non valida');
  });

  test('TC3 — password più corta di 6 caratteri: 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, password: 'pass' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('La password deve essere lunga almeno 6 caratteri');
  });

  test('TC4 — email già registrata: 400 "Utente già registrato"', async () => {
    await createUser({ email: 'prova@example.com' }); // Precondizione: email già presente
    const res = await request(app).post('/api/auth/register').send(valid);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Utente già registrato');
  });

  test('TC5 — username mancante: 400 "Compila tutti i campi"', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'prova@example.com', password: 'password' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Compila tutti i campi');
  });

  test('TC6 — email mancante: 400 "Compila tutti i campi"', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'username', password: 'password' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Compila tutti i campi');
  });

  test('TC7 — password mancante: 400 "Compila tutti i campi"', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'username', email: 'prova@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Compila tutti i campi');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL VERIFICATION  (POST /api/auth/verify-email)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/verify-email — Verifica email', () => {
  // Precondizione: utente non verificato con un codice noto salvato (hashato).
  async function userWithCode(code = '123456') {
    const verificationToken = await bcrypt.hash(code, 10);
    return createUser({ email: 'prova@example.com', isVerified: false, verificationToken });
  }

  test('TC8 — codice corretto: 200 e account verificato', async () => {
    await userWithCode('123456');

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ email: 'prova@example.com', code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Email verificata con successo! Ora puoi effettuare il login.');

    const user = await User.findOne({ email: 'prova@example.com' });
    expect(user.isVerified).toBe(true);
  });

  test('TC10 — codice errato: 400 "Codice errato"', async () => {
    await userWithCode('123456');

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ email: 'prova@example.com', code: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Codice errato');
  });

  test('Email inesistente: 404 "Utente non trovato"', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ email: 'nessuno@example.com', code: '123456' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Utente non trovato');
  });

  // NOTA TC9 (codice vuoto -> "Il codice deve essere di 6 cifre"): questa
  // validazione è lato FRONTEND (il backend non controlla la lunghezza del
  // codice). Va quindi testata nella suite del Frontend, non qui.
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN JWT  (POST /api/auth/login)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login — Login JWT', () => {
  test('TC14 — credenziali corrette: 200 e token JWT', async () => {
    await createUser({ email: 'prova@example.com', password: 'password', isVerified: true });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'prova@example.com', password: 'password' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login effettuato con successo');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('prova@example.com');
  });

  test('TC15 — password errata: 400', async () => {
    await createUser({ email: 'prova@example.com', password: 'password', isVerified: true });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'prova@example.com', password: 'passwordSbagliata' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email o password non validi');
  });

  test('TC16 — email non registrata: 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'emailinonesistente@example.com', password: 'password' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email o password non validi');
  });

  test('TC17 — campi vuoti: 400 "Compila tutti i campi"', async () => {
    const res = await request(app).post('/api/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Compila tutti i campi');
  });

  test('Utente non verificato: 400 email non verificata', async () => {
    await createUser({ email: 'prova@example.com', password: 'password', isVerified: false });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'prova@example.com', password: 'password' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email non verificata. Controlla la tua casella di posta.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MULTI UTENZA (TC 23-25) + DASHBOARD ADMIN login (TC 1 Admin)
// Il login restituisce il ruolo corretto per cittadino, operatore e admin.
// ─────────────────────────────────────────────────────────────────────────────
describe('Login multi-ruolo — Multi utenza / Dashboard Admin', () => {
  test('TC23 — accesso come Cittadino: ruolo registered_user', async () => {
    await createUser({ email: 'cittadino@example.com', password: 'password', role: 'registered_user' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cittadino@example.com', password: 'password' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('registered_user');
  });

  test('TC24 — accesso come Operatore: ruolo operator', async () => {
    await createOperator({ password: 'password' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'operator@example.com', password: 'password' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('operator');
  });

  test('TC25 / Admin TC1 — accesso come Admin: ruolo admin', async () => {
    await createAdmin({ password: 'adminpassword' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'adminpassword' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });
});
