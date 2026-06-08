const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const path = require('path');
const pool = require('./db');
// --- YENİ EKLENEN gRPC KÜTÜPHANELERİ ---
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// --- gRPC İSTEMCİ (CLIENT) AYARLARI ---
const PROTO_PATH = path.join(__dirname, 'student.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String, // ÇOK KRİTİK: int64 (long long) taşmalarını önlemek için string olarak alıyoruz
    enums: String,
    defaults: true,
    oneofs: true
});
const studentProto = grpc.loadPackageDefinition(packageDefinition).student;

// docker-compose içindeki student profile servisinin adı ve portu (örnek: student-profile:50052)
const grpcTarget = process.env.GRPC_STUDENT_TARGET || 'localhost:50052';
const studentClient = new studentProto.StudentService(
    grpcTarget,
    grpc.credentials.createInsecure()
);

const connectedStudents = {};

io.on('connection', (socket) => {
    socket.on('register_student', (studentId) => {
        connectedStudents[studentId] = socket.id;
    });
    socket.on('disconnect', () => {
        for (let id in connectedStudents) {
            if (connectedStudents[id] === socket.id) {
                delete connectedStudents[id];
                break;
            }
        }
    });
});

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: process.env.EMAIL_USER || 'joel.kertzmann@ethereal.email',
        pass: process.env.EMAIL_PASSWORD || 'mP6hKwF7F3x8T2Qy9s'
    }
});

async function connectQueue() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
        const channel = await connection.createChannel();
        const queue = 'notification_queue';
        await channel.assertQueue(queue, { durable: true });

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const eventData = JSON.parse(msg.content.toString());

                try {
                    // 1. Veritabanına kaydet
                    await pool.query(
                        `INSERT INTO notifications (student_id, type, message, status) VALUES ($1, $2, $3, $4)`,
                        [eventData.student_id, eventData.type, eventData.message, 'UNREAD']
                    );

                    // 2. gRPC İLE ÖĞRENCİ BİLGİLERİNİ ÇEK
                    // ID'yi kesin olarak string formatına çevirerek yolluyoruz
                    const studentIdStr = eventData.student_id.toString();

                    studentClient.getStudentProfile({ student_id: studentIdStr }, (err, response) => {
                        if (err) {
                            console.error("gRPC Error fetching student profile:", err);
                            // Profil bulunamasa bile Socket.io bildirimini atmaya devam edebiliriz
                            triggerSocketNotification(eventData);
                            channel.ack(msg);
                            return;
                        }

                        console.log(`gRPC Success: Fetched email ${response.email} for student ${response.id}`);

                        // 3. GERÇEK E-POSTAYA GÖNDERİM
                        transporter.sendMail({
                            from: '"ErasmusMate System" <noreply@erasmusmate.com>',
                            to: response.email, // Artık doğrudan öğrencinin kendi profiline kayıtlı maile gidiyor!
                            subject: `New Notification: ${eventData.type}`,
                            text: eventData.message
                        }).catch(console.error);

                        triggerSocketNotification(eventData);
                        channel.ack(msg);
                    });

                } catch (err) {
                    console.error("Error processing message:", err);
                    channel.nack(msg);
                }
            }
        });
    } catch (error) {
        setTimeout(connectQueue, 5000);
    }
}

// Ekran bildirimini fırlatan yardımcı fonksiyon
function triggerSocketNotification(eventData) {
    const studentSocketId = connectedStudents[eventData.student_id];
    if (studentSocketId) {
        io.to(studentSocketId).emit('receive_notification', {
            type: eventData.type,
            message: eventData.message,
            timestamp: new Date()
        });
    }
}

connectQueue();

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Notification Service with RabbitMQ & gRPC' });
});

server.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});