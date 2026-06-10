// tests/helpers.js
// Funzioni di supporto (factory) per creare dati di test direttamente nel DB
// in memoria e per generare token JWT validi. Servono a preparare le
// precondizioni dei test case (utente registrato, bidone esistente, ecc.)
// senza passare dalle rotte, mantenendo i test concisi.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Center = require('../models/collection_center');
const Bin = require('../models/bin');
const Report = require('../models/reports');

// Crea un utente nel DB con password già hashata.
// Per default l'utente è un cittadino già verificato (così può fare login).
async function createUser({
  name = 'Mario Rossi',
  email = 'mario@example.com',
  password = 'password',
  role = 'registered_user',
  isVerified = true,
  points = 0,
  ...rest // eventuali campi extra: verificationToken, passwordResetToken, ecc.
} = {}) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role, isVerified, points, ...rest });
  // Conserviamo la password in chiaro sull'oggetto restituito per comodità nei test di login.
  user._plainPassword = password;
  return user;
}

// Scorciatoie per i tre ruoli previsti dal sistema (vedi enum nello schema User).
const createCitizen = (over = {}) => createUser({ role: 'registered_user', ...over });
const createOperator = (over = {}) =>
  createUser({ role: 'operator', email: 'operator@example.com', ...over });
const createAdmin = (over = {}) =>
  createUser({ role: 'admin', email: 'admin@example.com', ...over });

// Genera un token JWT valido con lo stesso payload prodotto dalla rotta di login.
function authToken(user) {
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
}

// Header Authorization già pronto: header(user) -> { Authorization: 'Bearer ...' }
const authHeader = (user) => ({ Authorization: `Bearer ${authToken(user)}` });

// Crea un centro di raccolta valido (tutti i campi required dello schema).
async function createCenter(over = {}) {
  return Center.create({
    name: 'Centro Test',
    address: 'Via Roma 1, Trento',
    area: 'Centro Storico',
    coordinates: { lat: 46.07, lng: 11.12 },
    ...over,
  });
}

// Crea un bidone. Per default collegato a nessun centro (orfano).
async function createBin(over = {}) {
  return Bin.create({
    binCode: `BIN-TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: 'Bidone Test',
    address: 'Via Roma 1, Trento',
    wasteTypes: ['Plastica'],
    wasteType: 'Plastica',
    coordinates: { lat: 46.07, lng: 11.12 },
    fillLevel: 0,
    status: 'OK',
    ...over,
  });
}

// Crea una segnalazione (report) collegata a un utente e a un bidone.
async function createReport(over = {}) {
  return Report.create({
    userId: over.userId,
    binId: over.binId,
    description: 'Bidone rotto',
    status: 'PENDING',
    ...over,
  });
}

module.exports = {
  createUser,
  createCitizen,
  createOperator,
  createAdmin,
  authToken,
  authHeader,
  createCenter,
  createBin,
  createReport,
};
