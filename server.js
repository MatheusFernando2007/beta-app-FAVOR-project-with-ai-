import http from 'node:http';
import db from './lib/db.js';
import auth, { ErroHttp } from './lib/auth.js';

const PORT = process.env.PORT || 3000;

/* ---------------- Helpers ---------------- */
function enviarJson(res, status, dados) {
  const corpo = JSON.stringify(dados);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(corpo);
}

function lerCorpoJson(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (chunk) => (dados += chunk));
    req.on('end', () => {
      if (!dados) return resolve({});
      try {
        resolve(JSON.parse(dados));
      } catch {
        reject(new ErroHttp(400, 'JSON inválido no corpo da requisição'));
      }
    });
    req.on('error', reject);
  });
}

function usuarioAutenticado(req) {
  const cabecalho = req.headers['authorization'] || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  const usuario = token ? auth.usuarioDoToken(token) : null;
  if (!usuario) throw new ErroHttp(401, 'Não autenticado. Envie o header Authorization: Bearer <token>.');
  return usuario;
}

/* ---------------- Rotas ---------------- */
const rotas = [];
function rota(metodo, padrao, handler) {
  // padrao vira uma regex simples, ex: /api/pedidos/:id -> /^\/api\/pedidos\/([^/]+)$/
  const nomesParam = [];
  const regexStr = padrao.replace(/:[^/]+/g, (m) => {
    nomesParam.push(m.slice(1));
    return '([^/]+)';
  });
  const regex = new RegExp(`^${regexStr}$`);
  rotas.push({ metodo, regex, nomesParam, handler });
}

rota('GET', '/api/categorias', async () => {
  return { status: 200, dados: db.listarCategorias() };
});

rota('POST', '/api/auth/registrar', async (req) => {
  const corpo = await lerCorpoJson(req);
  return { status: 201, dados: auth.registrar(corpo) };
});

rota('POST', '/api/auth/login', async (req) => {
  const corpo = await lerCorpoJson(req);
  return { status: 200, dados: auth.login(corpo) };
});

rota('GET', '/api/usuarios/me', async (req) => {
  const usuario = usuarioAutenticado(req);
  return { status: 200, dados: auth.usuarioPublico(usuario) };
});

rota('GET', '/api/usuarios/:id', async (req, params) => {
  const usuario = db.buscarUsuarioPorId(params.id);
  if (!usuario) throw new ErroHttp(404, 'Usuário não encontrado');
  return { status: 200, dados: auth.usuarioPublico(usuario) };
});

rota('GET', '/api/pedidos', async (req) => {
  const url = new URL(req.url, 'http://localhost');
  const categoria = url.searchParams.get('categoria') || undefined;
  const bairro = url.searchParams.get('bairro') || 'Vila Mariana';
  const raio = url.searchParams.get('raio');
  return {
    status: 200,
    dados: db.listarPedidos({
      categoria,
      referenciaBairro: bairro,
      raioKm: raio ? Number(raio) : undefined,
    }),
  };
});

rota('GET', '/api/pedidos/:id', async (req, params) => {
  const url = new URL(req.url, 'http://localhost');
  const bairro = url.searchParams.get('bairro') || 'Vila Mariana';
  const pedido = db.buscarPedidoPorId(params.id, bairro);
  if (!pedido) throw new ErroHttp(404, 'Pedido não encontrado');
  return { status: 200, dados: pedido };
});

rota('POST', '/api/pedidos', async (req) => {
  const usuario = usuarioAutenticado(req);
  const corpo = await lerCorpoJson(req);
  if (!corpo.titulo || !corpo.cat) {
    throw new ErroHttp(400, 'Título e categoria são obrigatórios');
  }
  const pedido = db.criarPedido({ ...corpo, autorId: usuario.id });
  return { status: 201, dados: pedido };
});

rota('POST', '/api/pedidos/:id/propostas', async (req, params) => {
  const usuario = usuarioAutenticado(req);
  const corpo = await lerCorpoJson(req);
  const proposta = db.criarProposta({
    pedidoId: params.id,
    deUsuarioId: usuario.id,
    valor: corpo.valor,
    mensagem: corpo.mensagem || 'Tenho interesse em ajudar com esse pedido!',
  });
  if (!proposta) throw new ErroHttp(404, 'Pedido não encontrado');
  return { status: 201, dados: proposta };
});

rota('GET', '/api/conversas', async (req) => {
  const usuario = usuarioAutenticado(req);
  return { status: 200, dados: db.listarConversasDoUsuario(usuario.id) };
});

rota('GET', '/api/conversas/:id/mensagens', async (req, params) => {
  const usuario = usuarioAutenticado(req);
  const conversa = db.buscarConversaPorId(params.id);
  if (!conversa || !conversa.participantes.includes(usuario.id)) {
    throw new ErroHttp(404, 'Conversa não encontrada');
  }
  return { status: 200, dados: conversa.mensagens };
});

rota('POST', '/api/conversas/:id/mensagens', async (req, params) => {
  const usuario = usuarioAutenticado(req);
  const corpo = await lerCorpoJson(req);
  const conversa = db.buscarConversaPorId(params.id);
  if (!conversa || !conversa.participantes.includes(usuario.id)) {
    throw new ErroHttp(404, 'Conversa não encontrada');
  }
  if (!corpo.texto || !corpo.texto.trim()) throw new ErroHttp(400, 'Mensagem vazia');
  const msg = db.adicionarMensagem(params.id, usuario.id, corpo.texto.trim());
  return { status: 201, dados: msg };
});

/* ---------------- Servidor ---------------- */
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return enviarJson(res, 204, {});
  }

  const url = new URL(req.url, 'http://localhost');
  const alvo = rotas.find((r) => r.metodo === req.method && r.regex.test(url.pathname));

  if (!alvo) {
    return enviarJson(res, 404, { erro: 'Rota não encontrada' });
  }

  const match = alvo.regex.exec(url.pathname);
  const params = {};
  alvo.nomesParam.forEach((nome, i) => (params[nome] = match[i + 1]));

  try {
    const { status, dados } = await alvo.handler(req, params);
    enviarJson(res, status, dados);
  } catch (erro) {
    if (erro instanceof ErroHttp) {
      enviarJson(res, erro.status, { erro: erro.message });
    } else {
      console.error(erro);
      enviarJson(res, 500, { erro: 'Erro interno do servidor' });
    }
  }
});

server.listen(PORT, () => {
  console.log(`✅ Backend do Favor rodando em http://localhost:${PORT}`);
});
