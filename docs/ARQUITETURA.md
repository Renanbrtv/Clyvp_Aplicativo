# Clyvo — Arquitetura

Este documento explica **por que** o backend está organizado assim e **como**
adicionar um módulo novo sem quebrar o padrão.

---

## 1. Camadas

```
requisição HTTP
      │
      ▼
   routes/          desenho da URL, middlewares aplicados
      │
      ▼
   middleware/      autenticação (JWT) → validação (Zod) → rate limit
      │
      ▼
   controllers/     lê req, chama o service, devolve a resposta
      │
      ▼
   services/        regra de negócio, transações, orquestração
      │
      ▼
   repositories/    único lugar que escreve SQL
      │
      ▼
     MySQL
```

Regras que mantêm isso saudável:

- **Controller não escreve SQL.** Ele só traduz HTTP ↔ service.
- **Repository não decide regra.** Ele lê e grava, nada mais.
- **Service não conhece `req`/`res`.** Recebe dados já validados e devolve dados.
- **Validação acontece antes do controller**, nunca dentro dele.

O ganho prático: para testar uma regra de negócio, você chama o service
direto — sem subir servidor HTTP.

---

## 2. Onde fica cada coisa

| Pasta | Responsabilidade | Exemplo |
|---|---|---|
| `config/` | Ambiente validado, pool MySQL, enums do domínio | `env.ts`, `database.ts`, `constants.ts` |
| `middleware/` | Tudo que roda antes do controller | `authenticate.ts`, `validate.ts` |
| `validators/` | Schemas Zod de entrada | `auth.validator.ts` |
| `controllers/` | Adaptador HTTP | `auth.controller.ts` |
| `services/` | Regra de negócio | `auth.service.ts` |
| `repositories/` | SQL | `user.repository.ts` |
| `types/` | Tipos de linha do banco e de saída da API | `models.ts` |
| `utils/` | Funções puras reaproveitáveis | `jwt.ts`, `password.ts` |
| `scripts/` | Ferramentas de linha de comando | `migrate.ts`, `seed.ts` |

---

## 3. Decisões técnicas

### Por que TypeScript em modo `strict`

`strict: true` e `noUnusedLocals` deixam o compilador pegar o que, em JavaScript,
só apareceria em produção: campo nulo não tratado, import esquecido, retorno
faltando. Custa alguns minutos a mais na escrita e evita horas de depuração.

### Por que `mysql2` e não um ORM

Nesta fase, ver o SQL ajuda a aprender e a entender o custo de cada consulta.
Os repositories isolam o SQL num lugar só — se um dia valer a pena trocar por
Prisma ou Drizzle, o resto do código não muda.

Todas as consultas usam **placeholders (`?`)**. Nenhum valor é concatenado na
string SQL — é assim que SQL injection deixa de ser possível.

### Por que dois tokens (access + refresh)

- O **access token** é curto (15 min). Se vazar, o estrago é limitado.
- O **refresh token** é longo (30 dias) e fica salvo no banco **como hash**,
  então pode ser revogado a qualquer momento — algo que um JWT sozinho não permite.
- A cada renovação o refresh antigo é revogado (**rotação**). Se alguém tentar
  reutilizar um token já usado, a chamada falha.

### Por que validar o `.env` no boot

`config/env.ts` valida tudo com Zod antes de qualquer coisa subir. Um segredo
curto ou uma variável faltando derrubam o processo **na hora**, com mensagem
clara — em vez de gerar um erro obscuro três dias depois.

### Por que `user_id` em toda tabela

É a garantia de isolamento. Um usuário do Clyvo jamais pode ver cliente,
produto ou proposta de outro. Duas travas:

1. **No banco**: `user_id` com FK para `users` e `ON DELETE CASCADE`.
2. **No código**: todo `WHERE` de repository inclui `user_id = ?`.

Nunca busque um registro só pelo `id`. Sempre `WHERE id = ? AND user_id = ?` —
mesmo que pareça redundante. É o que impede um usuário de acessar o recurso de
outro trocando o número na URL.

### Por que respostas padronizadas

O app mobile trata todas as respostas do mesmo jeito: `success`, `data`,
`error.code`. O `code` é estável (`INVALID_CREDENTIALS`, `TOKEN_EXPIRED`), então
a interface reage ao código e não ao texto da mensagem.

### Por que soft delete

`deleted_at` preserva histórico de vendas e propostas mesmo quando o usuário
apaga um cliente. Todas as buscas filtram `deleted_at IS NULL`.

---

## 4. Como criar um módulo novo

Exemplo: **clientes** (Etapa 3). A tabela `clients` já existe no schema.

**1. Tipos** — `types/models.ts`

```ts
export interface ClientRow extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  // ...
}
```

**2. Repository** — `repositories/client.repository.ts`

```ts
export const clientRepository = {
  async findById(userId: number, id: number): Promise<ClientRow | null> {
    // user_id SEMPRE no WHERE
    return queryOne<ClientRow>(
      'SELECT * FROM clients WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId],
    );
  },
};
```

**3. Validator** — `validators/client.validator.ts`

```ts
export const createClientSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
}).strict();
```

**4. Service** — `services/client.service.ts`
Regra de negócio: limite do plano, atualização de métricas, etc.

**5. Controller** — `controllers/client.controller.ts`

```ts
async create(req: Request, res: Response) {
  const user = requireUser(req);
  const client = await clientService.create(user.id, req.body);
  return sendCreated(res, { client }, 'Cliente cadastrado.');
}
```

**6. Rotas** — `routes/client.routes.ts`

```ts
const router = Router();
router.use(authenticate);
router.post('/', validate(createClientSchema), asyncHandler(clientController.create));
export { router as clientRoutes };
```

**7. Registre** em `routes/index.ts`, substituindo a linha
`router.use('/clients', createUpcomingRouter(...))` por
`router.use('/clients', clientRoutes)`.

**8. Teste** — acrescente um bloco em `scripts/smoke-test.ts`.

---

## 5. Checklist antes de fechar uma etapa

- [ ] `npm run typecheck` sem erros
- [ ] `npm run build` gera `dist/` sem erros
- [ ] `npm run db:reset && npm run db:seed` roda limpo
- [ ] `npm run test:api` passa 100%
- [ ] Toda consulta nova filtra por `user_id`
- [ ] Toda entrada nova tem schema Zod com `.strict()`
- [ ] Nenhum segredo entrou no código
- [ ] Endpoints novos documentados em `docs/API.md`

---

## 6. Pontos de integração futura

Cada item abaixo já tem lugar reservado na arquitetura:

| Integração | Onde encaixa | Etapa |
|---|---|---|
| Envio de e-mail | `auth.service.ts`, método `forgotPassword` (marcado com `TODO`) | — |
| Geração de PDF | Novo `services/pdf.service.ts`, lendo `companies` + `quotes` + `quote_items` | 7 |
| WhatsApp | Monta a URL `https://wa.me/<numero>?text=<mensagem>` no app; o backend fornece o texto | 8 |
| IA | Novo `services/ai.service.ts`, usando `AI_PROVIDER` e `AI_API_KEY` do `.env` | 14 |
| Pagamento | `subscriptions.external_provider` + tabela `payments`; webhook em `routes/webhooks.routes.ts` | 15 |
| Upload de imagens | `logo_url` e `photo_url` já guardam URL; falta escolher o storage | — |

---

## 7. Modelo de dados em resumo

```
users ─┬─ companies        (1:1)  dados que aparecem no PDF
       ├─ settings         (1:1)  preferências
       ├─ subscriptions ── plans  plano e limites
       ├─ payments                histórico de cobranças
       ├─ clients ─┬─ opportunities ─┬─ opportunity_status_history
       │           │                 └─ quotes ─┬─ quote_items
       │           │                            └─ quote_status_history
       │           ├─ sales                     faturamento
       │           └─ follow_ups                lembretes e recuperação
       ├─ categories ─┬─ products
       │              └─ services
       ├─ notifications
       ├─ refresh_tokens          sessões ativas
       └─ password_reset_tokens
```

21 tabelas, 36 chaves estrangeiras. Detalhes em `database/schema.sql`.
