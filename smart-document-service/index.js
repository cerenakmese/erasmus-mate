const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

const detectDocumentType = (fileName, uploadedText) => {
    const text = `${fileName} ${uploadedText}`.toLowerCase();

    if (text.includes('insurance') || text.includes('health')) {
        return 'HEALTH_INSURANCE';
    }

    if (text.includes('passport')) {
        return 'PASSPORT';
    }

    if (text.includes('learning agreement')) {
        return 'LEARNING_AGREEMENT';
    }

    if (text.includes('acceptance') || text.includes('admission')) {
        return 'ACCEPTANCE_LETTER';
    }

    if (text.includes('visa')) {
        return 'VISA_DOCUMENT';
    }

    return 'UNKNOWN_DOCUMENT';
};

const extractExpirationDate = (uploadedText) => {
    const dateRegex = /\d{4}-\d{2}-\d{2}/;
    const match = uploadedText.match(dateRegex);

    if (match) {
        return match[0];
    }

    return null;
};

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'Smart Document Service is running'
    });
});

app.post('/api/documents', async (req, res) => {
    try {
        const { student_id, file_name, uploaded_text } = req.body;

        if (!student_id || !file_name) {
            return res.status(400).json({
                error: 'student_id and file_name are required'
            });
        }

        const detected_type = detectDocumentType(file_name, uploaded_text || '');
        const expiration_date = extractExpirationDate(uploaded_text || '');

        const result = await pool.query(
            `INSERT INTO documents 
            (student_id, file_name, uploaded_text, detected_type, expiration_date, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                student_id,
                file_name,
                uploaded_text,
                detected_type,
                expiration_date,
                'CLASSIFIED'
            ]
        );

        res.status(201).json({
            message: 'Document uploaded and classified successfully',
            document: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating document:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

app.get('/api/documents', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM documents ORDER BY id ASC');

        res.status(200).json(result.rows);

    } catch (error) {
        console.error('Error getting documents:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
app.get('/api/documents/expiring-soon', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM documents
             WHERE expiration_date IS NOT NULL
             AND expiration_date <= CURRENT_DATE + INTERVAL '90 days'
             ORDER BY expiration_date ASC`
        );

        res.status(200).json({
            message: 'Documents expiring within the next 90 days',
            documents: result.rows
        });

    } catch (error) {
        console.error('Error getting expiring documents:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Smart Document Service running on port ${PORT}`);
});
