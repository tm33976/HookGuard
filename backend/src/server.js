require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Queue } = require('bullmq');
const connectDB = require('./config/db');
const webhookRoutes = require('./routes/webhookRoutes');
const { connection } = require('./config/redis'); // Import shared Redis connection

const app = express();

// Trust Proxy (Required for Render)
app.set('trust proxy', 1);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Database Connection
connectDB();

// Initialize Queue with Shared Connection
const myQueue = new Queue('webhook-queue', {
    connection: connection
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