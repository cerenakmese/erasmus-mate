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
      CREATE TABLE IF NOT EXISTS trips (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        destination VARCHAR(255) NOT NULL,
        departure_date DATE NOT NULL,
        return_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    try {
        await pool.query(queryText);
        console.log("Travel database tables initialized successfully.");
    } catch (err) {
        console.error("Error initializing travel tables:", err);
    }
};

initDb();

module.exports = pool;
