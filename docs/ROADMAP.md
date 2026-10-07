> Documento de referência anterior. Para o estado atual, preços, integrações e bloqueios, siga ATUALIZACAO-CLY.md e ENTREGA-PUBLICACAO.md.

# Clyvo — Roadmap

Cada etapa só começa depois que a anterior está testada, integrada ao banco e
com a segurança revisada.

---

## ✅ Etapa 1 — Arquitetura, banco de dados e autenticação

**Entregue.**

- Estrutura de pastas (`backend/`, `database/`, `docs/`, `frontend/`)
- Backend Node.js + Express + TypeScript em modo `strict`
- Configuração do MySQL com pool de conexões e suporte a transações
- Schema completo: 21 tabelas, 36 FKs, 57 índices
- Repositories de usuário, empresa, preferências, planos, assinatura e tokens
- Cadastro, login, logout, refresh com rotação, troca e recuperação de senha
- JWT (access + refresh) e bcrypt
- Middleware de autenticação, validação com Zod e tratamento global de erros
- Onboarding (o que vende / objetivo principal)
- Rate limiting, Helmet, CORS
- `.env.example`, migrations, seeds e smoke test da API
- Documentação: `README.md`, `docs/API.md`, `docs/ARQUITETURA.md`

---

## ✅ Etapa 2 — Frontend, login, cadastro e dashboard

**Entregue.**

- Projeto React Native + Expo + TypeScript com expo-router
- Cliente HTTP com refresh automático de token e detecção do IP da API
- Tokens no Keychain (iOS) / Keystore (Android) via `expo-secure-store`
- Telas: splash, login, cadastro, recuperação de senha, onboarding em 2 passos
- Navegação inferior desenhada à mão: **Início · Oportunidades · Clientes · Resultados · Perfil**
- Dashboard "Início" com vendas do mês, variação, mini gráfico, oportunidades em
  aberto, negociações, aguardando resposta e "Precisa da sua atenção"
- Botão "Entrar em contato" abrindo o WhatsApp com a mensagem pronta
- Endpoint `GET /api/dashboard` com agregações reais no MySQL
- Design system aplicado: cores, tipografia, espaçamento, loading/empty/error states

Pendente para uma etapa futura: botão flutuante **+** com o menu de criação
rápida (depende dos módulos de cliente, produto e oportunidade).

## ✅ Etapas 3 a 13 — Operação completa

**Entregues.**

- **Clientes** — CRUD, busca por nome/telefone/e-mail, filtros (recentes,
  recorrentes, sem contato, alto valor), tela de detalhe com histórico de
  oportunidades, propostas e vendas, botão de WhatsApp.
- **Produtos e serviços** — catálogo com categorias, preço promocional,
  controle de estoque opcional, ativo/inativo.
- **Oportunidades** — criação rápida (cliente existente ou novo na hora),
  pipeline por status, histórico de mudanças, registro de contato.
- **Orçamentos e propostas** — itens vindos do catálogo ou avulsos, cálculo
  automático de subtotal/desconto/total, numeração sequencial por usuário
  (`#0104`), validade, prazo, garantia e forma de pagamento.
- **PDF** — gerado no próprio aparelho com `expo-print`, no layout do design
  system, com os dados da empresa no cabeçalho. Marca Clyvo no plano Free.
- **WhatsApp** — mensagens prontas para os seis momentos da venda, abertas via
  `wa.me`. Enviar a proposta move a oportunidade para "proposta enviada".
- **Pipeline** — oportunidades agrupadas por status, com tempo sem contato e
  destaque para as paradas.
- **Follow-ups** — agenda de atrasados/hoje/amanhã/semana, criados
  automaticamente ao enviar proposta e ao fechar venda; resultado do contato
  move a oportunidade.
- **Recuperação de clientes** — detecção automática das propostas paradas, com
  a mensagem de retomada pronta e o total de "dinheiro na mesa".
- **Resultados** — vendas, variação, ticket médio, taxa de conversão, propostas
  por status, pipeline, clientes novos e recorrentes, valor perdido, produtos e
  serviços mais vendidos, gráfico dos últimos 6 meses.
- **Notificações** — geradas a partir do estado real do banco (clientes sem
  resposta, dinheiro na mesa, follow-ups do dia).

## ⚠️ Etapa 14 — IA (camada pronta, provedor pendente)

`services/ai.service.ts` está implementado com provedor configurável por
`AI_PROVIDER` e `AI_API_KEY`. **Criar mensagem já funciona hoje**, usando os
templates locais. Gerar proposta e melhorar descrição respondem 503 com
mensagem clara enquanto não houver chave — falta escolher o provedor e
implementar `callProvider`.

## ⚠️ Etapa 15 — Assinatura (planos prontos, cobrança pendente)

**Preços definidos:** Free R$ 0 · Pro **R$ 14,90** · Pro Max **R$ 29,90**.

**Preço de fundador** implementado: Pro a R$ 9,90 (100 vagas) e Pro Max a
R$ 19,90 (50 vagas), vitalícios. As colunas `plans.founder_price`,
`plans.founder_slots`, `subscriptions.is_founder` e `subscriptions.price_paid`
guardam isso, e `GET /api/subscriptions/plans` já devolve quantas vagas restam.

**Limites aplicados de verdade** na criação de clientes, oportunidades,
propostas e itens de catálogo: a API responde `402 PLAN_LIMIT_REACHED` e o app
mostra o aviso. `GET /api/stats/uso-do-plano` informa quanto já foi usado.
A tela **Planos** no app mostra os três planos, o uso do mês e as vagas de
fundador restantes.

Falta a cobrança em si: escolher o gateway (Mercado Pago, Asaas, Stripe),
implementar o checkout e o webhook. `POST /api/subscriptions/upgrade` já existe
e responde `checkoutReady: false` com a mensagem certa enquanto isso.
As tabelas `subscriptions` e `payments` já têm `external_provider` e
`external_*_id` prontos.

## Próximos passos sugeridos

- Notificações push (precisa de `expo-notifications` e do projectId do Expo)
- Upload de logo e foto de produto (decidir o storage)
- Envio de e-mail na recuperação de senha (escolher SMTP/Resend/SendGrid)
- Equipe e múltiplos usuários (Pro Max)
