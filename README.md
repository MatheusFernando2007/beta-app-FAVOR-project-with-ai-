# Favor

App de favores/pedidos entre vizinhos, com login real, banco de dados e sugestão de favores por proximidade (distância calculada a partir da localidade de cadastro).

## O que tem aqui

- `server.js` — servidor Express, serve a API e o front-end juntos
- `models/` — User, Favor e Proposal (Mongoose)
- `routes/` — auth (cadastro/login), favores, propostas
- `middleware/auth.js` — protege rotas que exigem login (JWT)
- `utils/geocode.js` — transforma "Santo André, SP" em coordenadas (Nominatim/OpenStreetMap, gratuito)
- `utils/distance.js` — calcula a distância em km entre duas coordenadas
- `public/index.html` — front-end (HTML + CSS + JS, sem frameworks)

## Como rodar na sua máquina (opcional, para testar antes de subir)

1. Instale as dependências: `npm install`
2. Copie `.env.example` para `.env` e preencha `MONGO_URI` e `JWT_SECRET`
3. Rode `npm start`
4. Abra `http://localhost:3000`

## Como colocar no ar

Veja o passo a passo completo na conversa com o Claude. Resumo:

1. Criar um banco gratuito no MongoDB Atlas e pegar a connection string
2. Subir estes arquivos para o repositório no GitHub
3. Configurar `MONGO_URI` e `JWT_SECRET` nas variáveis de ambiente do Render
4. Fazer o deploy/redeploy

## Decisões importantes

- **E-mail não pode repetir**: bloqueado tanto no aplicativo quanto no próprio banco de dados (índice único), então não existe duplicidade mesmo em cadastros simultâneos.
- **Senha**: sempre guardada como hash (criptografada com bcrypt), nunca em texto puro. Duas pessoas *podem* escolher a mesma senha — isso é normal e seguro, porque o hash de cada uma fica diferente (cada uma tem um "sal" aleatório). Impedir senhas repetidas entre contas diferentes não é uma prática de segurança real (exigiria comparar senhas em texto puro, o que é arriscado).
- **Foto de perfil**: fica salva como parte do cadastro do usuário no banco de dados (por isso aparece para as outras pessoas).
- **Sem dados de exemplo**: o banco começa vazio. Tudo que aparecer no app foi criado por um usuário de verdade.
