const mongoose = require("mongoose");

const binSchema = new mongoose.Schema(
  {
    binCode: {
      type: String,
      // Auto-generato lato server se non fornito (vedi routes/admin.js)
      unique: true,
      sparse: true, // consente più documenti senza binCode senza violare l'unicità
      trim: true,
    },
    // Nome leggibile del bidone (es. "Bidone Piazza Duomo")
    name: {
      type: String,
      trim: true,
    },
    // Indirizzo testuale (può essere calcolato via reverse geocoding)
    address: {
      type: String,
      trim: true,
    },
    // Legacy: singolo tipo di rifiuto. Mantenuto per i bidoni già esistenti.
    wasteType: {
      type: String,
      trim: true,
    },
    // Nuovo: un bidone può accettare più tipi di rifiuto. Il primo elemento è
    // il tipo principale. I valori provengono dalle categorie di smaltimento
    // dei prodotti scansionabili (vedi DISPOSAL_CATEGORIES in routes/ZX_API.js).
    wasteTypes: {
      type: [String],
      default: [],
    },
    // Posizione sulla mappa per i bidoni piazzati dall'admin.
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    // Circoscrizione (quartiere) in cui ricade il bidone. Calcolata lato client
    // dalle coordinate e usata dal server per assegnare i bidoni "orfani" al
    // primo centro di raccolta creato nello stesso quartiere.
    area: {
      type: String,
      trim: true,
    },
    fillLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    status: {
      type: String,
      enum: ["OK", "MANUTENZIONE", "PIENO", "SEGNALATO", "GUASTO"],
      default: "OK",
    },
    // Opzionale: un bidone piazzato liberamente sulla mappa può non appartenere
    // a un centro di raccolta.
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollectionCenter",
    },
    sensor: {
      sensorCode: { type: String, trim: true },
      batteryLevel: { type: Number, min: 0, max: 100, default: 100 },
      lastUpdate: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Bin || mongoose.model("Bin", binSchema);
