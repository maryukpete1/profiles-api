const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./database');
const { getAgeGroup } = require('./classifier');
const { generateUUIDv7 } = require('./uuidv7');

const app = express();
app.use(cors());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});
app.use(express.json());

// ─── Helper: fetch external APIs ───────────────────────────────────────────────

async function fetchExternalData(name) {
    const [genderRes, ageRes, nationalityRes] = await Promise.all([
        axios.get(`https://api.genderize.io?name=${encodeURIComponent(name)}`),
        axios.get(`https://api.agify.io?name=${encodeURIComponent(name)}`),
        axios.get(`https://api.nationalize.io?name=${encodeURIComponent(name)}`),
    ]);

    const genderData = genderRes.data;
    const ageData = ageRes.data;
    const nationalityData = nationalityRes.data;

    // Validate Genderize
    if (!genderData.gender || genderData.count === 0) {
        const err = new Error('Genderize returned an invalid response');
        err.statusCode = 502;
        throw err;
    }

    // Validate Agify
    if (ageData.age === null || ageData.age === undefined) {
        const err = new Error('Agify returned an invalid response');
        err.statusCode = 502;
        throw err;
    }

    // Validate Nationalize
    if (!nationalityData.country || nationalityData.country.length === 0) {
        const err = new Error('Nationalize returned an invalid response');
        err.statusCode = 502;
        throw err;
    }

    // Pick the highest probability country
    const topCountry = nationalityData.country.reduce((best, curr) =>
        curr.probability > best.probability ? curr : best
    );

    return {
        gender: genderData.gender,
        gender_probability: genderData.probability,
        sample_size: genderData.count,
        age: ageData.age,
        age_group: getAgeGroup(ageData.age),
        country_id: topCountry.country_id,
        country_probability: topCountry.probability,
    };
}

// ─── POST /api/profiles ────────────────────────────────────────────────────────

app.post('/api/profiles', async (req, res) => {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ status: 'error', message: 'Name is required' });
    }

    if (typeof name !== 'string') {
        return res.status(422).json({ status: 'error', message: 'Name must be a string' });
    }

    const cleanName = name.trim().toLowerCase();

    // Check for existing profile (idempotency)
    const existing = db.prepare('SELECT * FROM profiles WHERE name = ?').get(cleanName);
    if (existing) {
        return res.status(200).json({
            status: 'success',
            message: 'Profile already exists',
            data: formatProfile(existing),
        });
    }

    // Fetch from external APIs
    let externalData;
    try {
        externalData = await fetchExternalData(cleanName);
    } catch (err) {
        const statusCode = err.statusCode || 502;
        return res.status(statusCode).json({ status: 'error', message: err.message });
    }

    // Build and insert profile
    const profile = {
        id: generateUUIDv7(),
        name: cleanName,
        gender: externalData.gender,
        gender_probability: externalData.gender_probability,
        sample_size: externalData.sample_size,
        age: externalData.age,
        age_group: externalData.age_group,
        country_id: externalData.country_id,
        country_probability: externalData.country_probability,
        created_at: new Date().toISOString(),
    };

    db.prepare(`
    INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
    VALUES (@id, @name, @gender, @gender_probability, @sample_size, @age, @age_group, @country_id, @country_probability, @created_at)
  `).run(profile);

    return res.status(201).json({
        status: 'success',
        data: formatProfile(profile),
    });
});

// ─── GET /api/profiles ─────────────────────────────────────────────────────────

app.get('/api/profiles', (req, res) => {
    const { gender, country_id, age_group } = req.query;

    const conditions = [];
    const params = [];

    if (gender) {
        conditions.push('LOWER(gender) = LOWER(?)');
        params.push(gender);
    }
    if (country_id) {
        conditions.push('LOWER(country_id) = LOWER(?)');
        params.push(country_id);
    }
    if (age_group) {
        conditions.push('LOWER(age_group) = LOWER(?)');
        params.push(age_group);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const rows = db.prepare(`SELECT * FROM profiles ${whereClause}`).all(...params);

    return res.status(200).json({
        status: 'success',
        count: rows.length,
        data: rows.map(formatProfileList),
    });
});

// ─── GET /api/profiles/:id ─────────────────────────────────────────────────────

app.get('/api/profiles/:id', (req, res) => {
    const { id } = req.params;
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);

    if (!profile) {
        return res.status(404).json({ status: 'error', message: 'Profile not found' });
    }

    return res.status(200).json({
        status: 'success',
        data: formatProfile(profile),
    });
});

// ─── DELETE /api/profiles/:id ──────────────────────────────────────────────────

app.delete('/api/profiles/:id', (req, res) => {
    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM profiles WHERE id = ?').get(id);

    if (!existing) {
        return res.status(404).json({ status: 'error', message: 'Profile not found' });
    }

    db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
    return res.status(204).send();
});

// ─── Formatters ────────────────────────────────────────────────────────────────

function formatProfile(p) {
    return {
        id: p.id,
        name: p.name,
        gender: p.gender,
        gender_probability: p.gender_probability,
        sample_size: p.sample_size,
        age: p.age,
        age_group: p.age_group,
        country_id: p.country_id,
        country_probability: p.country_probability,
        created_at: p.created_at,
    };
}

function formatProfileList(p) {
    return {
        id: p.id,
        name: p.name,
        gender: p.gender,
        age: p.age,
        age_group: p.age_group,
        country_id: p.country_id,
    };
}

// ─── Global error handler ──────────────────────────────────────────────────────

app.use((err, req, res, next) => {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
});

// ─── 404 for unknown routes ────────────────────────────────────────────────────
app.use((req, res) => {
    return res.status(404).json({ status: 'error', message: 'Route not found' });
});

// ─── Start server ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
