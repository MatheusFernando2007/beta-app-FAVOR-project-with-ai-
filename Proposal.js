const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  favor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Favor',
    required: true
  },
  proposedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pendente', 'aceita', 'recusada'],
    default: 'pendente'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Proposal', proposalSchema);
