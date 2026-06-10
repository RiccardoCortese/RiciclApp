// tests/admin.test.js
// Test black-box delle rotte admin: /api/admin/*  (tutte protette da JWT)
// Copre i test case del file Test_cases.xlsx (sezione Admin):
//   - Aggiunta Bidone Admin       TC 3, 4, 5, 6, 7
//   - Mappatura Categorie-Bidoni  TC 8 (cambio stato bidone)

const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');
const Bin = require('../models/bin');
const { createAdmin, createCenter, createBin, authHeader } = require('./helpers');

// Corpo valido per la creazione di un bidone.
const validBin = {
  name: 'Bidone Piazza Duomo',
  address: 'Piazza Duomo, Trento',
  coordinates: { lat: 46.07, lng: 11.12 },
  wasteTypes: ['Plastica', 'Metallo'],
};

// ─────────────────────────────────────────────────────────────────────────────
// AGGIUNTA BIDONE  (POST /api/admin/bins)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/admin/bins — Aggiunta Bidone', () => {
  test('TC3 — tutti i parametri presenti: 201 e bidone creato', async () => {
    const admin = await createAdmin();
    const center = await createCenter();

    const res = await request(app)
      .post('/api/admin/bins')
      .set(authHeader(admin))
      .send({ ...validBin, centerId: center._id });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Bidone Piazza Duomo');
    expect(res.body.status).toBe('OK'); // con centro collegato lo stato è OK

    const count = await Bin.countDocuments();
    expect(count).toBe(1);
  });

  test('TC4 — manca il nome: 400 "Nome del bidone obbligatorio"', async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post('/api/admin/bins')
      .set(authHeader(admin))
      .send({ ...validBin, name: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Nome del bidone obbligatorio');
  });

  test('TC4 — manca il tipo di rifiuto: 400 "Serve almeno un tipo di rifiuto"', async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post('/api/admin/bins')
      .set(authHeader(admin))
      .send({ ...validBin, wasteTypes: [] });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Serve almeno un tipo di rifiuto');
  });

  test('TC5 — senza centro di raccolta: 201 con stato GUASTO e centerId nullo', async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post('/api/admin/bins')
      .set(authHeader(admin))
      .send(validBin); // nessun centerId

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('GUASTO');
    expect(res.body.centerId).toBeUndefined();
  });

  test('Senza token: 401', async () => {
    const res = await request(app).post('/api/admin/bins').send(validBin);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CANCELLAZIONE BIDONE  (DELETE /api/admin/bins/:id)  (TC 6)
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/admin/bins/:id — Cancellazione Bidone', () => {
  test('TC6 — bidone esistente: 200 ed eliminato dal DB', async () => {
    const admin = await createAdmin();
    const bin = await createBin();

    const res = await request(app)
      .delete(`/api/admin/bins/${bin._id}`)
      .set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Bidone eliminato');
    expect(await Bin.findById(bin._id)).toBeNull();
  });

  test('TC6 — bidone inesistente: 404', async () => {
    const admin = await createAdmin();
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/admin/bins/${fakeId}`)
      .set(authHeader(admin));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Bidone non trovato');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AGGIUNTA CENTRO DI RACCOLTA  (POST /api/admin/centers)  (TC 7)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/admin/centers — Aggiunta Centro di Raccolta', () => {
  const validCenter = {
    name: 'Centro Nuovo',
    address: 'Via Verdi 10, Trento',
    area: 'Centro Storico',
    coordinates: { lat: 46.07, lng: 11.12 },
  };

  test('TC7 — dati completi: 201 e centro creato', async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post('/api/admin/centers')
      .set(authHeader(admin))
      .send(validCenter);

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Centro Nuovo');
  });

  test('TC7 — manca il quartiere (area): 400', async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post('/api/admin/centers')
      .set(authHeader(admin))
      .send({ ...validCenter, area: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Quartiere (area) del centro obbligatorio');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MAPPATURA CATEGORIE-BIDONI / CAMBIO STATO  (PATCH /api/admin/bins/:id/status)  (TC 8)
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/admin/bins/:id/status — Cambio stato bidone', () => {
  test('TC8 — stato valido: 200 e stato aggiornato', async () => {
    const admin = await createAdmin();
    const bin = await createBin({ status: 'OK' });

    const res = await request(app)
      .patch(`/api/admin/bins/${bin._id}/status`)
      .set(authHeader(admin))
      .send({ status: 'MANUTENZIONE' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('MANUTENZIONE');
  });

  test('TC8 — stato non valido: 400 "Stato non valido"', async () => {
    const admin = await createAdmin();
    const bin = await createBin();

    const res = await request(app)
      .patch(`/api/admin/bins/${bin._id}/status`)
      .set(authHeader(admin))
      .send({ status: 'STATO_INESISTENTE' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Stato non valido');
  });
});
