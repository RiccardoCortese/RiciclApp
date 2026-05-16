const mongoose = require("mongoose");

const collectionCenterSchema = new mongoose.Schema(
  {
    name: {
        type: String,
        required: true,
        trim: true,
    },
    address: {
        type: String,
        required: true,
        trim: true,
    },
    area: {
        type: String,
        required: true,
        trim: true, 
    },
    openingHours: {
        type: String,
        required: true,
        trim: true,
        default: "Lun-Ven 8:00-18:00, Sab 9:00-13:00, Dom chiuso",
    },
    coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
    },
  },

  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

module.exports = mongoose.model("CollectionCenter", collectionCenterSchema, "collection_centers");