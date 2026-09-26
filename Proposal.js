// models/Proposal.js — Proposta de ajuda enviada para um favor publicado

const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
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
      default: ''
    },
    status: {
      type: String,
      enum: ['pendente', 'aceita', 'recusada'],
      default: 'pendente'
    }
  },
  { timestamps: true } // cria createdAt e updatedAt automaticamente
);

module.exports = mongoose.model('Proposal', proposalSchema);
