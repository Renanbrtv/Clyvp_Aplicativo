> Documento de referência anterior. Para o estado atual, preços, integrações e bloqueios, siga ATUALIZACAO-CLY.md e ENTREGA-PUBLICACAO.md.

# Clyvo — Documentação da API (Etapa 1)

Base URL de desenvolvimento: `http://localhost:3333/api`

Todas as respostas são JSON com `Content-Type: application/json`.

---

## Convenções

### Resposta de sucesso

```json
{
  "success": true,
  "message": "Texto opcional para exibir ao usuário",
  "data": { }
}
```

### Resposta de erro

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Verifique os campos informados.",
    "details": [
      { "field": "email", "message": "Informe um e-mail valido." }
    ]
  }
}
```

`details` só aparece em erros de validação.

### Códigos de erro

| Código | HTTP | Quando acontece |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Campo faltando, inválido ou desconhecido |
| `BAD_REQUEST` | 400 | Requisição malformada |
| `INVALID_JSON` | 400 | Corpo não é um JSON válido |
| `INVALID_RESET_TOKEN` | 400 | Token de recuperação inválido, expirado ou já usado |
| `MISSING_TOKEN` | 401 | Header `Authorization` ausente |
| `INVALID_TOKEN` | 401 | Token corrompido ou assinado com outro segredo |
| `TOKEN_EXPIRED` | 401 | Access token venceu — use `/auth/refresh` |
| `INVALID_CREDENTIALS` | 401 | E-mail ou senha incorretos |
| `INVALID_CURRENT_PASSWORD` | 401 | Senha atual errada na troca de senha |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token revogado, rotacionado ou desconhecido |
| `USER_NOT_ACTIVE` | 403 | Conta inativa ou bloqueada |
| `FORBIDDEN` | 403 | Sem permissão para o recurso |
| `NOT_FOUND` | 404 | Registro inexistente |
| `ROUTE_NOT_FOUND` | 404 | Rota inexistente |
| `EMAIL_ALREADY_EXISTS` | 409 | Já existe conta com esse e-mail |
| `DUPLICATE_ENTRY` | 409 | Violação de índice único |
| `TOO_MANY_REQUESTS` | 429 | Rate limit atingido |
| `NOT_IMPLEMENTED` | 501 | Módulo previsto para uma etapa futura |
| `DATABASE_UNAVAILABLE` | 503 | MySQL fora do ar |

### Autenticação

Rotas privadas exigem:

```
Authorization: Bearer <accessToken>
```

- **Access token**: 15 minutos (configurável em `JWT_ACCESS_EXPIRES_IN`).
- **Refresh token**: 30 dias, **com rotação** — ao renovar, o antigo é revogado.

Fluxo recomendado no app:

1. Guarde os dois tokens em armazenamento seguro (`expo-secure-store`).
2. Ao receber `401` com `TOKEN_EXPIRED`, chame `POST /auth/refresh`.
3. Se o refresh também falhar, leve o usuário para a tela de login.

---

## `GET /health`

Pública. Também disponível fora do prefixo, em `GET /health`.

```json
{
  "success": true,
  "data": {
    "app": "Clyvo",
    "tagline": "Transforme conversas em vendas.",
    "version": "0.1.0",
    "stage": "Etapa 1 - autenticacao",
    "environment": "development",
    "uptimeSeconds": 42,
    "database": "ok",
    "timestamp": "2026-01-05T12:00:00.000Z"
  }
}
```

Responde `503` quando o banco está inacessível.

---

## Dashboard

### `GET /api/dashboard`

Privada. Alimenta a tela **Início**. Aceita `?month=AAAA-MM`; sem o parâmetro,
usa o mês corrente.

Todos os números vêm de agregações no MySQL sobre `sales`, `opportunities`,
`quotes` e `clients` — nada é fixo no código. Numa conta nova, vêm zerados.

```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "Renan Messias", "firstName": "Renan" },
    "period": { "month": 9, "year": 2026, "label": "Setembro", "previousLabel": "Agosto" },
    "sales": {
      "total": 8450,
      "count": 5,
      "previousTotal": 6602,
      "variationPercent": 28,
      "weeklySeries": [3200, 3750, 900, 600, 0]
    },
    "opportunities": {
      "openTotal": 14200,
      "openCount": 12,
      "negotiations": 12,
      "waitingResponse": 7,
      "byStatus": [{ "status": "proposta_enviada", "label": "Proposta enviada", "count": 7, "total": 9000 }]
    },
    "quotes": { "pendingCount": 7, "pendingTotal": 9000 },
    "clients": { "total": 12, "newThisMonth": 12 },
    "needsAttention": [
      {
        "opportunityId": 4,
        "clientId": 4,
        "clientName": "Lucas Almeida",
        "whatsapp": "62966663456",
        "title": "Sistema de cameras da loja",
        "amount": 2000,
        "status": "proposta_enviada",
        "statusLabel": "Proposta enviada",
        "daysWithoutContact": 8,
        "quoteId": 4,
        "quoteNumber": 104
      }
    ],
    "followUpDays": 3
  }
}
```

**Como cada número é calculado**

| Campo | Origem |
|---|---|
| `sales.total` | `SUM(amount)` de `sales` no mês |
| `sales.variationPercent` | comparação com o mês anterior; `null` quando não houve mês anterior |
| `sales.weeklySeries` | `SUM(amount)` por semana do mês (5 posições) — alimenta o mini gráfico |
| `opportunities.openTotal` | `SUM(total_amount)` das oportunidades que não estão `fechado`/`perdido` |
| `opportunities.waitingResponse` | oportunidades em `proposta_enviada` |
| `quotes.pending*` | orçamentos em `enviado` ou `visualizado` |
| `needsAttention` | oportunidades paradas há `settings.follow_up_days` dias ou mais |

---

## Autenticação

### `POST /auth/register`

Pública. Cria conta, empresa, preferências e assinatura Free em uma única
transação — se qualquer passo falhar, nada é gravado.

**Corpo**

| Campo | Tipo | Obrigatório | Regras |
|---|---|:---:|---|
| `name` | string | ✅ | 2 a 120 caracteres |
| `email` | string | ✅ | E-mail válido, único, salvo em minúsculas |
| `password` | string | ✅ | 8 a 72 caracteres, com ao menos uma letra e um número |
| `passwordConfirmation` | string | — | Se enviado, precisa ser igual a `password` |
| `phone` | string | — | Aceita máscara; é salvo só com dígitos |
| `whatsapp` | string | — | Idem. Se omitido, recebe o valor de `phone` |
| `companyName` | string | — | Até 160 caracteres. Se omitido, usa o nome do usuário |

**201 Created**

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
      "whatsapp": "11987654321",
      "avatarUrl": null,
      "sellsType": null,
      "mainGoal": null,
      "onboardingCompleted": false,
      "status": "ativo",
      "emailVerified": false,
      "lastLoginAt": null,
      "createdAt": "2026-01-05T12:00:00.000Z",
      "updatedAt": "2026-01-05T12:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "tokenType": "Bearer",
      "expiresIn": 900
    }
  }
}
```

**Erros**: `409 EMAIL_ALREADY_EXISTS`, `422 VALIDATION_ERROR`, `429 TOO_MANY_REQUESTS`.

---

### `POST /auth/login`

Pública.

```json
{ "email": "renan@clyvo.app", "password": "Clyvo@2025" }
```

**200 OK** — mesmo formato de `/auth/register`.

**Erros**: `401 INVALID_CREDENTIALS` (mesma mensagem para e-mail inexistente e
senha errada, de propósito), `403 USER_NOT_ACTIVE`.

---

### `POST /auth/refresh`

Pública.

```json
{ "refreshToken": "eyJ..." }
```

**200 OK** — usuário + novo par de tokens. O refresh enviado deixa de valer.

**Erros**: `401 INVALID_REFRESH_TOKEN`, `401 TOKEN_EXPIRED`.

---

### `POST /auth/logout`

Privada.

```json
{ "refreshToken": "eyJ...", "allDevices": false }
```

Ambos os campos são opcionais. Com `allDevices: true`, todas as sessões do
usuário são revogadas.

**200 OK**

```json
{ "success": true, "message": "Sessao encerrada.", "data": { "revokedSessions": 1 } }
```

---

### `GET /auth/me`

Privada. Retorna tudo que o app precisa após o login.

```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "Renan Messias", "onboardingCompleted": true },
    "company": {
      "id": 1,
      "tradeName": "Messias Tech",
      "document": "12345678000190",
      "address": { "city": "Sao Paulo", "state": "SP" }
    },
    "settings": {
      "currency": "BRL",
      "followUpDays": 3,
      "quoteValidityDays": 7,
      "theme": "sistema"
    },
    "subscription": {
      "status": "ativa",
      "plan": {
        "code": "free",
        "name": "Free",
        "price": 0,
        "limits": {
          "maxClients": 5,
          "maxOpportunitiesPerMonth": 5,
          "maxQuotesPerMonth": 5,
          "maxCatalogItems": 10
        },
        "features": { "customPdf": false, "statistics": false, "followUps": false, "ai": false, "team": false }
      }
    }
  }
}
```

---

### `POST /auth/change-password`

Privada. Revoga **todas** as sessões — o app deve mandar o usuário logar de novo.

```json
{
  "currentPassword": "Clyvo@2025",
  "newPassword": "NovaSenha@2026",
  "newPasswordConfirmation": "NovaSenha@2026"
}
```

A nova senha precisa ser diferente da atual.

**Erros**: `401 INVALID_CURRENT_PASSWORD`, `422 VALIDATION_ERROR`.

---

### `POST /auth/forgot-password`

Pública.

```json
{ "email": "renan@clyvo.app" }
```

**200 OK** — a resposta é **sempre a mesma**, exista ou não a conta, para não
revelar quais e-mails estão cadastrados.

Em `NODE_ENV=development` a resposta inclui `data.devToken`, para permitir o
teste ponta a ponta antes de existir serviço de e-mail. Em produção esse campo
não aparece.

---

### `POST /auth/reset-password`

Pública.

```json
{
  "token": "TOKEN_RECEBIDO",
  "newPassword": "OutraSenha@2026",
  "newPasswordConfirmation": "OutraSenha@2026"
}
```

O token vale 30 minutos e só pode ser usado uma vez. Ao concluir, todas as
sessões são revogadas.

**Erros**: `400 INVALID_RESET_TOKEN`.

---

### `POST /auth/onboarding`

Privada. Salva as respostas do primeiro acesso, que personalizam o dashboard.

```json
{ "sellsType": "servicos_e_produtos", "mainGoal": "aumentar_vendas" }
```

| Campo | Valores aceitos |
|---|---|
| `sellsType` | `servicos`, `produtos`, `servicos_e_produtos`, `vendedor`, `loja`, `outro` |
| `mainGoal` | `organizar_clientes`, `criar_orcamentos`, `acompanhar_vendas`, `nao_esquecer_clientes`, `aumentar_vendas`, `organizar_empresa` |

---

## Usuário

### `GET /users/me` · `PATCH /users/me` · `DELETE /users/me`

`PATCH` aceita `name`, `phone`, `whatsapp` e `avatarUrl` — ao menos um campo.
Campos desconhecidos resultam em `422`.

`DELETE` faz exclusão lógica (`deleted_at`): a conta perde o acesso e o
histórico é preservado.

### `GET /users/me/settings` · `PATCH /users/me/settings`

| Campo | Tipo | Regras |
|---|---|---|
| `currency` | string | 3 letras, salvo em maiúsculas (`BRL`) |
| `locale` | string | até 10 caracteres (`pt-BR`) |
| `timezone` | string | até 64 caracteres |
| `followUpDays` | number | 1 a 60 — dias sem resposta para alertar |
| `quoteValidityDays` | number | 1 a 365 |
| `defaultWarrantyDays` | number\|null | 0 a 3650 |
| `notificationsEnabled` | boolean | |
| `whatsappSignature` | string\|null | até 255 caracteres |
| `theme` | string | `claro`, `escuro`, `sistema` |

---

## Empresa

### `GET /companies/me` · `PATCH /companies/me`

Campos: `legalName`, `tradeName`, `document`, `phone`, `whatsapp`, `email`,
`logoUrl`, `zipCode`, `street`, `number`, `complement`, `district`, `city`,
`state`, `instagram`, `website`.

Normalizações automáticas:

- `document` — aceita CPF ou CNPJ com máscara; é salvo só com dígitos (11 ou 14).
- `zipCode` — 8 dígitos.
- `state` — 2 letras, salvo em maiúsculas.
- `phone` / `whatsapp` — só dígitos.

Esses dados aparecem no cabeçalho das propostas e dos PDFs (Etapa 7).

---

## Assinatura

### `GET /subscriptions/plans`

Pública — a tela de planos aparece antes do login.

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "code": "free",
        "name": "Free",
        "price": 0,
        "billingPeriod": "gratuito",
        "limits": { "maxClients": 5, "maxOpportunitiesPerMonth": 5, "maxQuotesPerMonth": 5, "maxCatalogItems": 10 },
        "features": { "customPdf": false, "statistics": false, "followUps": false, "ai": false, "team": false }
      },
      { "code": "pro", "name": "Pro", "price": 19.9, "limits": { "maxClients": null } },
      { "code": "pro_max", "name": "Pro Max", "price": 39.9, "limits": { "maxClients": null } }
    ]
  }
}
```

`null` em um limite significa **ilimitado**.

### `GET /subscriptions/me`

Privada. Assinatura vigente com o plano e os limites.

> A cobrança real entra na Etapa 15. As tabelas `subscriptions` e `payments` já
> têm `external_provider` e `external_*_id` para o gateway que for escolhido.

---

## Módulos das próximas etapas

`/clients`, `/products`, `/services`, `/opportunities`, `/quotes`,
`/follow-ups` e `/notifications` já existem, exigem autenticação e respondem:

```json
{
  "success": false,
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "O modulo \"clientes\" sera entregue na Etapa 3. A Etapa 1 cobre arquitetura, banco de dados e autenticacao."
  }
}
```

Sem token, respondem `401` — a proteção já está valendo.

---

## Limites de requisição

| Escopo | Padrão | Variável |
|---|---|---|
| API inteira | 300 requisições / 15 min | `RATE_LIMIT_MAX_REQUESTS` |
| `register`, `login`, `forgot-password`, `reset-password` | 50 / 15 min (dev) | `AUTH_RATE_LIMIT_MAX_REQUESTS` |

Em produção, baixe o limite de autenticação para algo entre 10 e 20.
Os headers `RateLimit-*` acompanham cada resposta.
