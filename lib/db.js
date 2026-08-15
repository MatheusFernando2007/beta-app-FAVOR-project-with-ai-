import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const SEED_PATH = path.join(__dirname, '..', 'data', 'db.seed.json');

// Se ainda não existe um db.json (primeira execução), cria a partir da seed.
if (!existsSync(DB_PATH)) {
  copyFileSync(SEED_PATH, DB_PATH);
}

let state = JSON.parse(readFileSync(DB_PATH, 'utf-8'));

function persist() {
  writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

/* ---------- Utilitário de distância (fórmula de Haversine) ---------- */
function distanciaKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function coordDoBairro(nomeBairro) {
  return state.bairros[nomeBairro] || null;
}

/* ---------- Usuários ---------- */
function listarUsuarios() {
  return state.usuarios;
}
function buscarUsuarioPorId(id) {
  return state.usuarios.find((u) => u.id === id) || null;
}
function buscarUsuarioPorEmail(email) {
  return state.usuarios.find((u) => u.email === email) || null;
}
function criarUsuario({ nome, email, senhaHash, bairro }) {
  const id = 'u' + state.nextUsuarioSeq++;
  const usuario = {
    id, nome, email, senhaHash,
    bairro: bairro || 'Vila Mariana',
    nota: 5.0, verificado: false,
    membroDesde: new Date().getFullYear(),
    skills: [], raioPadrao: 5,
  };
  state.usuarios.push(usuario);
  persist();
  return usuario;
}

/* ---------- Categorias ---------- */
function listarCategorias() {
  return state.categorias;
}

/* ---------- Pedidos ---------- */
// Monta o pedido "pronto pra tela": junta dados do autor e calcula distância
// em relação ao bairro informado (referenciaBairro), igual o app já fazia no front.
function hidratarPedido(p, referenciaBairro) {
  const autor = buscarUsuarioPorId(p.autorId);
  const origem = coordDoBairro(referenciaBairro);
  const destino = coordDoBairro(p.bairro);
  const dist = origem && destino ? distanciaKm(origem, destino) : null;
  return {
    id: p.id,
    titulo: p.titulo,
    desc: p.desc,
    cat: p.cat,
    preco: p.preco,
    bairro: p.bairro,
    quando: p.quando,
    status: p.status,
    createdAt: p.createdAt,
    dist: dist !== null ? +dist.toFixed(1) : null,
    autor: autor ? { id: autor.id, nome: autor.nome, nota: autor.nota, verificado: autor.verificado, membroDesde: autor.membroDesde } : null,
  };
}

function listarPedidos({ categoria, referenciaBairro, raioKm } = {}) {
  let lista = state.pedidos.filter((p) => p.status !== 'cancelado');
  if (categoria) lista = lista.filter((p) => p.cat === categoria);
  let hidratados = lista.map((p) => hidratarPedido(p, referenciaBairro));
  if (raioKm != null) {
    hidratados = hidratados.filter((p) => p.dist === null || p.dist <= raioKm);
  }
  hidratados.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
  return hidratados;
}

function buscarPedidoPorId(id, referenciaBairro) {
  const p = state.pedidos.find((x) => x.id === Number(id));
  return p ? hidratarPedido(p, referenciaBairro) : null;
}

function criarPedido({ titulo, desc, cat, preco, bairro, quando, autorId }) {
  const pedido = {
    id: state.nextPedidoId++,
    titulo, desc: desc || 'Sem detalhes adicionais.', cat,
    preco: Number(preco) || 0,
    bairro: bairro || 'Vila Mariana',
    quando: quando || 'A combinar',
    autorId,
    status: 'aberto',
    createdAt: new Date().toISOString(),
  };
  state.pedidos.push(pedido);
  persist();
  return hidratarPedido(pedido, bairro);
}

/* ---------- Propostas ---------- */
function criarProposta({ pedidoId, deUsuarioId, valor, mensagem }) {
  const pedido = state.pedidos.find((p) => p.id === Number(pedidoId));
  if (!pedido) return null;
  const proposta = {
    id: 'p' + Date.now(),
    pedidoId: pedido.id,
    deUsuarioId,
    valor: Number(valor) || pedido.preco,
    mensagem,
    status: 'pendente',
    createdAt: new Date().toISOString(),
  };
  state.propostas.push(proposta);
  // Toda proposta também abre/usa uma conversa entre o proponente e o autor do pedido.
  const conversa = obterOuCriarConversa(pedido.id, [deUsuarioId, pedido.autorId]);
  adicionarMensagem(conversa.id, deUsuarioId, mensagem);
  persist();
  return proposta;
}

/* ---------- Conversas / Mensagens ---------- */
function listarConversasDoUsuario(usuarioId) {
  return state.conversas
    .filter((c) => c.participantes.includes(usuarioId))
    .map((c) => hidratarConversa(c, usuarioId));
}

function hidratarConversa(c, usuarioId) {
  const outroId = c.participantes.find((id) => id !== usuarioId) || c.participantes[0];
  const outro = buscarUsuarioPorId(outroId);
  const pedido = state.pedidos.find((p) => p.id === c.pedidoId);
  return {
    id: c.id,
    pedidoId: c.pedidoId,
    pedidoTitulo: pedido ? pedido.titulo : null,
    com: outro ? { id: outro.id, nome: outro.nome } : null,
    mensagens: c.mensagens,
  };
}

function obterOuCriarConversa(pedidoId, participantes) {
  let c = state.conversas.find(
    (x) => x.pedidoId === Number(pedidoId) &&
      participantes.every((p) => x.participantes.includes(p))
  );
  if (!c) {
    c = { id: 'c' + Date.now(), pedidoId: Number(pedidoId), participantes, mensagens: [] };
    state.conversas.push(c);
  }
  return c;
}

function buscarConversaPorId(id) {
  return state.conversas.find((c) => c.id === id) || null;
}

function adicionarMensagem(conversaId, deUsuarioId, texto) {
  const c = buscarConversaPorId(conversaId);
  if (!c) return null;
  const msg = { id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6), de: deUsuarioId, texto, ts: new Date().toISOString() };
  c.mensagens.push(msg);
  persist();
  return msg;
}

export default {
  listarUsuarios, buscarUsuarioPorId, buscarUsuarioPorEmail, criarUsuario,
  listarCategorias,
  listarPedidos, buscarPedidoPorId, criarPedido,
  criarProposta,
  listarConversasDoUsuario, buscarConversaPorId, obterOuCriarConversa, adicionarMensagem,
  distanciaKm, coordDoBairro,
};
