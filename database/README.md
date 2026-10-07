# Clyvo — Banco de dados

MySQL 5.7+ / MariaDB 10.4+, InnoDB, `utf8mb4_unicode_ci`.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `schema.sql` | Estrutura completa: 21 tabelas, 36 FKs, 57 índices, e os 3 planos SaaS |

Não existe `seed.sql`: os dados de teste são criados por
`backend/src/scripts/seed.ts`, porque as senhas precisam passar pelo bcrypt.

## Como aplicar

```bash
cd ../backend && npm run db:migrate     # recomendado
```

ou, pelo phpMyAdmin: aba **Importar** → selecione `schema.sql`.

ou, pela linha de comando:

```bash
mysql -u root -p < schema.sql
```

## Isolamento de dados

Toda tabela de dados tem `user_id` com FK para `users` e `ON DELETE CASCADE`.
São exceções apenas `users`, `plans` e `schema_migrations`.

**Regra que não se quebra:** nenhuma consulta da API roda sem `user_id = ?`
no `WHERE`. Nem para buscar por `id`.

## Tabelas

| Tabela | Para que serve |
|---|---|
| `users` | Contas de acesso, respostas do onboarding |
| `companies` | Perfil da empresa (1:1), usado no cabeçalho dos PDFs |
| `settings` | Preferências do usuário (1:1) |
| `refresh_tokens` | Sessões ativas — guarda o hash, nunca o token |
| `password_reset_tokens` | Recuperação de senha, uso único |
| `plans` | Free, Pro e Pro Max, com limites e recursos |
| `subscriptions` | Assinatura vigente do usuário |
| `payments` | Histórico de cobranças (Etapa 15) |
| `clients` | Carteira de clientes, com métricas de compra |
| `categories` | Categorias de produtos e serviços |
| `products` | Catálogo de produtos, com estoque opcional |
| `services` | Catálogo de serviços, com tempo estimado e garantia |
| `opportunities` | Pipeline de vendas |
| `opportunity_status_history` | Auditoria das mudanças de status |
| `quotes` | Orçamentos e propostas, numerados por usuário |
| `quote_items` | Itens, com descrição congelada na criação |
| `quote_status_history` | Auditoria das propostas |
| `sales` | Vendas fechadas — base das estatísticas |
| `follow_ups` | Lembretes, recuperação de cliente e pós-venda |
| `notifications` | Avisos exibidos no app |
| `schema_migrations` | Controle de versão do banco |

## Convenções

- Chaves primárias `BIGINT UNSIGNED AUTO_INCREMENT`.
- Valores monetários em `DECIMAL(12,2)` — nunca `FLOAT`.
- `created_at` e `updated_at` em todas as tabelas de dados.
- `deleted_at` (soft delete) em `clients`, `products`, `services`,
  `opportunities`, `quotes`, `sales` e `users`.
- ENUMs em português, espelhando `backend/src/config/constants.ts`.
- Nomes de índice: `idx_<tabela>_<colunas>`; únicos: `uq_...`; FKs: `fk_...`.
