const express = require('express');
const axios = require('axios');
const amqp = require('amqplib');
require('dotenv').config();
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(require('cors')());

// --- RABBITMQ BAĞLANTISI ---
let amqpChannel = null;

async function connectRabbitMQ() {
    try {
        // docker-compose.yml içindeki rabbitmq servisine bağlanıyoruz
        const amqpUrl = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
        const connection = await amqp.connect(amqpUrl);
        amqpChannel = await connection.createChannel();
        await amqpChannel.assertQueue('notification_queue', { durable: true });
        console.log("Chatting Service connected to RabbitMQ (notification_queue)");
    } catch (error) {
        console.error("RabbitMQ connection error:", error.message);
        // Bağlantı koparsa veya RabbitMQ henüz hazır değilse 5 saniye sonra tekrar dene
        setTimeout(connectRabbitMQ, 5000);
    }
}
connectRabbitMQ();


/* 1 - List Students (GET) */
app.get('/students', async (req, res) => {
    try {
        const response = await axios.get('http://api-gateway:3000/api/students');
        const students = response.data.map(student => ({
            studentId: student.student_id,
            name: student.first_name,
            surname: student.last_name
        }));
        res.json(students);
    } catch (error) {
        console.error("Failed to fetch student data:", error.message);
        res.status(500).json({ error: "An error occurred while fetching students." });
    }
});

/* 2 - Send Message (POST) & Trigger Notification */
app.post('/messages', async (req, res) => {
    try {
        const senderId = req.headers['x-user-id'];
        const { receiverId, content } = req.body;

        if (!senderId) {
            return res.status(401).json({ error: "Unauthorized: Sender ID not found." });
        }


        const result = await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *',
            [senderId, receiverId, content]
        );
        const newMessage = result.rows[0];


        if (amqpChannel) {
            const notificationData = {
                student_id: receiverId.toString(),
                type: 'NEW_CHAT_MESSAGE',
                message: `You have a new message (Sender: ${senderId}): ${content}`
            };

            // Mesajı kuyruğa fırlat
            amqpChannel.sendToQueue(
                'notification_queue',
                Buffer.from(JSON.stringify(notificationData))
            );
            console.log(`Notification sent to RabbitMQ for student: ${receiverId}`);
        }

        res.status(201).json({ success: true, data: newMessage });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

/* 3 - Get Received Messages (GET) */
app.get('/messages', async (req, res) => {
    try {
        const myStudentId = req.headers['x-user-id'];

        if (!myStudentId) {
            return res.status(401).json({ error: "Unauthorized: Student ID not found." });
        }

        const result = await pool.query(
            'SELECT * FROM messages WHERE receiver_id = $1 ORDER BY timestamp DESC',
            [myStudentId]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
    console.log(`Chatting Service is running on port ${PORT}.`);
});