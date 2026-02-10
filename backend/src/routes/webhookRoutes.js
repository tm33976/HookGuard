const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.post('/ingest', webhookController.ingestWebhook);
router.get('/tasks', webhookController.getTasks);
router.post('/tasks/:id/retry', webhookController.retryTask);

module.exports = router;