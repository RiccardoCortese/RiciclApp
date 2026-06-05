const jwt = require('jsonwebtoken');

// Middleware per verificare il token JWT
const authMiddleware = (req, res, next) => {

    // Leggo l'header Authorization
    const authHeader = req.headers.authorization;

    // Controllo se il token esiste
    if (!authHeader) {
        return res.status(401).json({
            message: 'Accesso negato. Token mancante.'
        });
    }

    try {

        // Estraggo il token rimuovendo la parola "Bearer"
        const token = authHeader.split(' ')[1];

        // Verifico il token usando la chiave segreta
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Salvo i dati dell'utente nella request
        req.user = decoded;

        // Passo al prossimo middleware/route
        next();

    } catch (error) {

        return res.status(401).json({
            message: 'Token non valido.'
        });

    }
};

module.exports = authMiddleware;
