const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios'); 
const { Queue } = require('bullmq');
const connectDB = require('./config/db');
const webhookRoutes = require('./routes/webhookRoutes');
const redisConfig = require('./config/redis'); 

const app = express();

app.set('trust proxy', 1);

// UPDATED: Dynamic CORS (Restricts access to your frontend only)
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

// ✅ UPDATED: Keep-Alive logic using Environment Variable
const PING_INTERVAL = 14 * 60 * 1000; 

function keepAlive() {
  // Uses the URL from your environment variables
  const selfUrl = `${process.env.BACKEND_URL}/health`;

  setInterval(async () => {
    try {
      console.log('📡 Keep-Alive: Pinging self...');
      const response = await axios.get(selfUrl);
      console.log(`✅ Keep-Alive Status: ${response.status}`);
    } catch (error) {
      console.error('⚠️ Keep-Alive Failed:', error.message);
    }
  }, PING_INTERVAL);
}

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  
  // Only ping if the URL is provided and we are in production
  if (process.env.NODE_ENV === 'production' && process.env.BACKEND_URL) {
    keepAlive();
  }
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});