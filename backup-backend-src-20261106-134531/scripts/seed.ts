/**
 * Popula o banco com dados de teste.
 *
 *   npm run db:seed
 *
 * Cria duas contas com carteiras separadas - uteis para conferir, na pratica,
 * que um usuario NUNCA enxerga os dados do outro.
 *
 *   1) renan@clyvo.app  / Clyvo@2025   (tecnico de informatica, plano Pro)
 *   2) maria@clyvo.app  / Clyvo@2025   (loja de moveis, plano Free)
 *
 * Alem do cadastro, o seed monta um pipeline realista (clientes, catalogo,
 * oportunidades, propostas, vendas e follow-ups) para o dashboard da tela
 * "Inicio" ter numeros de verdade vindos do banco.
 *
 * O script e idempotente: rodar de novo nao duplica nada.
 */
import { closePool, execute, queryOne, withTransaction, tx, type RowDataPacket } from '../config/database';
import { env } from '../config/env';
import type { CountRow } from '../types/models';
import { logger } from '../utils/logger';
import { toMysqlDateTime } from '../utils/dates';
import { hashPassword } from '../utils/password';
import { planRepository } from '../repositories/plan.repository';
import { userRepository } from '../repositories/user.repository';

type OpportunityStatus =
  | 'novo_contato'
  | 'proposta_enviada'
  | 'negociacao'
  | 'aguardando_pagamento'
  | 'fechado'
  | 'perdido';

interface SeedClient {
  name: string;
  phone: string;
  email?: string;
  city?: string;
}

interface SeedOpportunity {
  client: string;
  title: string;
  amount: number;
  status: OpportunityStatus;
  /** Dias desde o ultimo contato. */
  daysAgo: number;
  /** Gera tambem uma proposta enviada com este item. */
  quoteItem?: { description: string; quantity: number; unitPrice: number; discount?: number };
  deliveryTime?: string;
  warranty?: string;
}

interface SeedSale {
  client: string;
  description: string;
  amount: number;
  /** Dia do mes em que a venda aconteceu. */
  dayOfMonth: number;
  previousMonth?: boolean;
  paymentMethod: string;
}

interface SeedUser {
  name: string;
  email: string;
  password: string;
  phone: string;
  whatsapp: string;
  companyName: string;
  planCode: 'free' | 'pro' | 'pro_max';
  sellsType: 'servicos' | 'produtos' | 'servicos_e_produtos' | 'vendedor' | 'loja' | 'outro';
  mainGoal:
    | 'organizar_clientes'
    | 'criar_orcamentos'
    | 'acompanhar_vendas'
    | 'nao_esquecer_clientes'
    | 'aumentar_vendas'
    | 'organizar_empresa';
  clients: SeedClient[];
  services: Array<{ name: string; price: number; warrantyDays?: number; minutes?: number }>;
  products: Array<{ name: string; sku: string; price: number; stock: number }>;
  opportunities: SeedOpportunity[];
  sales: SeedSale[];
}

const SEED_USERS: SeedUser[] = [
  {
    name: 'Renan Messias',
    email: env.SEED_USER_EMAIL,
    password: env.SEED_USER_PASSWORD,
    phone: '11987654321',
    whatsapp: '11987654321',
    companyName: 'Messias Tech',
    planCode: 'pro',
    sellsType: 'servicos_e_produtos',
    mainGoal: 'aumentar_vendas',
    clients: [
      { name: 'Joao Silva', phone: '62999991234', email: 'joao.silva@email.com', city: 'Goiania' },
      { name: 'Carlos Pereira', phone: '62988885678', email: 'carlos@email.com', city: 'Aparecida de Goiania' },
      { name: 'Pedro Santos', phone: '62977779012', city: 'Goiania' },
      { name: 'Lucas Almeida', phone: '62966663456', email: 'lucas@email.com', city: 'Goiania' },
      { name: 'Mariana Costa', phone: '62955557890', email: 'mariana@email.com', city: 'Anapolis' },
      { name: 'Ana Lima', phone: '62944441234', email: 'ana.lima@email.com', city: 'Goiania' },
      { name: 'Rafael Souza', phone: '62933335678', city: 'Trindade' },
      { name: 'Bruno Dias', phone: '62922229012', email: 'bruno@email.com', city: 'Goiania' },
      { name: 'Juliana Alves', phone: '62911113456', city: 'Senador Canedo' },
      { name: 'Marcos Rocha', phone: '62900007890', email: 'marcos@email.com', city: 'Goiania' },
      { name: 'Tiago Nunes', phone: '62998881122', city: 'Goiania' },
      { name: 'Camila Prado', phone: '62997773344', email: 'camila@email.com', city: 'Anapolis' },
    ],
    services: [
      { name: 'Formatacao de computador', price: 120, warrantyDays: 30, minutes: 120 },
      { name: 'Instalacao de SSD', price: 80, warrantyDays: 90, minutes: 60 },
      { name: 'Configuracao de rede', price: 200, warrantyDays: 90, minutes: 180 },
      { name: 'Instalacao de camera', price: 250, warrantyDays: 90, minutes: 240 },
    ],
    products: [
      { name: 'SSD 480GB', sku: 'SSD-480', price: 219.9, stock: 8 },
      { name: 'Memoria RAM 8GB DDR4', sku: 'RAM-8G', price: 179.9, stock: 12 },
      { name: 'Camera de seguranca Full HD', sku: 'CAM-FHD', price: 289.9, stock: 6 },
    ],
    // 12 oportunidades abertas somando R$ 14.200; 7 delas com proposta enviada.
    opportunities: [
      {
        client: 'Joao Silva', title: 'Instalacao de 3 cameras', amount: 850, status: 'proposta_enviada', daysAgo: 3,
        quoteItem: { description: 'Instalacao de camera', quantity: 3, unitPrice: 300, discount: 50 },
        deliveryTime: '2 dias', warranty: '90 dias',
      },
      {
        client: 'Carlos Pereira', title: 'Montagem de rede do escritorio', amount: 1200, status: 'proposta_enviada', daysAgo: 5,
        quoteItem: { description: 'Configuracao de rede', quantity: 6, unitPrice: 200 },
        deliveryTime: '3 dias', warranty: '90 dias',
      },
      {
        client: 'Pedro Santos', title: 'Upgrade de 4 maquinas', amount: 800, status: 'proposta_enviada', daysAgo: 2,
        quoteItem: { description: 'Instalacao de SSD', quantity: 4, unitPrice: 200 },
        deliveryTime: '2 dias', warranty: '90 dias',
      },
      {
        client: 'Lucas Almeida', title: 'Sistema de cameras da loja', amount: 2000, status: 'proposta_enviada', daysAgo: 8,
        quoteItem: { description: 'Instalacao de camera', quantity: 8, unitPrice: 250 },
        deliveryTime: '4 dias', warranty: '90 dias',
      },
      {
        client: 'Mariana Costa', title: 'Manutencao preventiva mensal', amount: 1500, status: 'proposta_enviada', daysAgo: 1,
        quoteItem: { description: 'Manutencao preventiva - pacote mensal', quantity: 1, unitPrice: 1500 },
        deliveryTime: '5 dias', warranty: '30 dias',
      },
      {
        client: 'Ana Lima', title: 'Formatacao e backup', amount: 950, status: 'proposta_enviada', daysAgo: 4,
        quoteItem: { description: 'Formatacao de computador com backup', quantity: 5, unitPrice: 190 },
        deliveryTime: '3 dias', warranty: '30 dias',
      },
      {
        client: 'Rafael Souza', title: 'Infraestrutura do consultorio', amount: 1700, status: 'proposta_enviada', daysAgo: 6,
        quoteItem: { description: 'Cabeamento e configuracao de rede', quantity: 1, unitPrice: 1700 },
        deliveryTime: '5 dias', warranty: '90 dias',
      },
      { client: 'Bruno Dias', title: 'Troca de 6 SSDs', amount: 1200, status: 'negociacao', daysAgo: 1 },
      { client: 'Juliana Alves', title: 'Notebook para escritorio', amount: 900, status: 'negociacao', daysAgo: 0 },
      { client: 'Marcos Rocha', title: 'Servidor de arquivos', amount: 1300, status: 'aguardando_pagamento', daysAgo: 2 },
      { client: 'Tiago Nunes', title: 'Orcamento de rede wifi', amount: 1000, status: 'novo_contato', daysAgo: 0 },
      { client: 'Camila Prado', title: 'Manutencao de impressora', amount: 800, status: 'novo_contato', daysAgo: 1 },
    ],
    // Vendas: R$ 8.450 no mes atual e R$ 6.602 no anterior (variacao de +28%).
    sales: [
      { client: 'Carlos Pereira', description: 'Notebook Dell + instalacao', amount: 3200, dayOfMonth: 3, paymentMethod: 'pix' },
      { client: 'Lucas Almeida', description: 'Instalacao de cameras', amount: 2500, dayOfMonth: 6, paymentMethod: 'cartao' },
      { client: 'Pedro Santos', description: 'Formatacao e troca de SSD', amount: 1250, dayOfMonth: 9, paymentMethod: 'pix' },
      { client: 'Joao Silva', description: 'Configuracao de rede', amount: 900, dayOfMonth: 12, paymentMethod: 'dinheiro' },
      { client: 'Mariana Costa', description: 'Instalacao de SSD', amount: 600, dayOfMonth: 15, paymentMethod: 'pix' },
      { client: 'Ana Lima', description: 'Manutencao de notebooks', amount: 2800, dayOfMonth: 5, previousMonth: true, paymentMethod: 'pix' },
      { client: 'Rafael Souza', description: 'Instalacao de rede', amount: 2100, dayOfMonth: 11, previousMonth: true, paymentMethod: 'cartao' },
      { client: 'Bruno Dias', description: 'Upgrade de memoria', amount: 1102, dayOfMonth: 18, previousMonth: true, paymentMethod: 'pix' },
      { client: 'Juliana Alves', description: 'Formatacao', amount: 600, dayOfMonth: 24, previousMonth: true, paymentMethod: 'dinheiro' },
    ],
  },
  {
    name: 'Maria Oliveira',
    email: 'maria@clyvo.app',
    password: env.SEED_USER_PASSWORD,
    phone: '21987651234',
    whatsapp: '21987651234',
    companyName: 'Casa & Conforto Moveis',
    planCode: 'free',
    sellsType: 'loja',
    mainGoal: 'organizar_clientes',
    clients: [
      { name: 'Ana Costa', phone: '21991112222', email: 'ana@email.com', city: 'Rio de Janeiro' },
      { name: 'Bruno Lima', phone: '21993334444', city: 'Niteroi' },
    ],
    services: [{ name: 'Montagem de movel', price: 150, warrantyDays: 30, minutes: 120 }],
    products: [
      { name: 'Sofa retratil 3 lugares', sku: 'SOF-3L', price: 2499.0, stock: 3 },
      { name: 'Mesa de jantar 6 lugares', sku: 'MES-6L', price: 1899.0, stock: 2 },
    ],
    opportunities: [
      {
        client: 'Ana Costa', title: 'Sofa retratil 3 lugares', amount: 2499, status: 'proposta_enviada', daysAgo: 4,
        quoteItem: { description: 'Sofa retratil 3 lugares', quantity: 1, unitPrice: 2499 },
        deliveryTime: '10 dias', warranty: '12 meses',
      },
      { client: 'Bruno Lima', title: 'Mesa de jantar', amount: 1899, status: 'novo_contato', daysAgo: 1 },
    ],
    sales: [
      { client: 'Bruno Lima', description: 'Montagem de moveis', amount: 450, dayOfMonth: 7, paymentMethod: 'pix' },
    ],
  },
];

interface IdRow extends RowDataPacket {
  id: number;
}

async function main(): Promise<void> {
  try {
    logger.info('Iniciando seeds do Clyvo...');

    const plansCount = await queryOne<CountRow>('SELECT COUNT(*) AS total FROM plans');
    if (!plansCount || plansCount.total === 0) {
      logger.error('Nenhum plano encontrado. Rode primeiro: npm run db:migrate');
      process.exitCode = 1;
      return;
    }

    for (const seedUser of SEED_USERS) {
      await seedOneUser(seedUser);
    }

    logger.info('');
    logger.info('Seeds concluidos. Contas de teste:');
    SEED_USERS.forEach((user) => {
      logger.info(`  - ${user.email} / ${user.password}  (plano ${user.planCode})`);
    });
    logger.info('');
    logger.info('Teste agora com: npm run test:api');
  } catch (error) {
    logger.error('Falha ao executar os seeds.', error);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

async function seedOneUser(seed: SeedUser): Promise<void> {
  const existing = await userRepository.findByEmail(seed.email);
  const plan = await planRepository.findByCode(seed.planCode);

  if (!plan) {
    throw new Error(`Plano "${seed.planCode}" nao encontrado.`);
  }

  let userId: number;

  if (existing) {
    logger.info(`Usuario ${seed.email} ja existe (id ${existing.id}). Atualizando a senha de teste.`);
    await userRepository.updatePassword(existing.id, await hashPassword(seed.password));
    userId = existing.id;
  } else {
    const passwordHash = await hashPassword(seed.password);

    userId = await withTransaction(async (connection) => {
      const insertUser = await tx.execute(
        connection,
        `INSERT INTO users (name, email, password_hash, phone, whatsapp, sells_type, main_goal, onboarding_completed, email_verified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [seed.name, seed.email.toLowerCase(), passwordHash, seed.phone, seed.whatsapp, seed.sellsType, seed.mainGoal],
      );

      const newUserId = insertUser.insertId;

      await tx.execute(
        connection,
        `INSERT INTO companies (user_id, legal_name, trade_name, phone, whatsapp, email, city, state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newUserId, `${seed.companyName} LTDA`, seed.companyName, seed.phone, seed.whatsapp, seed.email, 'Goiania', 'GO'],
      );

      await tx.execute(connection, 'INSERT INTO settings (user_id) VALUES (?)', [newUserId]);

      // O usuario de teste do plano Pro entra como fundador, para exercitar
      // o preco travado.
      const founderPrice = plan.founder_price === null ? null : Number(plan.founder_price);

      await tx.execute(
        connection,
        `INSERT INTO subscriptions
           (user_id, plan_id, status, is_founder, price_paid, started_at, current_period_start, current_period_end)
         VALUES (?, ?, 'ativa', ?, ?, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`,
        [newUserId, plan.id, founderPrice === null ? 0 : 1, founderPrice ?? Number(plan.price)],
      );

      return newUserId;
    });

    logger.info(`Usuario criado: ${seed.email} (id ${userId})`);
  }

  await seedCatalog(userId, seed);
  await seedPipeline(userId, seed);
}

/** Clientes, servicos e produtos - sempre com user_id. */
async function seedCatalog(userId: number, seed: SeedUser): Promise<void> {
  for (const client of seed.clients) {
    if (await exists('clients', 'user_id = ? AND name = ? AND deleted_at IS NULL', [userId, client.name])) continue;

    await execute(
      `INSERT INTO clients (user_id, name, phone, whatsapp, email, city, state, origin, last_contact_at)
       VALUES (?, ?, ?, ?, ?, ?, 'GO', 'whatsapp', NOW())`,
      [userId, client.name, client.phone, client.phone, client.email ?? null, client.city ?? null],
    );
  }

  for (const service of seed.services) {
    if (await exists('services', 'user_id = ? AND name = ? AND deleted_at IS NULL', [userId, service.name])) continue;

    await execute(
      `INSERT INTO services (user_id, name, price, estimated_time_minutes, warranty_days)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, service.name, service.price, service.minutes ?? null, service.warrantyDays ?? null],
    );
  }

  for (const product of seed.products) {
    if (await exists('products', 'user_id = ? AND sku = ?', [userId, product.sku])) continue;

    await execute(
      `INSERT INTO products (user_id, name, sku, price, track_stock, stock) VALUES (?, ?, ?, ?, 1, ?)`,
      [userId, product.name, product.sku, product.price, product.stock],
    );
  }

  logger.info(
    `  catalogo: ${seed.clients.length} clientes, ${seed.services.length} servicos, ${seed.products.length} produtos`,
  );
}

/** Oportunidades, propostas, vendas e follow-ups - alimentam o dashboard. */
async function seedPipeline(userId: number, seed: SeedUser): Promise<void> {
  const alreadySeeded = await exists('opportunities', 'user_id = ?', [userId]);
  if (alreadySeeded) {
    logger.info('  pipeline ja existia - nada a inserir');
    return;
  }

  let quoteNumber = 100;

  for (const opportunity of seed.opportunities) {
    const clientId = await findClientId(userId, opportunity.client);
    if (!clientId) continue;

    const lastContact = toMysqlDateTime(daysAgo(opportunity.daysAgo));

    const inserted = await execute(
      `INSERT INTO opportunities (user_id, client_id, title, status, total_amount, last_contact_at, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'whatsapp', ?)`,
      [
        userId,
        clientId,
        opportunity.title,
        opportunity.status,
        opportunity.amount,
        lastContact,
        toMysqlDateTime(daysAgo(opportunity.daysAgo + 4)),
      ],
    );
    const opportunityId = inserted.insertId;

    await execute(
      `INSERT INTO opportunity_status_history (user_id, opportunity_id, from_status, to_status, note)
       VALUES (?, ?, NULL, ?, 'Criada pelo seed')`,
      [userId, opportunityId, opportunity.status],
    );

    if (!opportunity.quoteItem) continue;

    quoteNumber += 1;
    const item = opportunity.quoteItem;
    const subtotal = item.quantity * item.unitPrice;
    const discount = item.discount ?? 0;

    const quote = await execute(
      `INSERT INTO quotes
         (user_id, client_id, opportunity_id, type, number, status, subtotal, discount_type, discount_amount, total,
          delivery_time, warranty, payment_methods, valid_until, notes, sent_at, created_at)
       VALUES (?, ?, ?, 'proposta', ?, 'enviado', ?, 'valor', ?, ?, ?, ?, 'Pix / cartao / dinheiro',
               DATE_ADD(?, INTERVAL 7 DAY), 'Instalacao e configuracao dos equipamentos.', ?, ?)`,
      [
        userId,
        clientId,
        opportunityId,
        quoteNumber,
        subtotal,
        discount,
        subtotal - discount,
        opportunity.deliveryTime ?? '3 dias',
        opportunity.warranty ?? '90 dias',
        lastContact,
        lastContact,
        lastContact,
      ],
    );
    const quoteId = quote.insertId;

    await execute(
      `INSERT INTO quote_items (user_id, quote_id, item_type, description, quantity, unit_price, discount, total, sort_order)
       VALUES (?, ?, 'avulso', ?, ?, ?, ?, ?, 0)`,
      [userId, quoteId, item.description, item.quantity, item.unitPrice, discount, subtotal - discount],
    );

    await execute(
      `INSERT INTO quote_status_history (user_id, quote_id, from_status, to_status, note)
       VALUES (?, ?, 'rascunho', 'enviado', 'Enviada pelo WhatsApp')`,
      [userId, quoteId],
    );

    // Follow-up para as propostas paradas ha 3 dias ou mais.
    if (opportunity.daysAgo >= 3) {
      await execute(
        `INSERT INTO follow_ups (user_id, client_id, opportunity_id, quote_id, type, title, due_date, status, notes)
         VALUES (?, ?, ?, ?, 'recuperacao', ?, CURDATE(), 'pendente', 'Cliente ainda nao respondeu a proposta.')`,
        [userId, clientId, opportunityId, quoteId, `Retomar contato com ${opportunity.client}`],
      );
    }
  }

  for (const sale of seed.sales) {
    const clientId = await findClientId(userId, sale.client);
    if (!clientId) continue;

    const soldAt = toMysqlDateTime(dayInMonth(sale.dayOfMonth, sale.previousMonth === true));

    await execute(
      `INSERT INTO sales (user_id, client_id, description, amount, payment_method, sold_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, clientId, sale.description, sale.amount, sale.paymentMethod, soldAt, soldAt],
    );

    await execute(
      `UPDATE clients
          SET total_purchased = total_purchased + ?,
              purchases_count = purchases_count + 1,
              last_contact_at = GREATEST(COALESCE(last_contact_at, ?), ?)
        WHERE id = ? AND user_id = ?`,
      [sale.amount, soldAt, soldAt, clientId, userId],
    );
  }

  const openTotal = seed.opportunities
    .filter((item) => item.status !== 'fechado' && item.status !== 'perdido')
    .reduce((sum, item) => sum + item.amount, 0);

  logger.info(
    `  pipeline: ${seed.opportunities.length} oportunidades (R$ ${openTotal.toLocaleString('pt-BR')} em aberto), ` +
      `${seed.sales.length} vendas`,
  );
}

async function exists(table: string, where: string, params: unknown[]): Promise<boolean> {
  const row = await queryOne<CountRow>(`SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${where}`, params);
  return (row?.total ?? 0) > 0;
}

async function findClientId(userId: number, name: string): Promise<number | null> {
  const row = await queryOne<IdRow>(
    'SELECT id FROM clients WHERE user_id = ? AND name = ? AND deleted_at IS NULL LIMIT 1',
    [userId, name],
  );
  return row?.id ?? null;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

/** Dia especifico do mes atual (ou do anterior), sem cair no futuro. */
function dayInMonth(day: number, previousMonth: boolean): Date {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - (previousMonth ? 1 : 0);

  const target = new Date(Date.UTC(year, month, day, 12, 0, 0));
  const lastValid = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));

  return target.getTime() > lastValid.getTime() ? lastValid : target;
}

void main();
