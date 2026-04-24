const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { parseQuery } = require('./parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Helper to build parameterized SQL query
function buildFiltersQuery(query) {
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (query.gender) {
        conditions.push(`gender = $${paramCount++}`);
        values.push(query.gender.toLowerCase());
    }
    if (query.age_group) {
        conditions.push(`age_group = $${paramCount++}`);
        values.push(query.age_group.toLowerCase());
    }
    if (query.country_id) {
        conditions.push(`country_id = $${paramCount++}`);
        values.push(query.country_id.toUpperCase());
    }
    if (query.min_age !== undefined) {
        conditions.push(`age >= $${paramCount++}`);
        values.push(parseInt(query.min_age, 10));
    }
    if (query.max_age !== undefined) {
        conditions.push(`age <= $${paramCount++}`);
        values.push(parseInt(query.max_age, 10));
    }
    if (query.min_gender_probability !== undefined) {
        conditions.push(`gender_probability >= $${paramCount++}`);
        values.push(parseFloat(query.min_gender_probability));
    }
    if (query.min_country_probability !== undefined) {
        conditions.push(`country_probability >= $${paramCount++}`);
        values.push(parseFloat(query.min_country_probability));
    }

    // Custom from NLP parser
    if (query._country_name_search) {
        conditions.push(`country_name ILIKE $${paramCount++}`);
        values.push(`%${query._country_name_search}%`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    return { whereClause, values, paramCount };
}

async function fetchFromDB(req, res, filters) {
    let { page, limit, sort_by, order } = req.query;

    // Pagination defaults
    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 10;
    if (limitNum > 100) limitNum = 100;

    // Sorting defaults
    const allowedSorts = ['age', 'created_at', 'gender_probability'];
    if (sort_by && !allowedSorts.includes(sort_by)) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid sort parameter',
            error: 'Invalid query parameters'
        });
    }
    const sortCol = sort_by || 'created_at';
    const sortDir = (order && order.toLowerCase() === 'asc') ? 'ASC' : 'DESC';

    const { whereClause, values, paramCount } = buildFiltersQuery(filters || req.query);

    try {
        // Get total count
        const countRes = await pool.query(`SELECT COUNT(*) FROM profiles ${whereClause}`, values);
        const total = parseInt(countRes.rows[0].count, 10);

        // Get paginated data
        const offset = (pageNum - 1) * limitNum;
        const querySQL = `
      SELECT id, name, gender, gender_probability, age, age_group, country_id, country_name, country_probability, created_at 
      FROM profiles 
      ${whereClause} 
      ORDER BY ${sortCol} ${sortDir} 
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

        const dataRes = await pool.query(querySQL, [...values, limitNum, offset]);

        return res.status(200).json({
            status: 'success',
            data: dataRes.rows,
            pagination: {
                total_count: total,
                current_page: pageNum,
                limit: limitNum,
                total_pages: Math.ceil(total / limitNum)
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
}

// ─── GET /api/profiles ─────────────────────────────────────────────────────────
app.get('/api/profiles', async (req, res) => {
    return await fetchFromDB(req, res, req.query);
});

// ─── GET /api/profiles/search ──────────────────────────────────────────────────
app.get('/api/profiles/search', async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim() === '') {
        return res.status(400).json({ status: 'error', message: 'Missing or empty parameter' });
    }

    const filters = parseQuery(q);
    if (!filters) {
        return res.status(400).json({ status: 'error', message: 'Unable to interpret query' });
    }

    return await fetchFromDB(req, res, filters);
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    return res.status(500).json({ status: 'error', message: 'Server failure' });
});

app.use((req, res) => {
    return res.status(404).json({ status: 'error', message: 'Profile not found' });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Insighta Labs API running on 0.0.0.0:${PORT}`);
});

module.exports = app;
