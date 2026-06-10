// tests/centers.test.js
// Test black-box delle rotte dei centri di raccolta e bidoni: /api/centers/*
// Copre i test case del file Test_cases.xlsx:
//   - Mappa Real-time             TC 12-13
//   - Livello Riempimento Operatore TC 20 (lettura livello bidone)

const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');
const { createCenter, createBin } = require('./helpers');

// ─────────────────────────────────────────────────────────────────────────────
// MAPPA REAL-TIME  (TC 12-13)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/centers/all — marker dei centri sulla mappa (TC12)', () => {
  test('TC12 — pubblica: 200 con la lista dei centri (anche senza login)', async () => {
    await createCenter({ name: 'Centro A' });
    await createCenter({ name: 'Centro B', address: 'Via B 2' });

    const res = await request(app).get('/api/centers/all');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  test('TC12 — nessun centro: 200 con array vuoto', async () => {
    const res = await request(app).get('/api/centers/all');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/centers/:id — bidoni di uno specifico centro (TC13)', () => {
  test('TC13 — centro esistente: 200 con i bidoni associati', async () => {
    const center = await createCenter();
    await createBin({ centerId: center._id, name: 'Bidone del centro' });

    const res = await request(app).get(`/api/centers/${center._id}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(String(center._id));
    expect(Array.isArray(res.body.bins)).toBe(true);
    expect(res.body.bins).toHaveLength(1);
  });

  test('TC13 — centro inesistente: 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).get(`/api/centers/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Centro di raccolta non trovato nel database.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LIVELLO RIEMPIMENTO  (GET /api/centers/bins/:binId/fill-level)  (TC 20)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/centers/bins/:binId/fill-level — livello riempimento (TC20)', () => {
  test('TC20 — bidone esistente: 200 con il livello di riempimento corrente', async () => {
    const bin = await createBin({ fillLevel: 85 });

    const res = await request(app).get(`/api/centers/bins/${bin._id}/fill-level`);

    expect(res.status).toBe(200);
    expect(res.body.fillLevel).toBe(85);
    expect(res.body.fillLabel).toBe('Pieno'); // >= 80% => "Pieno"
    expect(res.body.status).toBe('PIENO');
  });

  test('Bidone disponibile (< 50%): label "Disponibile"', async () => {
    const bin = await createBin({ fillLevel: 20 });

    const res = await request(app).get(`/api/centers/bins/${bin._id}/fill-level`);

    expect(res.status).toBe(200);
    expect(res.body.fillLabel).toBe('Disponibile');
  });

  test('Bidone inesistente: 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).get(`/api/centers/bins/${fakeId}/fill-level`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Bidone non trovato');
  });
});
