const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Recupera la lista dei premi con le informazioni dell'attività commerciale associata
router.get('/', async (req, res) => {

  try {

    const db = mongoose.connection.db;

    const rewards = await db.collection('rewards')
      .aggregate([

        {
          $lookup: {
            from: 'partners',
            localField: 'partnerId',
            foreignField: '_id',
            as: 'partner'
          }
        },

        {
          $unwind: {
            path: '$partner',
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $project: {

            name: 1,
            description: 1,
            pointsCost: 1,
            availability: 1,

            partnerName: '$partner.businessName',
            partnerAddress: '$partner.address',
            partnerActive: '$partner.active'

          }
        },

        {
          $sort: {
            pointsCost: 1
          }
        }

      ])
      .toArray();

    return res.status(200).json(rewards);

  } catch (error) {

    console.error(
      "Errore recupero premi:",
      error
    );

    return res.status(500).json({
      message: "Errore server"
    });

  }

});

module.exports = router;