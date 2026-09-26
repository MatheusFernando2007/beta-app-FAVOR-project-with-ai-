const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const auth = require('../middleware/auth');
const { geocodeLocation } = require('../utils/geocode');

function gerarToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function dadosPublicosDoUsuario(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    location: user.location,
    photo: user.photo
  };
}

// Cadastro de um novo usuário
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, location, photo } = req.body;

    if (!name || !email || !password || !location) {
      return res.status(400).json({ error: 'Preencha nome, e-mail, senha e localidade.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
    }

    const emailNormalizado = email.toLowerCase().trim();

    // Garante que não existem dois cadastros com o mesmo e-mail.
    const emailJaExiste = await User.findOne({ email: emailNormalizado });
    if (emailJaExiste) {
      return res.status(400).json({ error: 'Já existe uma conta cadastrada com esse e-mail.' });
    }

    // Transforma a localidade digitada em coordenadas, para depois calcularmos distância.
    const geo = await geocodeLocation(location);
    if (!geo) {
      return res.status(400).json({
        error: 'Não conseguimos localizar essa cidade/bairro. Tente escrever de um jeito mais específico, como "São Mateus, São Paulo - SP".'
      });
    }

    const senhaCriptografada = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: emailNormalizado,
      password: senhaCriptografada,
      location,
      lat: geo.lat,
      lng: geo.lng,
      photo: photo || null
    });

    await user.save();

    const token = gerarToken(user._id);
    res.status(201).json({ token, user: dadosPublicosDoUsuario(user) });
  } catch (err) {
    // Se por acaso duas pessoas se cadastrarem no mesmíssimo instante com o
    // mesmo e-mail, o próprio banco de dados bloqueia (erro 11000) - aqui a
    // gente só transforma isso numa mensagem amigável.
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Já existe uma conta cadastrada com esse e-mail.' });
    }
    console.error('Erro no cadastro:', err);
    res.status(500).json({ error: 'Erro no servidor ao cadastrar. Tente novamente.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Preencha e-mail e senha.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ error: 'E-mail ou senha inválidos.' });
    }

    const senhaCorreta = await bcrypt.compare(password, user.password);
    if (!senhaCorreta) {
      return res.status(400).json({ error: 'E-mail ou senha inválidos.' });
    }

    const token = gerarToken(user._id);
    res.json({ token, user: dadosPublicosDoUsuario(user) });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro no servidor ao entrar. Tente novamente.' });
  }
});

// Retorna os dados do usuário logado (usado para manter o login ao recarregar a página)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(dadosPublicosDoUsuario(user));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

module.exports = router;
