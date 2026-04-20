require('dotenv').config();
const express   = require('express');
const { Pool }  = require('pg');
const path      = require('path');
const rateLimit = require('express-rate-limit');

const app  = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const subscribeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { ok: false, message: 'Demasiados intentos. Espera unos minutos.' }
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Demasiados intentos. Espera unos minutos.'
});

app.post('/subscribe', subscribeLimiter, async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.json({ ok: false, message: 'Email no válido' });
    }

    try {
        await pool.query(
            'INSERT INTO subscribers (email) VALUES ($1)',
            [email]
        );
        res.json({ ok: true, message: '¡Te avisaremos en cuanto abramos!' });
    } catch (err) {
        if (err.code === '23505') {
            return res.json({ ok: false, message: 'Este email ya está registrado' });
        }
        console.error(err);
        res.status(500).json({ ok: false, message: 'Error interno. Inténtalo de nuevo.' });
    }
});

app.get('/admin/subscribers', adminLimiter, async (req, res) => {
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        return res.status(401).send('No autorizado');
    }

    try {
        const { rows } = await pool.query('SELECT email, created_at FROM subscribers ORDER BY created_at DESC');
        const csv = 'Email,Fecha\n' + rows.map(r =>
            `${r.email},${new Date(r.created_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="suscriptores-golden.csv"');
        res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener suscriptores');
    }
});

app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Golden Coming Soon en http://localhost:${PORT}`));
}

module.exports = app;
