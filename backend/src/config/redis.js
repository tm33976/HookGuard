const IORedis = require('ioredis');

let redisConfig;

if (process.env.REDIS_URL) {
  const connectionUrl = new URL(process.env.REDIS_URL);
  const isTls = connectionUrl.protocol === 'rediss:';

  redisConfig = {
    host: connectionUrl.hostname,
    port: Number(connectionUrl.port) || 6379,
    username: connectionUrl.username || undefined,
    password: connectionUrl.password || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    family: 4,                  // Force IPv4
    ...(isTls && {
      tls: {
        rejectUnauthorized: false
      }
    })
  };
} else {
  // Local Development
  redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
  };
}

module.exports = redisConfig;