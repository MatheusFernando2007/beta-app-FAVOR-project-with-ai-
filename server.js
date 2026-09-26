require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const favorRoutes = require('./routes/favors');
const proposalRoutes = require('./routes/proposals');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // limite maior por causa das fotos em base64
app.use(express.static(path.join(__dirname, 'public')));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB'))
  .catch((err) => console.error('Erro ao conectar ao MongoDB:', err.message));

app.use('/api/auth', authRoutes);
app.use('/api/favores', favorRoutes);
app.use('/api/propostas', proposalRoutes);

// Qualquer outra rota devolve o front-end (index.html cuida da navegação).
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
