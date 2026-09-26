const express = require('express');
const router = express.Router();

const Proposal = require('../models/Proposal');
const Favor = require('../models/Favor');
const auth = require('../middleware/auth');

// Enviar uma proposta para um favor
router.post('/', auth, async (req, res) => {
  try {
    const { favorId, message } = req.body;

    if (!favorId) {
      return res.status(400).json({ error: 'Informe qual favor você quer se candidatar.' });
    }

    const favor = await Favor.findById(favorId);
    if (!favor) {
      return res.status(404).json({ error: 'Esse favor não existe mais.' });
    }

    if (favor.createdBy.toString() === req.userId) {
      return res.status(400).json({ error: 'Você não pode enviar uma proposta para o seu próprio favor.' });
    }

    const proposal = new Proposal({
      favor: favorId,
      proposedBy: req.userId,
      message: message || ''
    });

    await proposal.save();
    res.status(201).json(proposal);
  } catch (err) {
    console.error('Erro ao enviar proposta:', err);
    res.status(500).json({ error: 'Erro no servidor ao enviar proposta.' });
  }
});

// Propostas que EU recebi (nos favores que eu publiquei)
router.get('/recebidas', auth, async (req, res) => {
  try {
    const meusFavores = await Favor.find({ createdBy: req.userId }).select('_id');
    const idsFavores = meusFavores.map((f) => f._id);

    const propostas = await Proposal.find({ favor: { $in: idsFavores } })
      .populate('favor', 'title price status')
      .populate('proposedBy', 'name photo location')
      .sort({ createdAt: -1 });

    res.json(propostas);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar propostas recebidas.' });
  }
});

// Propostas que EU enviei para favores de outras pessoas
router.get('/enviadas', auth, async (req, res) => {
  try {
    const propostas = await Proposal.find({ proposedBy: req.userId })
      .populate('favor', 'title price status')
      .sort({ createdAt: -1 });

    res.json(propostas);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar suas propostas.' });
  }
});

// Aceitar ou recusar uma proposta (só quem publicou o favor pode fazer isso)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['aceita', 'recusada'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const proposal = await Proposal.findById(req.params.id).populate('favor');
    if (!proposal) {
      return res.status(404).json({ error: 'Proposta não encontrada.' });
    }

    if (proposal.favor.createdBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Você não tem permissão para responder essa proposta.' });
    }

    proposal.status = status;
    await proposal.save();

    if (status === 'aceita') {
      await Favor.findByIdAndUpdate(proposal.favor._id, { status: 'em_andamento' });
    }

    res.json(proposal);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar a proposta.' });
  }
});

module.exports = router;
