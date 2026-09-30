// routes/favors.js — criar e listar favores
const express = require('express');
const router = express.Router();

const Favor = require('../models/Favor');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { geocodeLocation } = require('../utils/geocode');
const { calculateDistance } = require('../utils/distance');

// Criar um novo favor (precisa estar logado)
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, price, location, address, category } = req.body;
    const priceNum = Number(price);

    if (!title || !description || !priceNum || !location) {
      return res.status(400).json({ error: 'Preencha título, descrição, preço e localidade.' });
    }

    const geo = await geocodeLocation(location);
    if (!geo) {
      return res.status(400).json({
        error: 'Não conseguimos localizar essa cidade/bairro. Tente ser mais específico, como "Santo André, SP".'
      });
    }

    const favor = new Favor({
      title: title.trim(),
      description: description.trim(),
      price: priceNum,
      category: String(category || '').trim(),
      location: location.trim(),
      address: String(address || '').trim(),
      lat: geo.lat,
      lng: geo.lng,
      createdBy: req.userId
    });

    await favor.save();
    res.status(201).json(favor);
  } catch (err) {
    console.error('Erro ao criar favor:', err);
    res.status(500).json({ error: 'Erro no servidor ao publicar o favor.' });
  }
});

// Listar favores abertos, ordenados por distância até o usuário logado
router.get('/', auth, async (req, res) => {
  try {
    const usuarioLogado = await User.findById(req.userId);
    if (!usuarioLogado) {
      return res.status(401).json({ error: 'Sessão inválida. Entre novamente.' });
    }

    const favores = await Favor.find({ status: 'aberto' })
      .populate('createdBy', 'name photo location')
      .sort({ createdAt: -1 });

    const favoresComDistancia = favores.map((favor) => {
      const distanciaKm = calculateDistance(
        usuarioLogado.lat, usuarioLogado.lng,
        favor.lat, favor.lng
      );

      return {
        ...favor.toObject(),
        distanciaKm: distanciaKm !== null ? Math.round(distanciaKm * 10) / 10 : null
      };
    });

    // Mais perto primeiro. Favores sem distância calculável vão para o fim.
    favoresComDistancia.sort((a, b) => {
      if (a.distanciaKm === null) return 1;
      if (b.distanciaKm === null) return -1;
      return a.distanciaKm - b.distanciaKm;
    });

    res.json(favoresComDistancia);
  } catch (err) {
    console.error('Erro ao listar favores:', err);
    res.status(500).json({ error: 'Erro no servidor ao buscar favores.' });
  }
});

// Meus próprios favores publicados
router.get('/meus', auth, async (req, res) => {
  try {
    const favores = await Favor.find({ createdBy: req.userId }).sort({ createdAt: -1 });
    res.json(favores);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar seus favores.' });
  }
});

module.exports = router;
