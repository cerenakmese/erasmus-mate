const express = require('express');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3004;


app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Travel Planning Service is UP' });
});


app.post('/trips', async (req, res) => {
    try {

        const student_id = req.headers['x-user-id'];

        if (!student_id) {
            return res.status(401).json({ error: 'Unauthorized: Student ID missing' });
        }

        const { destination, departure_date, return_date } = req.body;

        const newTrip = await pool.query(
            'INSERT INTO trips (student_id, destination, departure_date, return_date) VALUES ($1, $2, $3, $4) RETURNING *',
            [student_id, destination, departure_date, return_date]
        );

        res.status(201).json({ message: 'Trip added successfully', trip: newTrip.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.get('/trips', async (req, res) => {
    try {
        const student_id = req.headers['x-user-id'];

        if (!student_id) {
            return res.status(401).json({ error: 'Unauthorized: Student ID missing' });
        }

        const trips = await pool.query(
            'SELECT * FROM trips WHERE student_id = $1 ORDER BY departure_date ASC',
            [student_id]
        );

        res.status(200).json(trips.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.listen(PORT, () => {
    console.log(`Travel Planning Service running on port ${PORT}`);
});
