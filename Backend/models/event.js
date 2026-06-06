const mongoose = require("mongoose");

// ── Recycling event (Evento di Raccolta) ────────────────────────────────────
// Un evento di raccolta è un'area circolare, attiva in una finestra temporale,
// in cui gli utenti che scansionano un rifiuto di un tipo "potenziato" ricevono
// i punti moltiplicati per il boost dell'evento. È creato e modificato solo
// dall'admin, ma è visibile (in sola lettura) anche ai cittadini.
const eventSchema = new mongoose.Schema(
  {
    // Nome leggibile dell'evento (mostrato al centro del cerchio sulla mappa).
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Centro del cerchio dell'evento.
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    // Raggio dell'area dell'evento, in metri.
    radius: {
      type: Number,
      required: true,
      min: 1,
    },
    // Tipi di rifiuto potenziati: scansionare uno di questi tipi dentro l'area
    // moltiplica i punti per `boost`. I valori coincidono con WASTE_TYPES.
    wasteTypes: {
      type: [String],
      default: [],
    },
    // Moltiplicatore dei punti per i tipi potenziati (x2, x3, x5, x10).
    boost: {
      type: Number,
      required: true,
      enum: [2, 3, 5, 10],
    },
    // Finestra temporale dell'evento. La fine deve essere successiva all'inizio.
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    // Circoscrizione (quartiere) in cui ricade il centro dell'evento. Calcolata
    // lato client dalle coordinate, come per bidoni e centri.
    area: {
      type: String,
      trim: true,
    },
    // Cittadini iscritti all'evento. Solo i partecipanti ricevono il boost dei
    // punti quando scansionano un rifiuto di un tipo potenziato (vedi ZX_API).
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Partecipanti che hanno già ricevuto i 10 punti di ringraziamento alla
    // conclusione dell'evento. Evita di assegnarli più volte (vedi /events/settle).
    rewardedParticipants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.RecyclingEvent || mongoose.model("RecyclingEvent", eventSchema);
