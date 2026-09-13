const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Queue } = require('bullmq');
const connectDB = require('./config/db');
const webhookRoutes = require('./routes/webhookRoutes');
const redisConfig = require('./config/redis');

const app = express();

app.set('trust proxy', 1);

// Dynamic CORS (Restricts access to your frontend or allows all if unset)
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({ 
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Database Connection
connectDB();

// Initialize Queue with Config Object
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