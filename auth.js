const jwt = require('jsonwebtoken');

// Protege rotas: só deixa passar quem enviou um token válido (ou seja,
// quem já fez login). O token vem no cabeçalho "Authorization: Bearer <token>".
module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Você precisa estar logado para fazer isso.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sua sessão expirou. Faça login novamente.' });
  }
};
