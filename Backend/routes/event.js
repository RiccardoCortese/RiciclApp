const express = require('express');
const router  = express.Router();

const RecyclingEvent = require('../models/event');
const authMiddleware = require('../middleware/authMiddleware');

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

module.exports = router;
