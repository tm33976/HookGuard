const IORedis = require('ioredis');

// Create the Redis connection based on the environment
const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, {
      // Production (Render + Upstash)
      maxRetriesPerRequest: null, 
    
      tls: {
        rejectUnauthorized: false
      }
    })
  : new IORedis({
      // Local Development (Docker)
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null,
    });

const redisConfig = {
  connection,
};

module.exports = redisConfig;