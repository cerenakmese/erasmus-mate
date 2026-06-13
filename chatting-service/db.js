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
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id VARCHAR(50) NOT NULL,
        receiver_id VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    try {
        await pool.query(queryText);
        console.log("Chatting Database tables initialized successfully.");
    } catch (err) {
        console.error("Error initializing database tables:", err);
    }
};

initDb();

module.exports = pool;