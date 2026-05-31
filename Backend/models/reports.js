const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Punta al tuo modello utenti
      required: true
    },
    binId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bin', // Punta al tuo modello bidoni
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED'], 
      default: 'PENDING'
    }
  },
  {
    timestamps: true 
  }
);

module.exports = mongoose.model('Report', reportSchema);