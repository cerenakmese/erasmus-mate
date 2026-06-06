const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'Notification Service is running'
    });
});

app.post('/api/notifications', async (req, res) => {
    try {
        const { student_id, type, message } = req.body;

        if (!student_id || !type || !message) {
            return res.status(400).json({
                error: 'student_id, type and message are required'
            });
        }

        const result = await pool.query(
            `INSERT INTO notifications (student_id, type, message, status)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [student_id, type, message, 'UNREAD']
        );

        res.status(201).json({
            message: 'Notification created successfully',
            notification: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

app.get('/api/notifications', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM notifications ORDER BY created_at DESC'
        );

        res.status(200).json(result.rows);

    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

app.get('/api/notifications/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        const result = await pool.query(
            'SELECT * FROM notifications WHERE student_id = $1 ORDER BY created_at DESC',
            [studentId]
        );

        res.status(200).json(result.rows);

    } catch (error) {
        console.error('Error getting student notifications:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE notifications
             SET status = 'READ'
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Notification not found'
            });
        }

        res.status(200).json({
            message: 'Notification marked as read',
            notification: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
app.post('/api/notifications/document-expiration', async (req, res) => {
    try {
        const { student_id, document_name, expiration_date } = req.body;

        if (!student_id || !document_name || !expiration_date) {
            return res.status(400).json({
                error: 'student_id, document_name and expiration_date are required'
            });
        }

        const message = `Your document "${document_name}" is expiring on ${expiration_date}. Please renew it before the deadline.`;

        const result = await pool.query(
            `INSERT INTO notifications (student_id, type, message)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [student_id, 'DOCUMENT_EXPIRATION', message]
        );

        res.status(201).json({
            message: 'Document expiration notification created successfully',
            notification: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating document expiration notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});
