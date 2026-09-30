// models/Conversation.js — conversa entre duas pessoas sobre um favor
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  offer: { type: Number, default: null }, // valor ofertado, quando a mensagem é uma proposta
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  favor: { type: mongoose.Schema.Types.ObjectId, ref: 'Favor', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  messages: [messageSchema],
  lastMessageAt: { type: Date, default: Date.now }
});

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
