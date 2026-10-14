// server.js — ponto de entrada do backend do Favor
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

/* Auto-correção de nomes: o Render diferencia maiúscula de minúscula e, no celular,
   downloads repetidos viram "favors (1).js". Se um arquivo esperado não existir,
   procuramos um parecido (na pasta ou na raiz) e copiamos com o nome certo. */
const ESPERADOS = {
  routes: ['auth.js', 'favors.js', 'proposals.js', 'conversations.js'],
  models: ['User.js', 'Favor.js', 'Conversation.js'],
  middleware: ['auth.js'],
  utils: ['geocode.js', 'distance.js'],
};
const chave = (nome) => nome.toLowerCase().replace(/\.js$/, '').replace(/[^a-z]/g, '');
function corrigirArquivos() {
  for (const [pasta, nomes] of Object.entries(ESPERADOS)) {
    const dir = path.join(__dirname, pasta);
    fs.mkdirSync(dir, { recursive: true });
    for (const nome of nomes) {
      if (fs.existsSync(path.join(dir, nome))) continue;
      let achado = null;
      for (const base of [dir, __dirname]) {
        const f = fs.readdirSync(base).find((x) => x !== 'server.js' && x.toLowerCase().endsWith('.js') && chave(x) === chave(nome));
        if (f) { achado = path.join(base, f); break; }
      }
      if (achado) {
        fs.copyFileSync(achado, path.join(dir, nome));
        console.log('🔧 Corrigi o nome:', path.relative(__dirname, achado), '→', pasta + '/' + nome);
      } else {
        console.warn('⚠️ Arquivo ausente:', pasta + '/' + nome);
      }
    }
  }
}
corrigirArquivos();

const connectDB = require('./lib/db');
const tentar = (caminho) => {
  try { return require(caminho); }
  catch (e) { console.error('❌ Não consegui carregar', caminho, '→', e.message); return null; }
};
const rotas = {
  auth: tentar('./routes/auth'),
  favors: tentar('./routes/favors'),
  conversations: tentar('./routes/conversations'),
  proposals: tentar('./routes/proposals'),
};

/* Perfis públicos e "Sobre mim". A descrição (bio) é gravada direto no usuário,
   então não precisa mexer no models/User.js. */
const mongoose = require('mongoose');
const User = tentar('./models/User');
const Favor = tentar('./models/Favor');
const authMw = tentar('./middleware/auth');
const usersRouter = express.Router();
if (authMw && User) {
  usersRouter.get('/:id', authMw, async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Perfil não encontrado.' });
      const u = await User.findById(req.params.id).select('-password -email -lat -lng').lean();
      if (!u) return res.status(404).json({ error: 'Perfil não encontrado.' });
      const ativos = Favor ? await Favor.countDocuments({ createdBy: u._id, status: 'aberto' }) : 0;
      res.json({
        id: u._id, name: u.name, photo: u.photo || '', bio: u.bio || '', location: u.location || '',
        memberSince: u.createdAt || u._id.getTimestamp(), favoresPublicados: ativos, favoresFeitos: 0, avaliacao: null,
      });
    } catch (err) {
      console.error('Erro ao abrir perfil:', err);
      res.status(500).json({ error: 'Erro ao carregar o perfil.' });
    }
  });
  usersRouter.put('/me', authMw, async (req, res) => {
    try {
      const bio = String(req.body.bio || '').trim().slice(0, 300);
      await User.collection.updateOne({ _id: new mongoose.Types.ObjectId(String(req.userId)) }, { $set: { bio } });
      res.json({ bio });
    } catch (err) {
      console.error('Erro ao salvar descrição:', err);
      res.status(500).json({ error: 'Erro ao salvar a descrição.' });
    }
  });
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/users', usersRouter);
for (const [nome, router] of Object.entries(rotas)) {
  if (router) app.use('/api/' + nome, router);
}

// Diagnóstico: abra /api/health no navegador para ver o que o servidor encontrou
app.get('/api/health', (req, res) => {
  const lista = (p) => { try { return fs.readdirSync(path.join(__dirname, p)).filter((n) => !n.startsWith('.') && n !== 'node_modules'); } catch (e) { return []; } };
  let modeloFavorOk = false;
  try { const F = require('./models/Favor'); modeloFavorOk = !!(F.schema.path('address') && F.schema.path('category')); } catch (e) { /* ausente */ }
  res.json({
    ok: true,
    rotasCarregadas: Object.fromEntries(Object.entries(rotas).map(([k, v]) => [k, !!v])),
    modeloFavorComEnderecoECategoria: modeloFavorOk,
    favorsComPrivacidade: (() => { try { return fs.readFileSync(path.join(__dirname, 'routes', 'favors.js'), 'utf8').includes('const blur'); } catch (e) { return false; } })(),
    arquivos: { raiz: lista('.'), routes: lista('routes'), models: lista('models'), middleware: lista('middleware'), utils: lista('utils') },
  });
});

const PORT = process.env.PORT || 3000;
(async () => {
  try {
    if (typeof connectDB === 'function') await connectDB();
    app.listen(PORT, () => console.log(`✅ Backend do Favor rodando em http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Erro ao iniciar o servidor:', err);
    process.exit(1);
  }
})();
