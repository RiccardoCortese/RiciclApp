const mongoose = require("mongoose");

const binSchema = new mongoose.Schema(
  {
    binCode: {
      type: String,
      required: true,
      unique: true, // Ogni bidone ha un codice univoco (es. BIN001)
      trim: true,
    },
    wasteType: {
      type: String,
      required: true,
      enum: ["carta", "plastica", "vetro", "umido", "indifferenziato", "olio esausto"], 
    },
    fillLevel: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ["OK", "MANUTENZIONE", "PIENO"],
      default: "OK",
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollectionCenter", 
      required: true,
    },
    sensor: {
      sensorCode: { type: String, required: true, trim: true },
      batteryLevel: { type: Number, min: 0, max: 100, default: 100 },
      lastUpdate: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model("Bin", binSchema);