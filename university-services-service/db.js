const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'admin',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'university_service_db',
    password: process.env.DB_PASSWORD || 'adminpassword',
    port: process.env.DB_PORT || 5432,
});

async function initDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('University database tables initialized successfully.');
    } catch (err) {
        console.error('Error initializing university tables:', err);
    }
}

initDb();

module.exports = pool;
