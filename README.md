# Backend do Favor

API REST em **Node.js puro** (sem frameworks nem dependências externas — só
módulos nativos do Node). Guarda os dados em um arquivo JSON local
(`data/db.json`), então funciona sem precisar instalar PostgreSQL nem nada
online. Quando você quiser evoluir pra um banco de verdade, é só trocar o
`lib/db.js` — o resto (rotas, autenticação) não muda.

## Como rodar

Precisa só do Node.js instalado (v18 ou mais novo).

```bash
cd favor-backend
npm start
```

Isso sobe o servidor em `http://localhost:3000`. Na primeira execução, ele
copia os dados de exemplo de `data/db.seed.json` para `data/db.json` — esse
segundo arquivo é o "banco" de verdade, que vai sendo atualizado conforme o
app é usado. Se quiser resetar tudo pro estado inicial, apague `data/db.json`
e rode de novo.

Para desenvolvimento, use `npm run dev` — reinicia sozinho a cada alteração.

## Contas de teste (login)

Qualquer uma dessas contas funciona com **qualquer senha** (é só para
desenvolvimento):

- `matheus@exemplo.com` → usuário principal (o mesmo "Matheus" do app)
- `renata@exemplo.com`, `joao@exemplo.com`, etc. → os outros usuários que já
  aparecem nos pedidos de exemplo

## Rotas da API

| Método | Rota | Precisa login? | O que faz |
|---|---|---|---|
| GET | `/api/categorias` | não | lista as categorias (mudança, faxina, etc.) |
| POST | `/api/auth/registrar` | não | cria conta `{nome, email, senha, bairro}` |
| POST | `/api/auth/login` | não | login `{email, senha}` → devolve `token` |
| GET | `/api/usuarios/me` | sim | dados do usuário logado |
| GET | `/api/usuarios/:id` | não | perfil público de um usuário |
| GET | `/api/pedidos?categoria=&bairro=&raio=` | não | lista pedidos (feed do Explorar) |
| GET | `/api/pedidos/:id` | não | detalhes de um pedido |
| POST | `/api/pedidos` | sim | publica um pedido novo |
| POST | `/api/pedidos/:id/propostas` | sim | envia proposta pra ajudar (também abre a conversa) |
| GET | `/api/conversas` | sim | lista as conversas do usuário logado (tela Mensagens) |
| GET | `/api/conversas/:id/mensagens` | sim | histórico de uma conversa |
| POST | `/api/conversas/:id/mensagens` | sim | manda uma mensagem `{texto}` |

Rotas que "precisam login" esperam o header:
```
Authorization: Bearer <token que veio do login>
```

### Exemplo rápido (curl)

```bash
# login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"matheus@exemplo.com","senha":"qualquer"}'

# publicar pedido (troque SEU_TOKEN pelo token recebido acima)
curl -X POST http://localhost:3000/api/pedidos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"titulo":"Ajuda pra montar estante","cat":"moveis","preco":90,"bairro":"Vila Mariana"}'
```

## Como ligar isso no seu `favor-app.html`

Hoje o front guarda tudo em variáveis do JavaScript (`pedidos`, `conversas`,
`user`). Pra conectar com esse backend, o caminho é trocar essas variáveis
por chamadas `fetch`. Alguns pontos de partida:

```js
const API = 'http://localhost:3000/api';
let token = localStorage.getItem('favor_token'); // guarda o login

async function carregarPedidos() {
  const r = await fetch(`${API}/pedidos?bairro=${user.bairro}`);
  pedidos = await r.json();
  renderFeedExplorar();
}

async function publicarPedido() {
  const r = await fetch(`${API}/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ titulo, desc, cat: catSelecionada, preco, bairro }),
  });
  const novoPedido = await r.json();
  // ...
}
```

O CORS já está liberado (`Access-Control-Allow-Origin: *`), então o
`favor-app.html` pode chamar a API mesmo estando aberto direto do arquivo ou
de outro domínio, sem configuração extra.

## Próximos passos sugeridos

1. Trocar `data/db.json` por um banco de verdade (SQLite ou PostgreSQL) —
   toda a lógica de acesso a dados está isolada em `lib/db.js`, então é só
   reescrever essas funções mantendo a mesma "assinatura".
2. Trocar os tokens em memória por JWT, pra sobreviver a reinícios do
   servidor.
3. Subir isso no Render ou Railway (como você já tinha em mente) — o
   `server.js` já lê a porta de `process.env.PORT`, que é como essas
   plataformas indicam a porta a usar.
