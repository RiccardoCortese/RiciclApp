// tests/events.test.js
// Test black-box delle rotte degli eventi di raccolta: /api/events/*
// Copre i test case del file Test_cases.xlsx (sezione Admin):
//   - Gestione Eventi Raccolta  TC 9 (creazione), TC 10 (eliminazione)

const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');
const RecyclingEvent = require('../models/event');
const { createAdmin, authHeader } = require('./helpers');

// Corpo valido per un evento di raccolta (vedi validateEventBody in routes/event.js).
const validEvent = {
  name: 'Pulizia del Parco',
  coordinates: { lat: 46.07, lng: 11.12 },
  radius: 200,
  wasteTypes: ['Plastica'],
  boost: 2,
  startDate: '2026-07-01T08:00:00.000Z',
  endDate: '2026-07-01T18:00:00.000Z',
  area: 'Centro Storico',
};

// ─────────────────────────────────────────────────────────────────────────────
// CREAZIONE EVENTO  (POST /api/events)  (TC 9)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/events — Creazione Evento', () => {
  test('TC9 — dati validi: 201 e evento creato', async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post('/api/events')
      .set(authHeader(admin))
      .send(validEvent);

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Pulizia del Parco');
    expect(await RecyclingEvent.countDocuments()).toBe(1);
  });

  test('TC9 — nome mancante: 400', async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post('/api/events')
      .set(authHeader(admin))
      .send({ ...validEvent, name: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Nome dell'evento obbligatorio");
  });

  test('TC9 — boost non ammesso: 400', async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post('/api/events')
      .set(authHeader(admin))
      .send({ ...validEvent, boost: 4 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Boost non valido (ammessi: x2, x3, x5, x10)');
  });

  test('TC9 — fine evento non successiva all’inizio: 400', async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .post('/api/events')
      .set(authHeader(admin))
      .send({ ...validEvent, endDate: validEvent.startDate });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("La fine dell'evento deve essere successiva all'inizio");
  });

  test('Senza token: 401', async () => {
    const res = await request(app).post('/api/events').send(validEvent);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ELIMINAZIONE EVENTO  (DELETE /api/events/:id)  (TC 10)
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/events/:id — Eliminazione Evento', () => {
  test('TC10 — evento esistente: 200 ed eliminato dal DB', async () => {
    const admin = await createAdmin();
    const event = await RecyclingEvent.create({
      ...validEvent,
      startDate: new Date(validEvent.startDate),
      endDate: new Date(validEvent.endDate),
    });

    const res = await request(app)
      .delete(`/api/events/${event._id}`)
      .set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Evento eliminato');
    expect(await RecyclingEvent.findById(event._id)).toBeNull();
  });

  test('TC10 — evento inesistente: 404', async () => {
    const admin = await createAdmin();
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/events/${fakeId}`)
      .set(authHeader(admin));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Evento non trovato');
  });
});
