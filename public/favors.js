// routes/favors.js — criar, listar, editar e apagar favores
const express = require('express');
const mongoose = require('mongoose');
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
      return res.status(400).json({ error: 'Não conseguimos localizar essa cidade/bairro. Tente ser mais específico, como "Santo André, SP".' });
    }
    const favor = new Favor({
      title: title.trim(), description: description.trim(), price: priceNum,
      category: String(category || '').trim(), location: location.trim(),
      address: String(address || '').trim(), lat: geo.lat, lng: geo.lng, createdBy: req.userId
    });
    await favor.save();
    res.status(201).json(favor);
  } catch (err) {
    console.error('Erro ao criar favor:', err);
    res.status(500).json({ error: 'Erro no servidor ao publicar o favor.' });
  }
});

// Listar favores abertos, do mais perto para o mais longe do usuário logado
router.get('/', auth, async (req, res) => {
  try {
    const usuarioLogado = await User.findById(req.userId);
    if (!usuarioLogado) return res.status(401).json({ error: 'Sessão inválida. Entre novamente.' });

    const favores = await Favor.find({ status: 'aberto' })
      .populate('createdBy', 'name photo location')
      .sort({ createdAt: -1 });

    const lista = favores.map((favor) => {
      const d = calculateDistance(usuarioLogado.lat, usuarioLogado.lng, favor.lat, favor.lng);
      return { ...favor.toObject(), distanciaKm: d !== null ? Math.round(d * 10) / 10 : null };
    });
    lista.sort((a, b) => {
      if (a.distanciaKm === null) return 1;
      if (b.distanciaKm === null) return -1;
      return a.distanciaKm - b.distanciaKm;
    });
    res.json(lista);
  } catch (err) {
    console.error('Erro ao listar favores:', err);
    res.status(500).json({ error: 'Erro no servidor ao buscar favores.' });
  }
});

// Meus favores publicados (sem os apagados)
router.get('/meus', auth, async (req, res) => {
  try {
    const favores = await Favor.find({ createdBy: req.userId, status: { $ne: 'cancelado' } }).sort({ createdAt: -1 });
    res.json(favores);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar seus favores.' });
  }
});

// Carrega um favor e garante que é do usuário logado
async function favorDoDono(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: 'Favor não encontrado.' }); return null; }
  const favor = await Favor.findById(req.params.id);
  if (!favor || favor.status === 'cancelado') { res.status(404).json({ error: 'Favor não encontrado.' }); return null; }
  if (String(favor.createdBy) !== String(req.userId)) { res.status(403).json({ error: 'Só quem publicou pode alterar este favor.' }); return null; }
  return favor;
}

// Editar (só o dono): título, detalhes, valor, endereço, categoria e localidade
router.put('/:id', auth, async (req, res) => {
  try {
    const favor = await favorDoDono(req, res);
    if (!favor) return;
    const { title, description, price, address, category, location } = req.body;

    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ error: 'O título não pode ficar vazio.' });
      favor.title = String(title).trim();
    }
    if (description !== undefined) {
      if (!String(description).trim()) return res.status(400).json({ error: 'Os detalhes não podem ficar vazios.' });
      favor.description = String(description).trim();
    }
    if (price !== undefined) {
      if (!(Number(price) > 0)) return res.status(400).json({ error: 'O valor precisa ser maior que zero.' });
      favor.price = Number(price);
    }
    if (address !== undefined) favor.address = String(address).trim();
    if (category !== undefined) favor.category = String(category).trim();
    if (location !== undefined && String(location).trim() !== favor.location) {
      const geo = await geocodeLocation(String(location));
      if (!geo) return res.status(400).json({ error: 'Não conseguimos localizar essa cidade/bairro.' });
      favor.location = String(location).trim(); favor.lat = geo.lat; favor.lng = geo.lng;
    }
    await favor.save();
    res.json(favor);
  } catch (err) {
    console.error('Erro ao editar favor:', err);
    res.status(500).json({ error: 'Erro no servidor ao editar o favor.' });
  }
});

// Apagar (só o dono): some da lista, mas as conversas já feitas continuam existindo
router.delete('/:id', auth, async (req, res) => {
  try {
    const favor = await favorDoDono(req, res);
    if (!favor) return;
    favor.status = 'cancelado';
    await favor.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao apagar favor:', err);
    res.status(500).json({ error: 'Erro no servidor ao apagar o favor.' });
  }
});

module.exports = router;
