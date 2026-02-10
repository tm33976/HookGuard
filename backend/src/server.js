require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

// --- 1. Trust Proxy (REQUIRED for Render) ---
// This ensures the app trusts the "X-Forwarded-For" header from Render's load balancer,
// so you can correctly detect the user's real IP address.
app.set('trust proxy', 1);

// --- 2. CORS (Required for Vercel) ---
// This allows your Frontend (on Vercel) to talk to this Backend (on Render).
app.use(cors({ origin: '*' }));

// --- 3. Increased Payload Limit (Required for Heavy Tests) ---
// This prevents "413 Payload Too Large" errors when testing with >100kb data.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- 4. Database Connection ---
connectDB();

// --- 5. Routes ---
app.use('/api/v1', webhookRoutes);

// --- 6. Health Check (Useful for Render auto-deploy checks) ---
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

// --- 7. Start Server ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
});

// --- 8. Graceful Shutdown ---
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});