const IORedis = require('ioredis');

const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, {
      // Production (Render + Upstash)
      maxRetriesPerRequest: null,
      // ⚠️ FIX: Force IPv4 to prevent AggregateError/Timeout on Render
      family: 4, 
      tls: {
        rejectUnauthorized: false
      }
    })
  : new IORedis({
      // Local Development
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null,
    });

const redisConfig = {
  connection,
};

module.exports = redisConfig;