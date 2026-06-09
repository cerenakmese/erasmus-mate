const express = require('express');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_erasmus_key_2026';

const verifyToken = (req, res, next) => {
    if (req.path.startsWith('/students/login') || req.path.startsWith('/students/register')) {
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

const STUDENT_URL = process.env.STUDENT_URL || 'http://student-profile-service:3001';
const TRAVEL_URL = process.env.TRAVEL_URL || 'http://travel-planning-service:3004';
const DOCUMENT_URL = process.env.DOCUMENT_URL || 'http://smart-document-service:3003';
const NOTIFICATION_URL = process.env.NOTIFICATION_URL || 'http://notification-service:3005';
const RESIDENCE_URL = process.env.RESIDENCE_URL || 'http://residence-permit-service:3002';
const UNIVERSITY_URL = process.env.UNIVERSITY_URL || 'http://university-services-service:3006';

app.use('/api/students', createProxyMiddleware({
    target: STUDENT_URL,
    changeOrigin: true,
    // No pathRewrite: student routes are at /api/students/... which matches
}));

app.use('/api/travel', createProxyMiddleware({
    target: TRAVEL_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/travel': '' }, // Travel routes are /trips, /health (no /api/travel prefix)
}));

app.use('/api/documents', createProxyMiddleware({
    target: DOCUMENT_URL,
    changeOrigin: true,
    // No pathRewrite: document routes are at /api/documents/... which matches
}));

app.use('/api/notifications', createProxyMiddleware({
    target: NOTIFICATION_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/notifications': '' }, // Notification routes are /health (no /api/notifications prefix)
}));

app.use('/api/residence-permits', createProxyMiddleware({
    target: RESIDENCE_URL,
    changeOrigin: true,
    // No pathRewrite: residence routes are at /api/residence-permits which matches
}));

app.use('/api/university', createProxyMiddleware({
    target: UNIVERSITY_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
        return '/api/university' + path;
    }
}));


app.listen(PORT, () => {
    console.log(`API Gateway is listening on port ${PORT}`);
    console.log(`Routing traffic using Docker container names`);
});
