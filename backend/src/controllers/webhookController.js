const Task = require('../models/Task');
const { Queue } = require('bullmq');
// ✅ FIX 1: Import the config object
const redisConfig = require('../config/redis');

// ✅ FIX 2: Pass the config object directly (removes .connection)
const webhookQueue = new Queue('webhook-queue', { 
    connection: redisConfig 
});

// INGEST WEBHOOK
exports.ingestWebhook = async (req, res) => {
  try {
    // ✅ FIX 3: Destructure all fields (including retry/rateLimit)
    const { 
        targetUrl, 
        payload, 
        idempotencyKey, 
        security,          // Expecting whole object: { secret: "..." }
        deliveryMode,
        retryConfig,       // Don't lose this!
        rateLimitConfig    // Don't lose this!
    } = req.body;

    // Idempotency Check
    if (idempotencyKey) {
        const existingTask = await Task.findOne({ idempotencyKey });
        if (existingTask) {
          return res.status(409).json({ 
            error: 'Conflict: Task already exists', 
            taskId: existingTask._id, 
            status: existingTask.status 
          });
        }
    }

    // Create Task in DB
    const task = await Task.create({
      targetUrl,
      payload,
      idempotencyKey,
      security,        // Save the security object as-is
      deliveryMode: deliveryMode || 'at_least_once',
      retryConfig,     // ✅ Save retry settings
      rateLimitConfig, // ✅ Save rate limit settings
      status: 'PENDING'
    });

    // Add to Queue
    await webhookQueue.add('process-webhook', { taskId: task._id }, {
      removeOnComplete: true,
      removeOnFail: 100 // Keep last 100 failed jobs for debugging
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

// GET TASKS
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

// RETRY TASK
exports.retryTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Reset task state for a fresh attempt
    await task.updateOne({ 
      status: 'PENDING', 
      currentAttempt: 0, 
      errorMessage: null,
      nextRunAt: null,
      // We don't force 'at_least_once' here incase it was 'best_effort', 
      // but usually retries imply we want it to work now.
      status: 'PENDING' 
    });

    // Re-add to queue
    await webhookQueue.add('process-webhook', { taskId: task._id });

    res.json({ success: true, message: 'Task queued for retry' });
  } catch (error) {
    console.error('Retry Error:', error);
    res.status(500).json({ error: 'Retry failed' });
  }
};