// tests/zx.test.js
// Test black-box della rotta di scansione barcode: /api/zx/scan/:barcode
// Copre i test case del file Test_cases.xlsx:
//   - Inserimeno Codice Enumerativo  TC 27-29 (ricerca prodotto)
//   - Feature punti per scansione    TC 15 (+5 punti), TC 16 (cooldown)
//
// La rotta interroga Open Food Facts tramite fetch(): qui mockiamo global.fetch
// così i test sono deterministici e NON dipendono dalla rete o dall'API esterna.

const request = require('supertest');

const app = require('../app');
const User = require('../models/user');
const { createCitizen } = require('./helpers');

// Risposta finta di Open Food Facts per un prodotto in plastica esistente.
const offProductFound = {
  status: 1,
  product: {
    product_name: 'Acqua Minerale',
    brands: 'AcquaTest',
    countries: 'Italia',
    packaging_tags: ['en:plastic'],
    image_front_small_url: 'http://example.com/img.jpg',
  },
};

// Risposta finta di Open Food Facts per un prodotto inesistente.
const offProductNotFound = { status: 0 };

// Costruisce un finto oggetto Response come quello restituito da fetch().
function mockFetchResolving(jsonBody, ok = true) {
  return jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => jsonBody,
  });
}

afterEach(() => {
  delete global.fetch;
});

// ─────────────────────────────────────────────────────────────────────────────
// INSERIMENTO CODICE ENUMERATIVO  (TC 27-29)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/zx/scan/:barcode — ricerca prodotto', () => {
  test('TC27 — codice valido, prodotto esistente: 200 con dettagli e categoria di smaltimento', async () => {
    global.fetch = mockFetchResolving(offProductFound);

    const res = await request(app).get('/api/zx/scan/8000815303206');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(1);
    expect(res.body.product.product_name).toBe('Acqua Minerale');
    // Il packaging "plastic" deve essere mappato sulla categoria Plastica.
    expect(res.body.disposal[0].label).toBe('Plastica');
  });

  test('TC28 — codice inesistente: 404 "Prodotto non trovato"', async () => {
    global.fetch = mockFetchResolving(offProductNotFound);

    const res = await request(app).get('/api/zx/scan/80008153032060000');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Prodotto non trovato');
  });

  test('TC29 — codice non enumerativo: 404 "Prodotto non trovato"', async () => {
    global.fetch = mockFetchResolving(offProductNotFound);

    const res = await request(app).get('/api/zx/scan/8042f0r815303206gf00');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Prodotto non trovato');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE PUNTI PER SCANSIONE  (TC 15-16)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/zx/scan/:barcode?userId= — punti scansione', () => {
  test('TC15 — scansione valida: assegna 5 punti e aggiorna il saldo', async () => {
    global.fetch = mockFetchResolving(offProductFound);
    const user = await createCitizen({ points: 0 }); // nessuna scansione precedente

    const res = await request(app).get(`/api/zx/scan/8000815303206?userId=${user._id}`);

    expect(res.status).toBe(200);
    expect(res.body.reward.granted).toBe(true);
    expect(res.body.reward.pointsAdded).toBe(5);
    expect(res.body.reward.totalPoints).toBe(5);

    const updated = await User.findById(user._id);
    expect(updated.points).toBe(5);
  });

  test('TC16 — scansione durante il cooldown: nessun nuovo punto assegnato', async () => {
    global.fetch = mockFetchResolving(offProductFound);
    // Utente che ha appena ricevuto punti (timer di cooldown attivo).
    const user = await createCitizen({ points: 5 });
    user.lastScanRewardAt = new Date(); // adesso => dentro il cooldown di 10 minuti
    await user.save();

    const res = await request(app).get(`/api/zx/scan/8000815303206?userId=${user._id}`);

    expect(res.status).toBe(200);
    expect(res.body.reward.granted).toBe(false);
    expect(res.body.reward.pointsAdded).toBe(0);
    expect(res.body.reward.message).toBe('Attendere prima di ottenere altri punti da una scansione');

    const updated = await User.findById(user._id);
    expect(updated.points).toBe(5); // saldo invariato
  });
});
