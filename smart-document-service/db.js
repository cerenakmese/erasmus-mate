const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const initDb = async () => {
    const queryText = `
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        uploaded_text TEXT,
        detected_type VARCHAR(100),
        expiration_date DATE,
        status VARCHAR(50) DEFAULT 'UPLOADED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
        await pool.query(queryText);
        console.log("Smart Document database tables initialized successfully.");
    } catch (err) {
        console.error("Error initializing smart document tables:", err);
    }
};

initDb();

module.exports = pool;
