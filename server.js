const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const CSV  = path.join(__dirname, 'data', 'subscribers.csv');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure CSV exists with header
if (!fs.existsSync(CSV)) {
    fs.writeFileSync(CSV, 'Email,Fecha\n', 'utf8');
}

// --- Subscribe endpoint ---
app.post('/subscribe', (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.json({ ok: false, message: 'Email no válido' });
    }

    const content = fs.readFileSync(CSV, 'utf8');
    if (content.includes(email)) {
        return res.json({ ok: false, message: 'Este email ya está registrado' });
    }

    const date = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    fs.appendFileSync(CSV, `${email},${date}\n`, 'utf8');

    res.json({ ok: true, message: '¡Te avisaremos en cuanto abramos!' });
});

// --- Download CSV ---
app.get('/admin/subscribers', (req, res) => {
    if (!fs.existsSync(CSV)) return res.send('No hay suscriptores aún.');
    res.download(CSV, 'suscriptores-golden.csv');
});

// --- Serve index for all other routes ---
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Golden Coming Soon corriendo en http://localhost:${PORT}`);
});
