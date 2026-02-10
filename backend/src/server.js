// ⚠️ GLOBAL FIX: Force Node.js to use IPv4 first (Fixes Render ETIMEDOUT)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Queue } = require('bullmq');
const connectDB = require('./config/db');
const webhookRoutes = require('./routes/webhookRoutes');

// ✅ FIX: Import the config object (not the connection instance)
const redisConfig = require('./config/redis'); 

const app = express();

// Trust Proxy (Required for Render)
app.set('trust proxy', 1);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Database Connection
connectDB();

// Initialize Queue with Config Object
// BullMQ will now create its own managed connection using the IPv4 settings
const myQueue = new Queue('webhook-queue', {
    connection: redisConfig 
});

// Routes
app.use('/api/v1', webhookRoutes);

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});