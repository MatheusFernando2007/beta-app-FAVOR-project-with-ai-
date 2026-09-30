// routes/conversations.js — chat entre quem pede e quem oferece ajuda
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Conversation = require('../models/Conversation');
const Favor = require('../models/Favor');
const auth = require('../middleware/auth');

function formatMessage(m) {
  return { id: m._id, sender: String(m.sender), text: m.text, offer: m.offer, createdAt: m.createdAt };
}

function formatConversation(conv, meId, withMessages) {
  const other = conv.participants.find((p) => String(p._id) !== String(meId)) || null;
  const msgs = conv.messages || [];
  return {
    id: conv._id,
    favor: conv.favor ? { id: conv.favor._id, title: conv.favor.title, price: conv.favor.price } : null,
    with: other ? { id: other._id, name: other.name, photo: other.photo } : null,
    lastMessage: msgs.length ? formatMessage(msgs[msgs.length - 1]) : null,
    lastMessageAt: conv.lastMessageAt,
    messages: withMessages ? msgs.map(formatMessage) : undefined
  };
}

function withPeople(query) {
  return query.populate('participants', 'name photo').populate('favor', 'title price');
}

// Envia uma proposta (primeira mensagem) sobre um favor.
// Se a conversa já existe, só adiciona a mensagem nela.
router.post('/', auth, async (req, res) => {
  try {
    const { favorId, text, offer } = req.body;
    const clean = String(text || '').trim().slice(0, 2000);

    if (!mongoose.isValidObjectId(favorId) || !clean) {
      return res.status(400).json({ error: 'Escreva uma mensagem para enviar.' });
    }

    const favor = await Favor.findById(favorId);
    if (!favor) {
      return res.status(404).json({ error: 'Favor não encontrado.' });
    }
    if (String(favor.createdBy) === String(req.userId)) {
      return res.status(400).json({ error: 'Você não pode enviar proposta para o seu próprio favor.' });
    }

    let conv = await Conversation.findOne({
      favor: favor._id,
      participants: { $all: [req.userId, favor.createdBy] }
    });
    if (!conv) {
      conv = new Conversation({ favor: favor._id, participants: [req.userId, favor.createdBy] });
    }

    const offerNum = Number(offer);
    conv.messages.push({ sender: req.userId, text: clean, offer: offerNum > 0 ? offerNum : null });
    conv.lastMessageAt = new Date();
    await conv.save();

    res.status(201).json({ id: conv._id });
  } catch (err) {
    console.error('Erro ao enviar proposta:', err);
    res.status(500).json({ error: 'Erro no servidor ao enviar a mensagem.' });
  }
});

// Lista as minhas conversas (mais recentes primeiro)
router.get('/', auth, async (req, res) => {
  try {
    const convs = await withPeople(Conversation.find({ participants: req.userId }))
      .sort({ lastMessageAt: -1 });
    res.json(convs.map((c) => formatConversation(c, req.userId, false)));
  } catch (err) {
    console.error('Erro ao listar conversas:', err);
    res.status(500).json({ error: 'Erro no servidor ao buscar conversas.' });
  }
});

// Abre uma conversa com todas as mensagens
router.get('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Conversa não encontrada.' });
    }
    const conv = await withPeople(Conversation.findById(req.params.id));
    if (!conv) {
      return res.status(404).json({ error: 'Conversa não encontrada.' });
    }
    if (!conv.participants.some((p) => String(p._id) === String(req.userId))) {
      return res.status(403).json({ error: 'Você não faz parte dessa conversa.' });
    }
    res.json(formatConversation(conv, req.userId, true));
  } catch (err) {
    console.error('Erro ao abrir conversa:', err);
    res.status(500).json({ error: 'Erro no servidor ao abrir a conversa.' });
  }
});

// Envia uma mensagem dentro de uma conversa
router.post('/:id/messages', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Conversa não encontrada.' });
    }
    const clean = String(req.body.text || '').trim().slice(0, 2000);
    if (!clean) {
      return res.status(400).json({ error: 'Escreva uma mensagem para enviar.' });
    }

    const conv = await Conversation.findById(req.params.id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversa não encontrada.' });
    }
    if (!conv.participants.some((p) => String(p) === String(req.userId))) {
      return res.status(403).json({ error: 'Você não faz parte dessa conversa.' });
    }

    conv.messages.push({ sender: req.userId, text: clean });
    conv.lastMessageAt = new Date();
    await conv.save();

    res.status(201).json(formatMessage(conv.messages[conv.messages.length - 1]));
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    res.status(500).json({ error: 'Erro no servidor ao enviar a mensagem.' });
  }
});

module.exports = router;
