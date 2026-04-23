// Use Node 22's built-in SQLite module — no native compilation required
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'profiles.db');
const db = new DatabaseSync(DB_PATH);

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    gender TEXT,
    gender_probability REAL,
    sample_size INTEGER,
    age INTEGER,
    age_group TEXT,
    country_id TEXT,
    country_probability REAL,
    created_at TEXT NOT NULL
  )
`);

// Create indexes for common filter fields
db.exec(`CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles (name)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles (gender)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles (country_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_profiles_age_group ON profiles (age_group)`);

module.exports = db;
