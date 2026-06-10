// tests/setup.js
// Configurazione eseguita da Jest PRIMA di ogni file di test (vedi
// "setupFilesAfterEnv" in package.json). Si occupa di:
//   1. fornire un JWT_SECRET di test (se non già impostato dallo script npm);
//   2. mockare l'invio email, così i test non spediscono email reali;
//   3. avviare un MongoDB in memoria e collegarci Mongoose;
//   4. svuotare il database fra un test e l'altro (isolamento black-box);
//   5. spegnere tutto al termine della suite.

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// 1. Segreto JWT di test. Lo script "npm test" lo passa già via cross-env,
//    ma lo impostiamo qui come fallback per poter lanciare anche `npx jest`.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

// 2. Mock di nodemailer: i servizi email (verifica, reset, eliminazione)
//    creano un transporter al require. Sostituendo createTransport con un
//    finto che "invia" sempre con successo, le funzioni sendXxxEmail tornano
//    true senza contattare Gmail. Va dichiarato qui, prima che l'app (e quindi
//    i servizi) venga importata dai singoli file di test.
jest.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

let mongo;

// 3. Avvia il MongoDB in memoria e collega Mongoose PRIMA di tutti i test.
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

// 4. Svuota ogni collezione DOPO ogni test: ciascun test parte da un DB pulito,
//    senza dipendere dall'ordine di esecuzione né dai dati di altri test.
afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
  jest.clearAllMocks();
});

// 5. Chiudi la connessione e distruggi il server in memoria al termine.
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
