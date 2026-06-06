const express = require('express');
const router  = express.Router();

const RecyclingEvent = require('../models/event');
const User           = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');

// Punti di ringraziamento assegnati una sola volta a chi ha partecipato a un
// evento, quando l'evento si conclude.
const PARTICIPATION_REWARD = 10;

// Moltiplicatori ammessi per il boost dell'evento.
const ALLOWED_BOOSTS = [2, 3, 5, 10];

// Validazione condivisa fra creazione e modifica. Restituisce { error } con un
// messaggio se i parametri non sono accettabili, altrimenti { data } con il
// payload normalizzato pronto per il DB.
function validateEventBody(body) {
  const { name, coordinates, radius, wasteTypes, boost, startDate, endDate, area } = body || {};

  if (!name || !String(name).trim()) {
    return { error: 'Nome dell\'evento obbligatorio' };
  }
  const lat = Number(coordinates?.lat);
  const lng = Number(coordinates?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: 'Coordinate non valide' };
  }
  const r = Number(radius);
  if (!Number.isFinite(r) || r <= 0) {
    return { error: 'Raggio non valido' };
  }
  const types = Array.isArray(wasteTypes)
    ? wasteTypes.filter(t => t && String(t).trim())
    : [];
  if (types.length === 0) {
    return { error: 'Serve almeno un tipo di rifiuto potenziato' };
  }
  const b = Number(boost);
  if (!ALLOWED_BOOSTS.includes(b)) {
    return { error: 'Boost non valido (ammessi: x2, x3, x5, x10)' };
  }
  const start = new Date(startDate);
  const end   = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Date non valide' };
  }
  if (end.getTime() <= start.getTime()) {
    return { error: 'La fine dell\'evento deve essere successiva all\'inizio' };
  }

  return {
    data: {
      name:        String(name).trim(),
      coordinates: { lat, lng },
      radius:      r,
      wasteTypes:  types,
      boost:       b,
      startDate:   start,
      endDate:     end,
      area:        area ? String(area).trim() : undefined,
    },
  };
}

// ── GET /api/events/all  (pubblico) ──────────────────────────────────────────
// Tutti gli eventi di raccolta, visibili sia all'admin che ai cittadini.
router.get('/all', async (req, res) => {
  try {
    const events = await RecyclingEvent.find().lean();
    return res.status(200).json(events);
  } catch (error) {
    console.error('Errore durante il recupero degli eventi:', error);
    return res.status(500).json({ message: 'Errore del server' });
  }
});

// ── POST /api/events  (admin) ────────────────────────────────────────────────
// Crea un nuovo evento di raccolta.
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { error, data } = validateEventBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const event = await RecyclingEvent.create(data);
    return res.status(201).json(event);
  } catch (error) {
    console.error('Errore durante la creazione dell\'evento:', error);
    return res.status(500).json({ message: 'Errore del server' });
  }
});

// ── PATCH /api/events/:id  (admin) ───────────────────────────────────────────
// Modifica i parametri di un evento esistente.
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { error, data } = validateEventBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const event = await RecyclingEvent.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );
    if (!event) return res.status(404).json({ message: 'Evento non trovato' });
    return res.status(200).json(event);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'ID dell\'evento non valido' });
    }
    console.error('Errore durante la modifica dell\'evento:', error);
    return res.status(500).json({ message: 'Errore del server' });
  }
});

// ── DELETE /api/events/:id  (admin) ──────────────────────────────────────────
// Elimina definitivamente un evento di raccolta.
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await RecyclingEvent.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Evento non trovato' });
    return res.status(200).json({ message: 'Evento eliminato', id: req.params.id });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'ID dell\'evento non valido' });
    }
    console.error('Errore durante l\'eliminazione dell\'evento:', error);
    return res.status(500).json({ message: 'Errore del server' });
  }
});

// ── POST /api/events/settle  (cittadino autenticato) ─────────────────────────
// Liquida gli eventi conclusi a cui l'utente ha partecipato e per cui non ha
// ancora ricevuto i punti di ringraziamento: assegna +10 una sola volta per
// evento e restituisce gli eventi appena liquidati (per il popup di ringrazio).
// Va dichiarata PRIMA di "/:id/join" per non essere oscurata da rotte dinamiche.
router.post('/settle', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Utente non autenticato' });

    const now = new Date();
    const candidates = await RecyclingEvent.find({
      endDate: { $lte: now },
      participants: userId,
      rewardedParticipants: { $ne: userId },
    }).lean();

    const settled = [];
    for (const ev of candidates) {
      // Claim atomico: aggiunge l'utente ai premiati solo se non c'è già, così
      // chiamate concorrenti non assegnano i punti due volte.
      const claimed = await RecyclingEvent.findOneAndUpdate(
        { _id: ev._id, participants: userId, rewardedParticipants: { $ne: userId } },
        { $addToSet: { rewardedParticipants: userId } },
        { new: true }
      );
      if (claimed) settled.push({ _id: ev._id, name: ev.name });
    }

    const pointsAwarded = settled.length * PARTICIPATION_REWARD;
    if (pointsAwarded > 0) {
      await User.findByIdAndUpdate(userId, { $inc: { points: pointsAwarded } });
    }
    const user = await User.findById(userId).lean();

    return res.status(200).json({
      settled,
      pointsPerEvent: PARTICIPATION_REWARD,
      pointsAwarded,
      totalPoints: user?.points ?? null,
    });
  } catch (error) {
    console.error('Errore durante la liquidazione degli eventi conclusi:', error);
    return res.status(500).json({ message: 'Errore del server' });
  }
});

// ── POST /api/events/:id/join  (cittadino autenticato) ───────────────────────
// Iscrive l'utente corrente all'evento: da quel momento, scansionando un rifiuto
// di un tipo potenziato mentre l'evento è attivo, riceve i punti col boost.
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Utente non autenticato' });

    const event = await RecyclingEvent.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { participants: userId } }, // niente duplicati
      { new: true }
    );
    if (!event) return res.status(404).json({ message: 'Evento non trovato' });

    return res.status(200).json({ message: 'Iscrizione effettuata', event });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'ID dell\'evento non valido' });
    }
    console.error('Errore durante l\'iscrizione all\'evento:', error);
    return res.status(500).json({ message: 'Errore del server' });
  }
});

module.exports = router;
