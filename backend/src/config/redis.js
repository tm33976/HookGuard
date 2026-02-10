const IORedis = require('ioredis');

let redisConfig;

if (process.env.REDIS_URL) {
  // Production (Render + Upstash)
  // We parse the URL ourselves to pass it as an object to BullMQ
  // This is the safest way to ensure 'family: 4' is respected
  const connectionUrl = new URL(process.env.REDIS_URL);

  redisConfig = {
    host: connectionUrl.hostname,
    port: connectionUrl.port,
    username: connectionUrl.username,
    password: connectionUrl.password,
    maxRetriesPerRequest: null, // Required by BullMQ
    family: 4,                  // ⚠️ FORCE IPv4 to fix ETIMEDOUT on Render
    tls: {
      rejectUnauthorized: false // Accept Upstash self-signed certs
    }
  };
} else {
  // Local Development
  redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
  };
}

module.exports = redisConfig;