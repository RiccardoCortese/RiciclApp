// tests/rewards.test.js
// Test black-box della rotta lista premi: GET /api/rewards
// Copre il test case del file Test_cases.xlsx:
//   - Lista Premi  TC 19
//
// La rotta usa un'aggregazione su collezioni "grezze" (rewards + partners),
// quindi i dati di test vengono inseriti direttamente con il driver MongoDB.

const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');

describe('GET /api/rewards — Lista Premi (TC19)', () => {
  test('TC19 — nessun premio: 200 con array vuoto', async () => {
    const res = await request(app).get('/api/rewards');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('TC19 — premi presenti: 200 con i premi e i dati del partner, ordinati per costo', async () => {
    const db = mongoose.connection.db;
    const partnerId = new mongoose.Types.ObjectId();

    await db.collection('partners').insertOne({
      _id: partnerId,
      businessName: 'Bar Centrale',
      address: 'Via Roma 1',
      active: true,
    });
    await db.collection('rewards').insertMany([
      { name: 'Caffè gratis', description: 'Un caffè', pointsCost: 50, availability: 10, partnerId },
      { name: 'Sconto 10%', description: 'Sconto', pointsCost: 20, availability: 5, partnerId },
    ]);

    const res = await request(app).get('/api/rewards');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // L'aggregazione ordina per pointsCost crescente.
    expect(res.body[0].name).toBe('Sconto 10%');
    expect(res.body[0].partnerName).toBe('Bar Centrale');
  });
});
