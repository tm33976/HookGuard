const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  targetUrl: { 
    type: String, 
    required: true 
  },
  payload: { 
    type: Object, 
    required: true 
  },
  idempotencyKey: { 
    type: String, 
    unique: true, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRY_SCHEDULED'], 
    default: 'PENDING' 
  },
  
  
  //Security (Signature Verification)
  security: {
    secret: { type: String, select: false }, 
    signatureHeader: { type: String, default: 'X-HookGuard-Signature' }
  },

  // Delivery Semantics
  deliveryMode: {
    type: String,
    enum: ['at_least_once', 'best_effort'],
    default: 'at_least_once' 
  },

  // 3. Operational Safety
  rateLimitConfig: {
    enabled: { type: Boolean, default: true },
    maxPerMinute: { type: Number, default: 60 } 
  },


  retryConfig: {
    maxAttempts: { type: Number, default: 5 },
    baseDelay: { type: Number, default: 1000 },
    backoffFactor: { type: Number, default: 2 }
  },
  currentAttempt: { type: Number, default: 0 },
  nextRunAt: { type: Date },
  errorMessage: { type: String }
}, { timestamps: true });

// Create Index for fast lookups
TaskSchema.index({ idempotencyKey: 1 });
TaskSchema.index({ status: 1 });

module.exports = mongoose.model('Task', TaskSchema);