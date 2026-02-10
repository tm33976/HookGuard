const IORedis = require('ioredis');

// Logic: Use REDIS_URL if available (Render), otherwise localhost (Docker)
const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, {
      // Production (Render + Upstash)
      maxRetriesPerRequest: null, // Required by BullMQ
      family: 4,                  // ⚠️ FORCE IPv4 to fix ETIMEDOUT on Render
      tls: {
        rejectUnauthorized: false // Accept Upstash self-signed certs
      }
    })
  : new IORedis({
      // Local Development
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null,
    });

// Export the singleton connection
module.exports = { connection };