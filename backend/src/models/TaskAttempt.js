const mongoose = require('mongoose');

const TaskAttemptSchema = new mongoose.Schema({
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task', 
    required: true,
    index: true 
  },
  
  status: { 
    type: String, 
    enum: ['SUCCESS', 'FAILURE'], 
    required: true 
  },
  
  // Debugging details
  httpCode: { type: Number },
  errorMessage: { type: String }, 
  durationMs: { type: Number }, 
  startedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TaskAttempt', TaskAttemptSchema);