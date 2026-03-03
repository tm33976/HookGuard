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

// Middleware
app.use(cors({ origin: '*' }));
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

//  KEEP ALIVE LOGIC FOR RENDER FREE TIER 
const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes
// Use the health check or tasks endpoint
const SELF_URL = `https://hookguard-558f.onrender.com/health`; 

function keepAlive() {
  setInterval(async () => {
    try {
      console.log('📡 Keep-Alive: Pinging self to prevent Render sleep...');
      const response = await axios.get(SELF_URL);
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
  
  // ✅ Trigger Keep-Alive only in production
  if (process.env.NODE_ENV === 'production') {
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