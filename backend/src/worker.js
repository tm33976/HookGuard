require('dotenv').config();
const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto'); 
const Redis = require('ioredis');

// FIX: Changed '../' to './' because this file is in 'src/'
const connectDB = require('./config/db');
const redisConfig = require('./config/redis');
const Task = require('./models/Task');
const TaskAttempt = require('./models/TaskAttempt');

// 1. Connect Services
connectDB();
const redisClient = new Redis(redisConfig.connection);

console.log('🚀 Worker Service Started (v2.0 - Secure & Rate Limited)...');

const worker = new Worker('webhook-queue', async (job) => {
    const { taskId } = job.data;
    
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
        
        headers[task.security.signatureHeader] = `sha256=${signature}`;
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
        // 📨 FEATURE 3: DELIVERY MODES
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

            await job.moveToDelayed(Date.now() + delay);
            throw new Error(`Retry scheduled in ${delay}ms`);
        } else {
            await task.updateOne({ status: 'FAILED' });
            console.log(`[Job ${job.id}] 💀 Max attempts reached.`);
        }
    }
}, {
    connection: redisConfig.connection,
    concurrency: 5
});

worker.on('failed', (job, err) => {
    console.log(`[Job ${job.id}] moved to failed: ${err.message}`);
});

worker.on('error', (err) => {
    console.error('Worker Error:', err);
});