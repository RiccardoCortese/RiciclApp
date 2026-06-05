const mongoose = require('mongoose');
require('dotenv').config(); // Carica le variabili dal file .env

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Atlas Connesso: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Errore di connessione: ${error.message}`);
    process.exit(1); // Ferma l'applicazione se il database non si collega
  }
};

module.exports = connectDB;