const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const startGrpcServer = require('./grpc-server');

// Sağlık Kontrolü
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Student Profile Service is UP' });
});

// 1. ÖĞRENCİ KAYIT (REGISTER) UÇ NOKTASI
app.post('/api/students/register', async (req, res) => {
    try {
        const { first_name, last_name, email, password, home_university, host_university } = req.body;

        // E-posta kullanılıyor mu kontrol et
        const userExists = await pool.query('SELECT * FROM students WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Şifreyi şifrele (hash)
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Veritabanına kaydet
        const newUser = await pool.query(
            'INSERT INTO students (first_name, last_name, email, password_hash, home_university, host_university) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, first_name, last_name, email',
            [first_name, last_name, email, password_hash, home_university, host_university]
        );

        res.status(201).json({ message: 'User registered successfully', user: newUser.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


app.post('/api/students/login', async (req, res) => {
    try {
        const { email, password } = req.body;


        const user = await pool.query('SELECT * FROM students WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid Credentials' });
        }


        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid Credentials' });
        }

        const token = jwt.sign(
            { student_id: user.rows[0].id, email: user.rows[0].email },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: 'Login successful', token: token });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.listen(PORT, () => {
    console.log(`Student Profile Service (REST) running on port ${PORT}`);
    startGrpcServer();
});
