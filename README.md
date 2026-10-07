> Atualizacao de 05/10/2026: siga LEIA-ME-PRIMEIRO.md e docs/ATUALIZACAO-CLY.md na raiz para precos, configuracao e estado atual. Este texto contem referencias historicas.

# Clyvo

> **Transforme conversas em vendas.**

SaaS mobile para autônomos, vendedores, pequenos comerciantes e prestadores de serviço
organizarem clientes, orçamentos, propostas e follow-ups direto do celular.

**Status: projeto corrigido para preparar testes de lançamento.**
Comece por [LEIA-ME-PRIMEIRO.md](LEIA-ME-PRIMEIRO.md) e confira
[docs/ENTREGA-PUBLICACAO.md](docs/ENTREGA-PUBLICACAO.md).
Não foi publicado e não inclui AAB assinado. Assinaturas pagas e push seguem pendentes.

---

## Sumário

1. [Requisitos](#1-requisitos)
2. [Estrutura do projeto](#2-estrutura-do-projeto)
3. [Configurando o WAMP Server](#3-configurando-o-wamp-server)
4. [Criando o banco de dados](#4-criando-o-banco-de-dados)
5. [Instalando o backend](#5-instalando-o-backend)
6. [Configurando o `.env`](#6-configurando-o-env)
7. [Rodando o backend](#7-rodando-o-backend)
8. [Testando](#8-testando)
9. [Endpoints da API](#9-endpoints-da-api)
10. [Exemplos de requisições](#10-exemplos-de-requisições)
11. [Segurança](#11-segurança)
12. [Roadmap das etapas](#12-roadmap-das-etapas)
13. [Solução de problemas](#13-solução-de-problemas)

---

## 1. Requisitos

| Ferramenta | Versão mínima | Observação |
|---|---|---|
| Node.js | 18.18 | Recomendado 20 LTS. `node -v` para conferir |
| npm | 9 | Vem junto com o Node |
| MySQL | 5.7 (8.0 recomendado) | Já incluso no WAMP Server |
| WAMP Server | 3.3 | Apenas no Windows; no Linux/macOS use MySQL direto |

> No Linux/macOS o WAMP não é necessário — basta ter um MySQL rodando e ajustar o `.env`.

---

## 2. Estrutura do projeto

```
clyvo/
├── backend/                    API REST (Node + Express + TypeScript)
│   ├── src/
│   │   ├── config/             env validado, pool MySQL, constantes de domínio
│   │   │   ├── constants.ts
│   │   │   ├── database.ts
│   │   │   └── env.ts
│   │   ├── controllers/        recebem a requisição e devolvem a resposta
│   │   │   ├── auth.controller.ts
│   │   │   ├── company.controller.ts
│   │   │   ├── health.controller.ts
│   │   │   ├── subscription.controller.ts
│   │   │   └── user.controller.ts
│   │   ├── middleware/         autenticação, validação, erros, rate limit, logs
│   │   │   ├── authenticate.ts
│   │   │   ├── error-handler.ts
│   │   │   ├── not-found.ts
│   │   │   ├── rate-limit.ts
│   │   │   ├── request-logger.ts
│   │   │   └── validate.ts
│   │   ├── repositories/       acesso ao banco (único lugar que escreve SQL)
│   │   │   ├── company.repository.ts
│   │   │   ├── password-reset.repository.ts
│   │   │   ├── plan.repository.ts
│   │   │   ├── refresh-token.repository.ts
│   │   │   ├── settings.repository.ts
│   │   │   ├── subscription.repository.ts
│   │   │   └── user.repository.ts
│   │   ├── routes/             desenho das rotas
│   │   │   ├── auth.routes.ts
│   │   │   ├── company.routes.ts
│   │   │   ├── index.ts
│   │   │   ├── subscription.routes.ts
│   │   │   ├── upcoming.routes.ts
│   │   │   └── user.routes.ts
│   │   ├── scripts/            migration, seeds e teste de API
│   │   │   ├── migrate.ts
│   │   │   ├── seed.ts
│   │   │   └── smoke-test.ts
│   │   ├── services/           regras de negócio
│   │   │   ├── auth.service.ts
│   │   │   ├── company.service.ts
│   │   │   ├── mappers.ts
│   │   │   ├── subscription.service.ts
│   │   │   └── user.service.ts
│   │   ├── types/              tipos do domínio e do Express
│   │   ├── utils/              jwt, bcrypt, datas, erros, logger, respostas
│   │   ├── validators/         schemas Zod de entrada
│   │   ├── app.ts              monta o Express
│   │   └── server.ts           sobe o servidor
│   ├── .env.example
│   ├── .env.production.example  variáveis para o servidor de produção
│   ├── package.json
│   └── tsconfig.json
├── database/
│   ├── schema.sql              estrutura completa do banco
│   └── README.md
├── deploy/                     arquivos de publicação
│   ├── docker-compose.yml      API + MySQL com um comando
│   ├── ecosystem.config.js     PM2 (VPS sem Docker)
│   └── nginx-clyvo.conf        HTTPS na frente da API e do site
├── docs/
│   ├── API.md                  documentação dos endpoints
│   ├── ARQUITETURA.md          decisões técnicas e como criar um módulo novo
│   ├── DESIGN.md               design system (cores, tipografia, componentes)
│   ├── DEPLOY.md               como colocar no ar e publicar na Play Store
│   ├── PLAY-STORE.md           textos e imagens prontos para a loja
│   ├── POLITICA-DE-PRIVACIDADE.md
│   ├── TERMOS-DE-USO.md
│   ├── ROADMAP.md              o que entra em cada etapa
│   └── play-store/             ícone 512 e imagem de destaque 1024x500
├── scripts/
│   ├── make-assets.mjs         gera ícones e splash a partir da logo
│   └── make-legal-docs.mjs     gera os documentos legais em Markdown
├── Dockerfile                  imagem da API (rode a partir desta pasta)
└── frontend/                   app mobile (React Native + Expo + TypeScript)
    ├── app/                    rotas do app, incluindo /privacidade e /termos
    ├── assets/                 ícone, splash, favicon, imagem de compartilhamento
    ├── app.json                nome, ícone, versão, pacote Android
    ├── eas.json                perfis de build (development, preview, production)
    ├── .env.example            endereço da API em desenvolvimento
    ├── .env.production.example endereço da API em produção
    └── src/
        ├── features/           auth, dashboard, clients, opportunities, quotes, legal
        └── shared/             api, components, storage, theme, utils
```

**O caminho que um dado percorre:**

```
rota → middleware (auth + validação) → controller → service → repository → MySQL
```

Cada camada tem uma responsabilidade só. O controller nunca escreve SQL; o
repository nunca decide regra de negócio.

---

## 3. Configurando o WAMP Server

1. Instale o [WAMP Server](https://www.wampserver.com/) e abra o programa.
2. Espere o ícone na bandeja do Windows ficar **verde**.
   - Laranja = algum serviço não subiu (normalmente porta 80 ou 3306 ocupada).
   - Vermelho = nada subiu.
3. Clique no ícone → **MySQL** → confirme que o serviço está rodando na porta **3306**.
4. Abra o phpMyAdmin em <http://localhost/phpmyadmin>.
   - Usuário padrão: `root`
   - Senha padrão: *(vazia)*

> **Porta 3306 ocupada?** Normalmente é outro MySQL instalado na máquina.
> Pare o serviço em *Serviços do Windows* ou mude a porta do WAMP e ajuste
> `DB_PORT` no `.env`.

---

## 4. Criando o banco de dados

Você tem três caminhos — escolha um.

### Opção A — pelo backend (recomendado)

Cria o banco, as tabelas e os planos em um comando só:

```bash
cd clyvo/backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run db:migrate
```

Saída esperada:

```
[clyvo] [INFO] Aplicando schema em "clyvo"...
[clyvo] [INFO] Schema aplicado. 21 tabelas disponiveis:
[clyvo] [INFO]   - categories
[clyvo] [INFO]   - clients
...
[clyvo] [INFO] Migration concluida. Proximo passo: npm run db:seed
```

Para recomeçar do zero (**apaga tudo**):

```bash
npm run db:reset
```

### Opção B — pelo phpMyAdmin

1. Abra <http://localhost/phpmyadmin>.
2. Aba **Importar** → **Escolher arquivo** → selecione `clyvo/database/schema.sql`.
3. Clique em **Executar**.

O arquivo já contém o `CREATE DATABASE IF NOT EXISTS clyvo`, então não é preciso
criar o banco antes.

### Opção C — pela linha de comando

```bash
cd clyvo/database
mysql -u root -p < schema.sql
```

### Populando com dados de teste

```bash
cd clyvo/backend
npm run db:seed
```

Cria duas contas com dados próprios — úteis para conferir na prática que um
usuário nunca enxerga os dados do outro:

| E-mail | Senha | Plano | Perfil |
|---|---|---|---|
| `renan@clyvo.app` | `Clyvo@2025` | Pro | Técnico de informática (4 clientes, 4 serviços, 3 produtos) |
| `maria@clyvo.app` | `Clyvo@2025` | Free | Loja de móveis (2 clientes, 1 serviço, 2 produtos) |

Migration + seeds de uma vez: `npm run db:setup`

---

## 5. Instalando o backend

```bash
cd clyvo/backend
npm install
```

---

## 6. Configurando o `.env`

```bash
cp .env.example .env      # Windows: copy .env.example .env
```

**Gere segredos JWT de verdade** (os do exemplo não servem para produção):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Rode duas vezes e cole os valores em `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET`.
Eles precisam ser **diferentes entre si** e ter no mínimo 32 caracteres — o
servidor se recusa a subir caso contrário.

Ajuste também o acesso ao MySQL:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=          # no WAMP, normalmente vazio
DB_NAME=clyvo
```

> O `.env` está no `.gitignore` e **nunca** deve ir para o Git.
> Nenhuma senha, token ou chave aparece no código.

---

## 7. Rodando o backend

```bash
npm run dev      # desenvolvimento, recarrega ao salvar
```

```
[clyvo] [INFO] Conectado ao MySQL em 127.0.0.1:3306/clyvo
[clyvo] [INFO] Clyvo - Transforme conversas em vendas.
[clyvo] [INFO] API rodando em http://localhost:3333/api (development)
[clyvo] [INFO] Health check: http://localhost:3333/health
```

Para produção:

```bash
npm run build && npm start
```

### Todos os comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe a API com recarregamento automático |
| `npm run build` | Compila o TypeScript para `dist/` |
| `npm start` | Roda a versão compilada |
| `npm run typecheck` | Checa os tipos sem gerar arquivos |
| `npm run db:migrate` | Cria o banco e as tabelas |
| `npm run db:reset` | Apaga e recria o banco do zero |
| `npm run db:seed` | Insere os dados de teste |
| `npm run db:setup` | `db:migrate` + `db:seed` |
| `npm run test:api` | Roda o teste ponta a ponta da API |

---

## 8. Testando

### Health check

```bash
curl http://localhost:3333/health
```

```json
{
  "success": true,
  "data": {
    "app": "Clyvo",
    "tagline": "Transforme conversas em vendas.",
    "stage": "Etapa 1 - autenticacao",
    "database": "ok"
  }
}
```

Se `database` vier como `"indisponivel"`, o WAMP está desligado ou o `.env`
está com usuário/senha errados.

### Teste automatizado da API

Com o servidor rodando em um terminal, abra outro:

```bash
npm run test:api
```

O script cria contas reais no banco e verifica 15 blocos:

1. Health check e conexão com o banco
2. Cadastro (tokens, telefone normalizado, hash de senha nunca exposto)
3. Validações (e-mail duplicado, senha fraca, e-mail inválido)
4. Rotas protegidas (sem token, token inválido, token válido)
5. Login (senha errada, e-mail inexistente, mensagens indistinguíveis)
6. Onboarding
7. Perfil, empresa e preferências (CNPJ e UF normalizados, campo desconhecido rejeitado)
8. Planos e limites da assinatura
9. Refresh token **com rotação** (o token antigo para de funcionar)
10. Isolamento entre usuários
11. Módulos das próximas etapas respondendo 501
12. Troca de senha (revoga todas as sessões)
13. Recuperação de senha (token de uso único)
14. Logout
15. Rota inexistente

Saída esperada no final:

```
===========================================
 Testes aprovados: 95
 Testes falhos:    0
===========================================
```

### Testando manualmente pelo navegador

`GET http://localhost:3333/api` lista todos os endpoints disponíveis.

---

## 8.1 Rodando o aplicativo

Com o backend no ar, em **outro terminal**:

```bash
cd ..\frontend
npm install --legacy-peer-deps
npx expo install --fix
npx expo start
```

Escaneie o QR Code com o app **Expo Go** no celular (mesma rede Wi-Fi do
computador) ou aperte `a` para abrir no emulador Android.

Entre com `renan@clyvo.app` / `Clyvo@2025` — essa conta já vem com pipeline
preenchido, então o dashboard aparece com números reais vindos do MySQL.

Detalhes e solução de problemas em [`frontend/README.md`](frontend/README.md).

---

## 9. Endpoints da API

Base: `http://localhost:3333/api`

### Autenticação — `/auth`

| Método | Rota | Autenticada | Descrição |
|---|---|:---:|---|
| POST | `/auth/register` | — | Cria a conta (e já devolve os tokens) |
| POST | `/auth/login` | — | Entra na conta |
| POST | `/auth/refresh` | — | Renova os tokens (com rotação) |
| POST | `/auth/forgot-password` | — | Solicita recuperação de senha |
| POST | `/auth/reset-password` | — | Define a nova senha com o token recebido |
| GET | `/auth/me` | ✅ | Usuário + empresa + preferências + assinatura |
| POST | `/auth/logout` | ✅ | Encerra a sessão atual ou todas |
| POST | `/auth/change-password` | ✅ | Troca a senha (revoga todas as sessões) |
| POST | `/auth/onboarding` | ✅ | Salva as respostas do primeiro acesso |

### Dashboard — `/dashboard`

| Método | Rota | Autenticada | Descrição |
|---|---|:---:|---|
| GET | `/dashboard` | ✅ | Resumo do mês da tela Início (aceita `?month=AAAA-MM`) |

### Usuário — `/users`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/users/me` | Dados do perfil |
| PATCH | `/users/me` | Atualiza nome, telefone, WhatsApp, avatar |
| DELETE | `/users/me` | Desativa a conta |
| GET | `/users/me/settings` | Preferências |
| PATCH | `/users/me/settings` | Atualiza preferências |

### Empresa — `/companies`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/companies/me` | Perfil da empresa (usado nos PDFs) |
| PATCH | `/companies/me` | Atualiza os dados da empresa |

### Assinatura — `/subscriptions`

| Método | Rota | Autenticada | Descrição |
|---|---|:---:|---|
| GET | `/subscriptions/plans` | — | Lista Free, Pro e Pro Max |
| GET | `/subscriptions/me` | ✅ | Assinatura e limites do usuário |

### Próximas etapas

`/clients`, `/products`, `/services`, `/opportunities`, `/quotes`,
`/follow-ups` e `/notifications` já exigem autenticação e respondem **501**
com a etapa em que serão entregues.

### Formato das respostas

Sucesso:

```json
{ "success": true, "message": "...", "data": { } }
```

Erro:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Verifique os campos informados.",
    "details": [{ "field": "email", "message": "Informe um e-mail valido." }]
  }
}
```

---

## 10. Exemplos de requisições

### Cadastro

```bash
curl -X POST http://localhost:3333/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Renan Messias",
    "email": "renan@clyvo.app",
    "password": "Clyvo@2025",
    "passwordConfirmation": "Clyvo@2025",
    "phone": "(11) 98765-4321",
    "companyName": "Messias Tech"
  }'
```

```json
{
  "success": true,
  "message": "Conta criada com sucesso. Bem-vindo ao Clyvo!",
  "data": {
    "user": {
      "id": 1,
      "name": "Renan Messias",
      "email": "renan@clyvo.app",
      "phone": "11987654321",
      "onboardingCompleted": false,
      "status": "ativo"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "tokenType": "Bearer",
      "expiresIn": 900
    }
  }
}
```

No Windows (PowerShell), use aspas duplas escapadas ou o **Insomnia/Postman**.

### Login

```bash
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "renan@clyvo.app", "password": "Clyvo@2025" }'
```

### Rota autenticada

```bash
curl http://localhost:3333/api/auth/me \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

Retorna usuário, empresa, preferências e assinatura — é a chamada que o app
faz logo após o login.

### Onboarding

```bash
curl -X POST http://localhost:3333/api/auth/onboarding \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{ "sellsType": "servicos_e_produtos", "mainGoal": "aumentar_vendas" }'
```

Valores aceitos:

- `sellsType`: `servicos`, `produtos`, `servicos_e_produtos`, `vendedor`, `loja`, `outro`
- `mainGoal`: `organizar_clientes`, `criar_orcamentos`, `acompanhar_vendas`,
  `nao_esquecer_clientes`, `aumentar_vendas`, `organizar_empresa`

### Renovar a sessão

```bash
curl -X POST http://localhost:3333/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "SEU_REFRESH_TOKEN" }'
```

O access token dura 15 minutos; o refresh token, 30 dias. A cada renovação o
refresh antigo é **revogado** e um novo é emitido.

### Dados da empresa

```bash
curl -X PATCH http://localhost:3333/api/companies/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{
    "tradeName": "Messias Tech",
    "document": "12.345.678/0001-90",
    "city": "Sao Paulo",
    "state": "SP",
    "instagram": "@messiastech"
  }'
```

### Trocar a senha

```bash
curl -X POST http://localhost:3333/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{
    "currentPassword": "Clyvo@2025",
    "newPassword": "NovaSenha@2026",
    "newPasswordConfirmation": "NovaSenha@2026"
  }'
```

### Recuperação de senha

```bash
curl -X POST http://localhost:3333/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "renan@clyvo.app" }'
```

Em desenvolvimento a resposta traz `data.devToken`, para você testar sem
serviço de e-mail. Em produção esse campo **não** é retornado.

```bash
curl -X POST http://localhost:3333/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{ "token": "TOKEN_RECEBIDO", "newPassword": "OutraSenha@2026" }'
```

### Logout

```bash
curl -X POST http://localhost:3333/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{ "refreshToken": "SEU_REFRESH_TOKEN" }'
```

Use `{ "allDevices": true }` para encerrar todas as sessões.

---

## 11. Segurança

O que já está implementado nesta etapa:

- **Senhas com bcrypt** (10 rounds). O texto puro nunca é gravado nem logado.
- **JWT com dois segredos distintos** — access (15 min) e refresh (30 dias).
- **Refresh token com rotação**: ao renovar, o token antigo é revogado. Reuso é bloqueado.
- **Tokens guardados como hash SHA-256** no banco. Um vazamento não permite login.
- **Validação de toda entrada com Zod** e `.strict()` — campo desconhecido é rejeitado.
- **Isolamento por usuário**: toda tabela de dados tem `user_id` e nenhuma consulta
  roda sem esse filtro. `ON DELETE CASCADE` a partir de `users`.
- **Middleware de autenticação** que recarrega o usuário no banco a cada requisição —
  conta bloqueada perde acesso imediatamente, sem esperar o token expirar.
- **Rate limiting**: geral na API e mais rígido em login, cadastro e recuperação.
- **Mensagens de login indistinguíveis** entre "e-mail não existe" e "senha errada",
  com comparação bcrypt falsa para igualar o tempo de resposta.
- **Troca de senha revoga todas as sessões**.
- **Token de recuperação de uso único**, com validade de 30 minutos.
- **Helmet + CORS configurável** por variável de ambiente.
- **Tratamento global de erros**: nada de stack trace ou detalhe de SQL em produção.
- **Segredos só no `.env`** (fora do Git).

### O que ainda falta (e por quê)

| Item | Situação |
|---|---|
| Envio de e-mail na recuperação de senha | A camada está pronta em `auth.service.ts`; falta escolher o provedor (SMTP, Resend, SendGrid). Hoje o token é devolvido na resposta em desenvolvimento. |
| Verificação de e-mail no cadastro | Coluna `email_verified_at` já existe; o fluxo entra junto com o envio de e-mail. |
| Pagamento real da assinatura | Tabelas `plans`, `subscriptions` e `payments` prontas, com campos `external_provider` e `external_*_id`. Integração na Etapa 15. |
| IA | Variáveis `AI_PROVIDER` e `AI_API_KEY` reservadas no `.env`. Entra na Etapa 14. |
| Upload de logo e foto de produto | As colunas guardam URL; falta decidir o storage (local ou S3/Cloudinary). |

---

## 12. Roadmap das etapas

| Etapa | Escopo | Situação |
|---|---|---|
| 1 | Arquitetura, banco, backend, autenticação | ✅ Concluída |
| 2 | Frontend, login, cadastro, dashboard | ✅ Concluída |
| 3 | Clientes | Implementado |
| 4 | Produtos e serviços | Implementado |
| 5 | Oportunidades | Implementado |
| 6 | Orçamentos e propostas | Implementado |
| 7 | PDF | Implementado |
| 8 | Compartilhamento pelo WhatsApp | Implementado |
| 9 | Pipeline | Implementado |
| 10 | Follow-ups | Implementado |
| 11 | Recuperação de clientes | Implementado |
| 12 | Resultados e estatísticas | Implementado |
| 13 | Notificações | Implementado |
| 14 | IA | |
| 15 | Assinatura | |

Detalhes em [`docs/ROADMAP.md`](docs/ROADMAP.md).
O visual de todas as telas segue [`docs/DESIGN.md`](docs/DESIGN.md), já
implementado em `frontend/src/shared/theme/`.

---

## 13. Solução de problemas

| Mensagem | Causa | Solução |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL desligado | Ligue o WAMP e espere o ícone ficar verde |
| `ER_ACCESS_DENIED_ERROR` | Usuário/senha do MySQL errados | No WAMP, use `DB_USER=root` e `DB_PASSWORD` vazio |
| `DATABASE_NOT_MIGRATED` | Tabelas não criadas | `npm run db:migrate` |
| `JWT_ACCESS_SECRET precisa ter no minimo 32 caracteres` | Segredo padrão ou curto | Gere um novo com o comando da seção 6 |
| `JWT_ACCESS_SECRET e JWT_REFRESH_SECRET precisam ser diferentes` | Segredos iguais | Gere dois valores distintos |
| `EADDRINUSE :3333` | Porta ocupada | Mude `PORT` no `.env` |
| `Plano "free" nao encontrado` | Migration não rodou por completo | `npm run db:reset` |
| Teste falha com 429 | Rate limit de autenticação atingido | Aumente `AUTH_RATE_LIMIT_MAX_REQUESTS` ou espere 15 minutos |
| `Cannot find module` | Dependências não instaladas | `npm install` dentro de `backend/` |

---

## Planos

| | Free | Pro | Pro Max |
|---|---|---|---|
| **Preço** | R$ 0 | **R$ 14,90/mês** | **R$ 29,90/mês** |
| Preço de fundador | — | R$ 9,90 (100 vagas) | R$ 19,90 (50 vagas) |
| Clientes | 20 | ilimitados | ilimitados |
| Oportunidades | 20/mês | ilimitadas | ilimitadas |
| Propostas | **5/mês** | ilimitadas | ilimitadas |
| Catálogo | 20 itens | ilimitado | ilimitado |
| Funil e follow-ups | ✅ | ✅ | ✅ automático |
| PDF sem marca Clyvo | ❌ | ✅ | ✅ |
| Resultados | ❌ | ✅ | ✅ avançado |
| IA | ❌ | ✅ | ✅ |
| Equipe | ❌ | ❌ | ✅ |

**Os preços e recursos pagos abaixo são planejamento futuro; não são vendidos nesta entrega.**

O gargalo do Free é a **proposta**, não o cliente: a pessoa organiza a carteira
inteira de graça e sente falta na hora de vender. Os limites são aplicados de
verdade — a API responde `402 PLAN_LIMIT_REACHED`.

O **preço de fundador** é vitalício: quem assina enquanto houver vaga tem o valor
gravado em `subscriptions.price_paid` e a flag `is_founder`, então um reajuste
futuro não atinge essas contas.

---

## Publicando

Quando o app estiver testado e você quiser colocar no ar, o passo a passo
completo está em [`docs/DEPLOY.md`](docs/DEPLOY.md): hospedar a API, publicar
a versão web, gerar o arquivo `.aab` e enviar para a Play Store.

Os textos e as imagens que a loja exige já estão prontos em
[`docs/PLAY-STORE.md`](docs/PLAY-STORE.md).

**Antes de publicar**, preencha seus dados reais no bloco `COMPANY` do arquivo
`frontend/src/features/legal/legal-content.ts` — ele alimenta ao mesmo tempo as
telas do app, as páginas públicas e os documentos em `docs/`.

---

## Continuando o desenvolvimento

Se for retomar o projeto em outra conversa ou com outro assistente, use
[`PROMPT-CONTINUACAO.md`](PROMPT-CONTINUACAO.md) — ele explica o estado atual,
as convenções obrigatórias, o design system e o que falta em cada etapa.

---

## Licença

Projeto privado. Todos os direitos reservados.
