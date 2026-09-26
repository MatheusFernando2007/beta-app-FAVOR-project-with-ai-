const mongoose = require('mongoose');

// Cada usuário tem e-mail único (o "unique: true" cria uma trava no próprio
// banco de dados, então nem numa corrida de dois cadastros ao mesmo tempo
// dá pra duplicar um e-mail).
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true // sempre guardamos a senha já criptografada (hash), nunca em texto puro
  },
  location: {
    type: String,
    required: true // texto digitado pelo usuário, ex: "São Mateus, São Paulo - SP"
  },
  lat: Number,
  lng: Number,
  photo: {
    type: String, // imagem em base64 (já redimensionada no navegador antes de enviar)
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
