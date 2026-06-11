const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
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
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_erasmus_key_2026';

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

// JWT Verification Middleware for Socket.io
io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
        return next(new Error('Socket.io: Authentication token required'));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Socket.io: Invalid or expired token'));
        }

        // Token'dan student_id'yi al ve socket'e ekle
        socket.student_id = decoded.student_id;
        socket.user = decoded;
        next();
    });
});

io.on('connection', (socket) => {
    const studentId = socket.student_id?.toString();

    if (studentId) {
        socket.join(studentId);
        connectedStudents[studentId] = socket.id;
        console.log(`Socket authenticated and registered for student ${studentId}: ${socket.id}`);
    }

    socket.on('register_student', (registerData) => {
        // Only allow re-registration with same authenticated student
        if (socket.student_id?.toString() !== registerData?.toString()) {
            console.warn(`Attempted registration mismatch for socket ${socket.id}`);
            return;
        }
        console.log(`Socket explicit register for student ${socket.student_id}`);
    });

    socket.on('disconnect', () => {
        if (connectedStudents[studentId] === socket.id) {
            delete connectedStudents[studentId];
            console.log(`Socket disconnected for student ${studentId}: ${socket.id}`);
        }
    });
});

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: process.env.EMAIL_USER || 'danny.labadie69@ethereal.email',
        pass: process.env.EMAIL_PASS || 'spXcFHwXNV21TUh5aZ'
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
    const normalizedId = eventData.student_id?.toString();
    if (!normalizedId) {
        console.warn("Cannot trigger socket notification: missing student_id", eventData);
        return;
    }

    const studentSocketId = connectedStudents[normalizedId];
    if (studentSocketId) {
        const payload = {
            type: eventData.type,
            message: eventData.message,
            timestamp: new Date()
        };

        io.to(studentSocketId).emit('receive_notification', payload);

        console.log(`Emitted ${eventData.type} to student ${normalizedId} (socketId=${studentSocketId})`);
        return;
    }

    console.log(`No active socket found for student ${normalizedId}. Notification stored in DB only.`);
}

connectQueue();

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Notification Service with RabbitMQ & gRPC' });
});

server.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});