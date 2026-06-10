// tests/report.test.js
// Test black-box delle rotte delle segnalazioni: /api/report/*
// Copre i test case del file Test_cases.xlsx:
//   - Segnalazione Danni            TC 26-27
//   - Feature punti per segnalazione TC 17 (convalida +10), TC 18 (rifiuto)
//   - Approvazione Segnalazioni      TC 29-30
//   - Assegnazione Segnalazioni      TC 31

const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');
const Report = require('../models/reports');
const Bin = require('../models/bin');
const User = require('../models/user');
const { createCitizen, createOperator, createBin, createReport } = require('./helpers');

// ─────────────────────────────────────────────────────────────────────────────
// SEGNALAZIONE DANNI  (POST /api/report/create)  (TC 26-27)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/report/create — Segnalazione Danni', () => {
  test('TC26 — segnalazione valida: 201 e bidone messo in stato SEGNALATO', async () => {
    const user = await createCitizen();
    const bin = await createBin();

    const res = await request(app)
      .post('/api/report/create')
      .send({ userId: user._id, binId: bin._id, description: 'Bidone ribaltato' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Report creato con successo');

    const updatedBin = await Bin.findById(bin._id);
    expect(updatedBin.status).toBe('SEGNALATO');
  });

  test('TC27 — segnalazione senza descrizione: 400', async () => {
    const user = await createCitizen();
    const bin = await createBin();

    const res = await request(app)
      .post('/api/report/create')
      .send({ userId: user._id, binId: bin._id, description: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('La descrizione è obbligatoria');
  });

  test('Bidone inesistente: 404', async () => {
    const user = await createCitizen();
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post('/api/report/create')
      .send({ userId: user._id, binId: fakeId, description: 'Test' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Bidone non trovato');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AGGIORNAMENTO STATO + PUNTI  (PUT /api/report/update/:reportId)
//   TC 17 (convalida -> +10 punti), TC 18 / TC 30 (rifiuto), TC 29 (approva)
// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/report/update/:reportId — convalida / approvazione / rifiuto', () => {
  test('TC17 — convalida (IN_PROGRESS): 200 e +10 punti all’utente', async () => {
    const user = await createCitizen({ points: 0 });
    const bin = await createBin();
    const report = await createReport({ userId: user._id, binId: bin._id, status: 'PENDING' });

    const res = await request(app)
      .put(`/api/report/update/${report._id}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.points).toBe(10); // 10 punti per segnalazione convalidata

    const updatedBin = await Bin.findById(bin._id);
    expect(updatedBin.status).toBe('MANUTENZIONE');
  });

  test('TC18 / TC30 — rifiuto (REJECTED): 200, nessun punto e report eliminato', async () => {
    const user = await createCitizen({ points: 0 });
    const bin = await createBin({ status: 'SEGNALATO' });
    const report = await createReport({ userId: user._id, binId: bin._id, status: 'PENDING' });

    const res = await request(app)
      .put(`/api/report/update/${report._id}`)
      .send({ status: 'REJECTED' });

    expect(res.status).toBe(200);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.points).toBe(0); // nessun punto assegnato

    // Il report viene eliminato e il bidone torna operativo (OK).
    expect(await Report.findById(report._id)).toBeNull();
    const updatedBin = await Bin.findById(bin._id);
    expect(updatedBin.status).toBe('OK');
  });

  test('TC29 — approvazione (ACCEPT): 200 e stato aggiornato', async () => {
    const user = await createCitizen();
    const bin = await createBin();
    const report = await createReport({ userId: user._id, binId: bin._id, status: 'PENDING' });

    const res = await request(app)
      .put(`/api/report/update/${report._id}`)
      .send({ status: 'ACCEPT' });

    expect(res.status).toBe(200);
    const updated = await Report.findById(report._id);
    expect(updated.status).toBe('ACCEPT');
  });

  test('Report inesistente: 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .put(`/api/report/update/${fakeId}`)
      .send({ status: 'ACCEPT' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Report non trovato');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSEGNAZIONE  (PUT /api/report/assign/:reportId)  (TC 31)
// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/report/assign/:reportId — Assegnazione Segnalazioni', () => {
  test('TC31 — assegnazione a un operatore: 200 e stato ASSIGNED', async () => {
    const user = await createCitizen();
    const operator = await createOperator();
    const bin = await createBin();
    const report = await createReport({ userId: user._id, binId: bin._id, status: 'ACCEPT' });

    const res = await request(app)
      .put(`/api/report/assign/${report._id}`)
      .send({ assignedTo: operator._id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Operatore assegnato con successo.');
    expect(res.body.report.status).toBe('ASSIGNED');
  });

  test('TC31 — operatore mancante: 400 "ID operatore mancante."', async () => {
    const user = await createCitizen();
    const bin = await createBin();
    const report = await createReport({ userId: user._id, binId: bin._id });

    const res = await request(app)
      .put(`/api/report/assign/${report._id}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('ID operatore mancante.');
  });
});
