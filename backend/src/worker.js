// ⚠️ GLOBAL FIX: Force Node.js to use IPv4 first (Fixes Render ETIMEDOUT)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const IORedis = require('ioredis');

// ✅ FIX: Import the config object (not the connection instance)
const redisConfig = require('./config/redis');

// Models
const Task = require('./models/Task');
const TaskAttempt = require('./models/TaskAttempt');

// Connect to MongoDB
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('✅ Worker connected to MongoDB'))
        .catch(err => console.error('❌ Worker MongoDB Error:', err));
}

console.log('🚀 Worker Service Started (v2.0 - Secure & Rate Limited)...');

// ✅ FIX: Create a dedicated Redis client for Rate Limiting using the shared config
const redisClient = new IORedis(redisConfig);

const worker = new Worker('webhook-queue', async (job) => {
    const { taskId } = job.data;
    
    // Fetch Task + Secret
    const task = await Task.findById(taskId).select('+security.secret');
    
    if (!task) {
        console.error(`Task ${taskId} not found`);
        return;
    }

    console.log(`[Job ${job.id}] Picking up task: ${taskId}`);

    // =================================================================
    // 🛡️ FEATURE 1: PER-ENDPOINT RATE LIMITING
    // =================================================================
    if (task.rateLimitConfig && task.rateLimitConfig.enabled) {
        try {
            const url = new URL(task.targetUrl);
            const hostname = url.hostname;
            const rateKey = `rate_limit:${hostname}`;

            const currentUsage = await redisClient.incr(rateKey);
            
            if (currentUsage === 1) {
                await redisClient.expire(rateKey, 60);
            }

            if (currentUsage > task.rateLimitConfig.maxPerMinute) {
                console.warn(`[Job ${job.id}] ⚠️ Throttled: ${hostname} (${currentUsage}/60). Rescheduling...`);
                await job.moveToDelayed(Date.now() + 30000, job.token);
                return; 
            }
        } catch (err) {
            console.error('Rate Limit Check Failed:', err.message);
        }
    }

    // =================================================================
    // 🔐 FEATURE 2: HMAC SIGNATURE GENERATION
    // =================================================================
    const headers = { 
        'Content-Type': 'application/json',
        'User-Agent': 'HookGuard-Worker/2.0'
    };

    if (task.security && task.security.secret) {
        const payloadString = JSON.stringify(task.payload);
        const signature = crypto
            .createHmac('sha256', task.security.secret)
            .update(payloadString)
            .digest('hex');
        
        headers[task.security.signatureHeader || 'X-Hub-Signature-256'] = `sha256=${signature}`;
        console.log(`[Job ${job.id}] 🔐 Signed Request with HMAC-SHA256`);
    }

    // =================================================================
    // 🚀 EXECUTION
    // =================================================================
    const start = Date.now();
    
    try {
        await task.updateOne({ 
            status: 'PROCESSING',
            $inc: { currentAttempt: 1 }
        });

        const response = await axios.post(task.targetUrl, task.payload, { 
            headers,
            timeout: 5000 
        });

        const duration = Date.now() - start;

        await TaskAttempt.create({
            taskId: task._id,
            status: 'SUCCESS',
            httpCode: response.status,
            durationMs: duration
        });

        await task.updateOne({ status: 'COMPLETED' });
        console.log(`[Job ${job.id}] ✅ Success: ${duration}ms`);

    } catch (error) {
        const duration = Date.now() - start;
        const errorMsg = error.response ? `HTTP ${error.response.status}` : error.message;

        console.error(`[Job ${job.id}] ❌ Failed: ${errorMsg}`);

        await TaskAttempt.create({
            taskId: task._id,
            status: 'FAILURE',
            httpCode: error.response?.status || 0,
            errorMessage: errorMsg,
            durationMs: duration
        });

        // =================================================================
        // 📨 FEATURE 3: DELIVERY MODES & RETRY LOGIC
        // =================================================================
        
        if (task.deliveryMode === 'best_effort') {
            console.log(`[Job ${job.id}] ⏹️ Best Effort Mode: Dropping task.`);
            await task.updateOne({ 
                status: 'FAILED',
                errorMessage: 'Best Effort: Failed (No Retry)' 
            });
            return;
        }

        if (task.currentAttempt < task.retryConfig.maxAttempts) {
            const delay = task.retryConfig.baseDelay * Math.pow(task.retryConfig.backoffFactor, task.currentAttempt);
            
            await task.updateOne({ 
                status: 'RETRY_SCHEDULED',
                nextRunAt: new Date(Date.now() + delay)
            });

            console.log(`[Job ${job.id}] 🔄 Retry scheduled in ${delay}ms`);
            await job.moveToDelayed(Date.now() + delay, job.token);
        } else {
            await task.updateOne({ status: 'FAILED' });
            console.log(`[Job ${job.id}] 💀 Max attempts reached.`);
        }
    }
}, {
    connection: redisConfig, // ✅ FIX: Use the shared config object
    concurrency: 5
});

worker.on('failed', (job, err) => {
    console.log(`[Job ${job.id || 'unknown'}] moved to failed: ${err.message}`);
});

worker.on('error', (err) => {
    console.error('Worker Error:', err);
});