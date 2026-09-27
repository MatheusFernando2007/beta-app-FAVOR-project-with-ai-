// lib/db.js — conecta ao MongoDB usando Mongoose
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI não está definida nas variáveis de ambiente.');
  }
  await mongoose.connect(uri);
  console.log('✅ Conectado ao MongoDB');
}

module.exports = connectDB;
  
