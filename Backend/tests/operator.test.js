// tests/operator.test.js
// Test black-box della rotta del percorso ottimizzato: /api/operator/*
// Copre il test case del file Test_cases.xlsx:
//   - Percorso ottimale  TC 28
//
// La rotta costruisce le tappe da: (a) segnalazioni ASSIGNED all'operatore il
// cui bidone appartiene a un centro, e (b) bidoni pieni (fillLevel >= 80)
// collegati a un centro.

const request = require('supertest');

const app = require('../app');
const { createOperator, createCitizen, createCenter, createBin, createReport } = require('./helpers');

describe('GET /api/operator/optimized-route/:operatorId — Percorso ottimale (TC28)', () => {
  test('TC28 — nessuna tappa: 200 con success true e tappe vuote', async () => {
    const operator = await createOperator();

    const res = await request(app).get(`/api/operator/optimized-route/${operator._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tappe).toEqual([]);
  });

  test('TC28 — segnalazione assegnata: tappa di tipo INTERVENTO', async () => {
    const operator = await createOperator();
    const citizen = await createCitizen();
    const center = await createCenter();
    const bin = await createBin({ centerId: center._id });
    await createReport({
      userId: citizen._id,
      binId: bin._id,
      status: 'ASSIGNED',
      assignedTo: operator._id,
      description: 'Bidone rotto',
    });

    const res = await request(app).get(`/api/operator/optimized-route/${operator._id}`);

    expect(res.status).toBe(200);
    expect(res.body.tappe).toHaveLength(1);
    expect(res.body.tappe[0].type).toBe('INTERVENTO');
  });

  test('TC28 — bidone pieno (>=80%): tappa di tipo SVUOTAMENTO', async () => {
    const operator = await createOperator();
    const center = await createCenter();
    await createBin({ centerId: center._id, fillLevel: 90 });

    const res = await request(app).get(`/api/operator/optimized-route/${operator._id}`);

    expect(res.status).toBe(200);
    expect(res.body.tappe.some((t) => t.type === 'SVUOTAMENTO')).toBe(true);
  });
});
