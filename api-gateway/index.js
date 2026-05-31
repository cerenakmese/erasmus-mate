const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


app.get('/health', (req, res) => {
    res.status(200).json({ status: 'API Gateway is running and ready for Postman requests' });
});


app.listen(PORT, () => {
    console.log(`API Gateway is listening on port ${PORT}`);
});
