import crypto from 'node:crypto';
import db from './db.js';

// Tokens ficam em memória (somem quando o servidor reinicia).
// Suficiente para desenvolvimento/aprendizado. Em produção, trocar por JWT.
const tokens = new Map(); // token -> usuarioId

function hashSenha(senha) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

function registrar({ nome, email, senha, bairro }) {
  if (!nome || !email || !senha) {
    throw new ErroHttp(400, 'Nome, email e senha são obrigatórios');
  }
  if (db.buscarUsuarioPorEmail(email)) {
    throw new ErroHttp(409, 'Já existe uma conta com esse email');
  }
  const usuario = db.criarUsuario({ nome, email, senhaHash: hashSenha(senha), bairro });
  const token = emitirToken(usuario.id);
  return { token, usuario: usuarioPublico(usuario) };
}

function login({ email, senha }) {
  const usuario = db.buscarUsuarioPorEmail(email);
  // Conta demo: qualquer senha funciona se senhaHash === 'demo' (dados de seed).
  const ok = usuario && (usuario.senhaHash === 'demo' || usuario.senhaHash === hashSenha(senha));
  if (!ok) throw new ErroHttp(401, 'Email ou senha inválidos');
  const token = emitirToken(usuario.id);
  return { token, usuario: usuarioPublico(usuario) };
}

function emitirToken(usuarioId) {
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(token, usuarioId);
  return token;
}

function usuarioDoToken(token) {
  const id = tokens.get(token);
  return id ? db.buscarUsuarioPorId(id) : null;
}

function usuarioPublico(u) {
  const { senhaHash, ...resto } = u;
  return resto;
}

export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export default { registrar, login, usuarioDoToken, usuarioPublico, ErroHttp };
