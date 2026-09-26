const mongoose = require('mongoose');

const favorSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  location: {
    type: String,
    required: true // onde o favor precisa ser feito (pode ser diferente da cidade do usuário)
  },
  lat: Number,
  lng: Number,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['aberto', 'em_andamento', 'concluido'],
    default: 'aberto'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Favor', favorSchema);
