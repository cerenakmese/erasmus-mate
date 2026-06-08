const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const pool = require('./db');
const http = require('http');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3006;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const STUDENT_API_URL = process.env.STUDENT_API_URL || 'http://student-profile-service:3001/api/students';

let amqpChannel = null;

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        amqpChannel = await connection.createChannel();
        await amqpChannel.assertQueue('notification_queue', { durable: true });
        console.log("Connected to RabbitMQ in University Service");
    } catch (error) {
        console.error("RabbitMQ connection error in University Service:", error);
        setTimeout(connectRabbitMQ, 5000);
    }
}

connectRabbitMQ();

// GET all announcements
app.get('/api/university/announcements', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new announcement
app.post('/api/university/announcements', async (req, res) => {
    const { title, content } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO announcements (title, content) VALUES ($1, $2) RETURNING *',
            [title, content]
        );
        const newAnnouncement = result.rows[0];

        // Fetch all active students via REST call to student-profile-service
        try {
            const fetch = (await import('node-fetch')).default; // Use dynamic import for fetch
            const studentRes = await fetch(STUDENT_API_URL);
            
            if (studentRes.ok) {
                const students = await studentRes.json();
                
                // Publish a notification event for each student
                if (amqpChannel) {
                    students.forEach(student => {
                        const eventData = {
                            student_id: student.id,
                            type: "NewAnnouncementPosted",
                            message: `A new announcement "${title}" has been posted: ${content}`
                        };
                        amqpChannel.sendToQueue(
                            'notification_queue',
                            Buffer.from(JSON.stringify(eventData)),
                            { persistent: true }
                        );
                    });
                    console.log(`Published NewAnnouncementPosted to RabbitMQ for ${students.length} students.`);
                }
            } else {
                console.error("Failed to fetch students from student-profile-service");
            }
        } catch (fetchErr) {
            console.error("Error communicating with student-profile-service:", fetchErr);
        }

        res.status(201).json(newAnnouncement);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'University Services running' });
});

app.listen(PORT, () => {
    console.log(`University Services running on port ${PORT}`);
});
