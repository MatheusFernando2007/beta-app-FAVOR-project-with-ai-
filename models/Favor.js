// models/Favor.js — um favor publicado por alguém
const mongoose = require('mongoose');

const favorSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, default: '', trim: true },
    location: { type: String, required: true, trim: true }, // cidade/bairro (usado para calcular distância)
    address: { type: String, default: '', trim: true },     // rua e número (usado no mapa)
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    status: { type: String, default: 'aberto' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Favor', favorSchema);
