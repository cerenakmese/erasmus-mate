const express = require('express');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_erasmus_key_2026';

const verifyToken = (req, res, next) => {
    if (req.path.startsWith('/api/students/login') || req.path.startsWith('/api/students/register')) {
        return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'API Gateway: Erişim reddedildi. Token bulunamadı.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'API Gateway: Geçersiz veya süresi dolmuş token.' });
        }

        req.user = user;

        req.headers['x-user-id'] = user.student_id;

        next();
    });
};

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'API Gateway is running and secured with JWT' });
});

app.use('/api', verifyToken);

app.use('/api/students', createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
}));

app.use('/api/travel', createProxyMiddleware({
    target: 'http://localhost:3004',
    changeOrigin: true,
}));


app.listen(PORT, () => {
    console.log(`API Gateway is listening on port ${PORT}`);
    console.log(`Routing /api/students traffic to http://localhost:3001`);
});
