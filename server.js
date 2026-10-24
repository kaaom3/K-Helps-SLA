require('dotenv').config();
const express = require('express');
const path = require('path');
const dbHandler = require('./api/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Increase payload limit for batch uploads
app.use(express.json({ limit: '25mb' }));

// Mount Vercel Serverless Handler at /api/db
app.all('/api/db', (req, res) => dbHandler(req, res));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 K-Helps SLA Analytics Server running at http://localhost:${PORT}`);
    if (process.env.MONGODB_URI) {
        console.log(`🟢 MongoDB URI configured (Database: ${process.env.MONGODB_DB || 'khelps_sla_db'})`);
    } else {
        console.log(`🟡 MONGODB_URI not set in .env — Frontend will use Local IndexedDB fallback`);
    }
});
