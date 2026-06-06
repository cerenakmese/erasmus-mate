const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS residence_permits (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL,
                country VARCHAR(100) NOT NULL,
                application_status VARCHAR(50) DEFAULT 'PENDING',
                appointment_date DATE,
                submission_deadline DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Residence Permit database tables initialized successfully.');
    } catch (error) {
        console.error('Error initializing Residence Permit database:', error);
    }
};

module.exports = { pool, initDb };