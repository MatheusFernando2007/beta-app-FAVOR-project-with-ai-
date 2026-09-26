// server.js — ponto de entrada do backend do Favor

require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');

// Conexão com o banco (ajuste se o lib/db.js exportar diferente)
const connectDB = require('./lib/db');

// Rotas da API
const authRoutes = require('./routes/auth');
const favorsRoutes = require('./routes/favors');
const proposalsRoutes = require('./routes/proposals');

const app = express();

app.use(cors());
app.use(express.json());

// Serve o frontend (public/index.html e afins)
app.use(express.static(path.join(__dirname, 'public')));

// Endpoints da API
app.use('/api/auth', authRoutes);
app.use('/api/favors', favorsRoutes);
app.use('/api/proposals', proposalsRoutes);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    if (typeof connectDB === 'function') {
      await connectDB();
    }
    app.listen(PORT, () => {
      console.log(`✅ Backend do Favor rodando em http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Erro ao iniciar o servidor:', err);
    process.exit(1);
  }
}

start();
