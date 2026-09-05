const Task = require('../models/Task');
const { Queue } = require('bullmq');
const redisConfig = require('../config/redis');

const webhookQueue = new Queue('webhook-queue', { 
  connection: redisConfig 
});

// INGEST WEBHOOK
exports.ingestWebhook = async (req, res) => {
  try {
    const { 
      targetUrl, 
      payload, 
      idempotencyKey, 
      secret,
      security,
      deliveryMode,
      retryConfig,
      rateLimitConfig 
    } = req.body;

    if (!targetUrl || !payload) {
      return res.status(400).json({ error: 'targetUrl and payload are required fields.' });
    }

    // Idempotency Check: if key exists, return existing task gracefully (200 OK) without duplicating
    if (idempotencyKey) {
      const existingTask = await Task.findOne({ idempotencyKey });
      if (existingTask) {
        return res.status(200).json({ 
          success: true,
          isDuplicate: true,
          message: 'Task already exists (Idempotent)', 
          taskId: existingTask._id, 
          status: existingTask.status 
        });
      }
    }

    // Prepare security config object
    const finalSecurity = security || (secret ? { secret } : undefined);

    // Create Task in DB
    const task = await Task.create({
      targetUrl,
      payload,
      idempotencyKey,
      security: finalSecurity,
      deliveryMode: deliveryMode || 'at_least_once',
      retryConfig,
      rateLimitConfig,
      status: 'PENDING'
    });

    // Add to Queue
    await webhookQueue.add('process-webhook', { taskId: task._id }, {
      removeOnComplete: true,
      removeOnFail: 100
    });

    return res.status(202).json({
      success: true,
      taskId: task._id,
      status: 'PENDING',
      message: 'Webhook received and queued.'
    });

  } catch (error) {
    console.error('Ingest Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET TASKS
exports.getTasks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const tasks = await Task.find().sort({ updatedAt: -1 }).limit(limit); 
    return res.json({ tasks });
  } catch (error) {
    console.error('Fetch Error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// RETRY TASK
exports.retryTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.updateOne({ 
      status: 'PENDING', 
      currentAttempt: 0, 
      errorMessage: null,
      nextRunAt: null 
    });

    await webhookQueue.add('process-webhook', { taskId: task._id });

    return res.json({ success: true, message: 'Task queued for retry' });
  } catch (error) {
    console.error('Retry Error:', error);
    return res.status(500).json({ error: 'Retry failed' });
  }
};