const Task = require('../models/Task');
const { Queue } = require('bullmq');
const redisConfig = require('../config/redis');


const webhookQueue = new Queue('webhook-queue', { connection: redisConfig.connection });

//INGEST WEBHOOK
exports.ingestWebhook = async (req, res) => {
  try {
    const { targetUrl, payload, idempotencyKey, secret, deliveryMode } = req.body;

    const existingTask = await Task.findOne({ idempotencyKey });
    if (existingTask) {
      return res.status(409).json({ 
        error: 'Conflict: Task already exists', 
        taskId: existingTask._id, 
        status: existingTask.status 
      });
    }

    const task = await Task.create({
      targetUrl,
      payload,
      idempotencyKey,
      security: secret ? { secret } : undefined,
      deliveryMode: deliveryMode || 'at_least_once'
    });

    await webhookQueue.add('process-webhook', { taskId: task._id }, {
      removeOnComplete: true,
      removeOnFail: true
    });

    res.status(202).json({
      success: true,
      taskId: task._id,
      status: 'PENDING',
      message: 'Webhook received and queued.'
    });
  } catch (error) {
    console.error('Ingest Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

//GET TASKS
exports.getTasks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const tasks = await Task.find().sort({ updatedAt: -1 }).limit(limit); 
    res.json({ tasks });
  } catch (error) {
    console.error('Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// RETRY TASK (Updated Logic)
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
      nextRunAt: null,
      deliveryMode: 'at_least_once'
    });

    await webhookQueue.add('process-webhook', { taskId: task._id });

    res.json({ success: true, message: 'Task queued for retry' });
  } catch (error) {
    console.error('Retry Error:', error);
    res.status(500).json({ error: 'Retry failed' });
  }
};