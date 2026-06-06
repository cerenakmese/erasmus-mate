const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool, initDb } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

initDb();

app.get('/health', (req, res) => {
    res.json({ status: 'Residence Permit Service is running' });
});

app.post('/api/residence-permits', async (req, res) => {
    try {
        const {
            student_id,
            country,
            application_status,
            appointment_date,
            submission_deadline,
            notes
        } = req.body;

        if (!student_id || !country || !submission_deadline) {
            return res.status(400).json({
                error: 'student_id, country and submission_deadline are required'
            });
        }

        const result = await pool.query(
            `INSERT INTO residence_permits 
            (student_id, country, application_status, appointment_date, submission_deadline, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                student_id,
                country,
                application_status || 'PENDING',
                appointment_date || null,
                submission_deadline,
                notes || null
            ]
        );

        res.status(201).json({
            message: 'Residence permit application created successfully',
            residence_permit: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating residence permit:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/residence-permits', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM residence_permits ORDER BY created_at DESC'
        );

        res.status(200).json({
            message: 'Residence permit applications retrieved successfully',
            residence_permits: result.rows
        });
    } catch (error) {
        console.error('Error getting residence permits:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/residence-permits/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        const result = await pool.query(
            'SELECT * FROM residence_permits WHERE student_id = $1 ORDER BY created_at DESC',
            [studentId]
        );

        res.status(200).json({
            message: 'Student residence permit applications retrieved successfully',
            residence_permits: result.rows
        });
    } catch (error) {
        console.error('Error getting student residence permits:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/residence-permits/upcoming-deadlines', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM residence_permits
             WHERE submission_deadline <= CURRENT_DATE + INTERVAL '30 days'
             ORDER BY submission_deadline ASC`
        );

        res.status(200).json({
            message: 'Residence permit deadlines within the next 30 days',
            residence_permits: result.rows
        });
    } catch (error) {
        console.error('Error getting upcoming deadlines:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Residence Permit Service running on port ${PORT}`);
});