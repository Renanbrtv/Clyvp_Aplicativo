/** Integration against an isolated test database; never uses real payments or email. */
import assert from 'node:assert/strict';
import { env } from '../config/env';
import { execute, queryOne, closePool, type RowDataPacket as Row } from '../config/database';
import { marketService as s } from '../modules/marketplace/service';
import { cleanImage } from '../modules/marketplace/images';
import { profileSchema, postSchema, proposalSchema } from '../modules/marketplace/validation';
let n = 0;
const check = (v: unknown, msg: string) => {
  assert.ok(v, msg);
  console.log('OK ' + msg);
  n++;
};
async function rejects(fn: () => Promise<unknown>, msg: string) {
  await assert.rejects(fn);
  check(true, msg);
}
const base = env.SMOKE_TEST_BASE_URL + env.API_PREFIX;
const req = async (method: string, path: string, body?: unknown, token?: string) => {
  const r = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: (await r.json()) as any };
};
const password = 'MarketTest@2026',
  users: any[] = [];
async function main() {
  if (env.isProduction || !/test/i.test(env.DB_NAME)) throw new Error('Use apenas banco isolado de teste.');
  Object.assign(env, { EMAIL_API_KEY: '', REVENUECAT_SECRET_KEY: '' });
  for (const name of ['Cliente', 'Profissional', 'Outro']) {
    const email = `market.${name}.${Date.now()}@test.invalid`;
    const r = await req('POST', '/auth/register', { name, email, password });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    users.push({ ...r.body.data.user, token: r.body.data.tokens.accessToken, email });
  }
  const [c, p, o] = users,
    day = new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10),
    month = day.slice(0, 7),
    current = new Date().toISOString().slice(0, 7);
  const post = postSchema.parse({
    title: 'Instalacao de cameras',
    category: 'Instalacao de cameras',
    description: 'Preciso instalar tres cameras na minha residencia.',
    city: 'Goiania',
    region: 'GO',
    latitude: -16.68123,
    longitude: -49.24123,
    mode: 'presencial',
    budgetFrom: 100,
    budgetTo: 800,
    dueDate: day,
    photos: [],
  });
  const profile = profileSchema.parse({
    name: 'Profissional Teste',
    photo: null,
    city: 'Goiania',
    region: 'GO',
    latitude: -16.6829,
    longitude: -49.245,
    skills: ['Instalacao de cameras'],
    services: 'Instalacao e configuracao de cameras',
    experience: 'Dois anos',
    bio: 'Trabalho com instalacao de cameras e redes.',
    priceFrom: 100,
    priceTo: 800,
    availability: 'Dias uteis',
    radiusKm: 30,
    mode: 'ambos',
    published: true,
  });
  const offer = proposalSchema.parse({
    amount: 500,
    dueDate: day,
    message: 'Tenho interesse e experiencia para realizar este servico.',
    experience: 'Instalacao profissional.',
  });
  await rejects(() => s.createPost(c.id, post), 'Publicacao exige aceite das regras');
  for (const u of users) await s.preferences(u.id, { intent: 'encontrar_clientes', acceptRules: true });
  await s.saveProfile(p.id, profile);
  await s.saveProfile(o.id, { ...profile, name: 'Outro Profissional' });
  const publicP: any = await s.profile(c.id, p.id);
  check(
    publicP.profile.latitude === -16.68 && !('email' in publicP.profile),
    'Perfil aproxima coordenadas e nao expoe e-mail',
  );
  const announced = await s.createPost(c.id, post);
  const id = announced.id;
  const list: any = await s.posts(p.id, { page: 1, distance: 30, sort: 'proximas', category: post.category });
  check(
    list.posts.some((x: any) => x.id === id && x.distance_km != null),
    'Filtro de distancia calcula localizacao aproximada',
  );
  check(
    !('description' in list.posts.find((x: any) => x.id === id)!),
    'Listagem nao contorna cota de detalhes',
  );
  const first: any = await s.post(p.id, id);
  await s.post(p.id, id);
  check(
    first.post.title === post.title && (await s.me(p.id)).usage?.views === 1,
    'Reabrir detalhe nao consome duas visualizacoes',
  );
  const a = await s.propose(p.id, id, offer),
    b = await s.propose(o.id, id, { ...offer, amount: 600 });
  check(
    (await s.post(p.id, id)).proposals.length === 1 && (await s.post(c.id, id)).proposals.length === 2,
    'Propostas privadas: autor ve a sua e cliente ve recebidas',
  );
  await rejects(() => s.propose(c.id, id, offer), 'Dono nao propoe no proprio anuncio');
  await rejects(() => s.accept(o.id, a.id), 'Somente contratante aceita proposta');
  const accepted = await Promise.all([s.accept(c.id, a.id), s.accept(c.id, a.id)]);
  check(accepted[0].id === accepted[1].id, 'Aceite concorrente e idempotente');
  const w = accepted[0].id;
  await rejects(() => s.accept(c.id, b.id), 'Nao contrata duas propostas para o mesmo anuncio');
  check(
    (await req('GET', `/market/works/${w}`, undefined, o.token)).status === 404,
    'HTTP bloqueia conversa de outra conta',
  );
  const m = await s.message(c.id, w, 'Podemos combinar os detalhes aqui.');
  check((await s.work(p.id, w)).messages.length === 1, 'Mensagem compartilhada apenas entre participantes');
  await rejects(
    () =>
      s.report(o.id, {
        targetType: 'message',
        targetId: m.id,
        reason: 'Tentativa de acesso sem autorizacao',
      }),
    'Denuncia nao concede acesso a conversa de terceiros',
  );
  await rejects(() => s.review(c.id, w, 5, ''), 'Avaliacao exige servico concluido');
  await s.terms(p.id, w, { amount: 550, dueDate: day });
  await rejects(() => s.acceptTerms(p.id, w), 'Quem propos nao aceita sozinho novos termos');
  await rejects(() => s.complete(c.id, w), 'Conclusao espera resolver alteracao de termos');
  await s.acceptTerms(c.id, w);
  check(((await s.work(c.id, w)).work as any).amount === 550, 'Outra parte confirma alteracao do valor');
  const imported = await Promise.all([s.importClient(p.id, w), s.importClient(p.id, w)]);
  check(imported[0].clientId === imported[1].clientId, 'Importacao concorrente cria apenas um cliente');
  const completed = await s.complete(c.id, w);
  check(!completed.completed, 'Uma confirmacao nao encerra sozinha');
  await s.complete(p.id, w);
  await s.received(p.id, w);
  await s.received(p.id, w);
  let earnings = await s.earnings(p.id, current);
  check(
    earnings.metrics?.month_total === 550 && earnings.services?.completed === 1,
    'Recebimento idempotente entra uma vez nos ganhos',
  );
  const crmClose = await req(
    'POST',
    `/opportunities/${imported[0].opportunityId}/status`,
    { status: 'fechado', amount: 550 },
    p.token,
  );
  check(crmClose.status === 200, 'Funil antigo continua fechando oportunidades importadas');
  earnings = await s.earnings(p.id, current);
  check(earnings.metrics?.month_total === 550, 'Venda no CRM nao duplica recebimento do marketplace');
  await s.review(c.id, w, 5, 'Servico bem feito');
  await s.review(p.id, w, 4, 'Comunicacao clara');
  await rejects(() => s.review(c.id, w, 1, ''), 'Apenas uma avaliacao por participante');
  check(
    Number((await s.profile(c.id, p.id)).stats?.rating) === 5,
    'Nota publica e calculada de avaliacao real',
  );
  await s.block(p.id, c.id, true);
  await rejects(
    () => s.message(c.id, w, 'Nova mensagem bloqueada'),
    'Bloqueio bilateral impede novas mensagens',
  );
  await s.block(p.id, c.id, false);
  const report = await s.report(p.id, {
    targetType: 'message',
    targetId: m.id,
    reason: 'Mensagem para analise de moderacao',
  });
  check(report.id > 0, 'Denuncia persistida mesmo sem provedor de e-mail');
  await rejects(() => s.moderation(o.id), 'Moderacao negada a contas comuns');
  process.env.MARKET_MODERATOR_USER_IDS = String(o.id);
  const content = await s.reportContent(o.id, report.id);
  check(
    content.content?.message === 'Podemos combinar os detalhes aqui.' &&
      !JSON.stringify(content).includes('password_hash'),
    'Moderador recebe apenas conteudo relevante',
  );
  await s.resolve(o.id, report.id, { action: 'ocultar', note: 'Teste de moderacao' });
  check(
    (await s.work(p.id, w)).messages[0].message === 'Mensagem removida pela moderacao',
    'Mensagem ocultada na consulta de participantes',
  );
  const userReport = await s.report(p.id, {
    targetType: 'user',
    targetId: c.id,
    reason: 'Teste de suspensao de publicacao',
  });
  await s.resolve(o.id, userReport.id, { action: 'ocultar', note: 'Teste de bloqueio editorial' });
  await rejects(() => s.createPost(c.id, post), 'Suspensao impede novas publicacoes');
  await s.restoreUser(o.id, c.id);
  await rejects(() => s.goal(p.id, { month, amount: 2000 }), 'Meta de renda bloqueada no Free');
  const quotas = await Promise.allSettled(Array.from({ length: 7 }, () => s.createPost(c.id, post)));
  check(
    quotas.filter((x: any) => x.status === 'fulfilled').length === 4,
    'Cota de cinco publicacoes Free respeitada sob concorrencia',
  );
  const proPlan = await queryOne<Row>(
    "SELECT id,max_clients,max_quotes_per_month FROM plans WHERE code='pro'",
  );
  check(
    proPlan?.max_clients === null && proPlan.max_quotes_per_month === null,
    'Pro possui clientes e orcamentos ilimitados',
  );
  await execute('UPDATE subscriptions SET plan_id=?,current_period_end=NULL WHERE user_id=?', [
    proPlan!.id,
    p.id,
  ]);
  await s.goal(p.id, { month: current, amount: 2000 });
  check(Number((await s.earnings(p.id, current)).goal) === 2000, 'Pro salva meta mensal');
  // Fill free offer quota with distinct posts; withdraw does not refund capacity.
  const freePosts: any = await s.mine(c.id);
  let offers = 1;
  for (const item of freePosts.posts.filter((x: any) => x.status === 'aberta')) {
    await s.propose(o.id, item.id, offer);
    offers++;
  }
  check(offers === 5, 'Free envia cinco propostas no mes');
  const extra = await s.createPost(p.id, post);
  await rejects(() => s.propose(o.id, extra.id, offer), 'Sexta proposta Free e recusada');
  const secondOffer = await s.propose(
    p.id,
    freePosts.posts.find((x: any) => x.status === 'aberta').id,
    offer,
  );
  const w2 = await s.accept(c.id, secondOffer.id);
  const reused = await s.importClient(p.id, w2.id);
  check(
    reused.clientId === imported[0].clientId,
    'Segundo trabalho do mesmo contratante reutiliza cliente do CRM',
  );
  await s.complete(p.id, w2.id);
  await s.complete(c.id, w2.id);
  await s.received(p.id, w2.id);
  check(
    Number((await s.earnings(p.id, current)).recurringClients) === 1,
    'Cliente recorrente reconhecido entre CRM e marketplace',
  );
  // Detail views: concurrent attempts cannot exceed a distinct-post monthly quota.
  const viewer = await req('POST', '/auth/register', {
    name: 'Visitante Free',
    email: `viewer.${Date.now()}@test.invalid`,
    password,
  });
  const v = {
    ...viewer.body.data.user,
    email: viewer.body.data.user.email,
    token: viewer.body.data.tokens.accessToken,
  };
  users.push(v);
  const bulk = await Promise.all(
    Array.from({ length: 51 }, () =>
      execute(
        'INSERT INTO market_posts(owner_id,title,category,description,mode,photos) VALUES(?,?,?,?,?,?)',
        [p.id, 'Publicacao teste', 'Outros', 'Descricao para teste de cota de leitura', 'remoto', '[]'],
      ),
    ),
  );
  const reads = await Promise.allSettled(bulk.map((x) => s.post(v.id, x.insertId)));
  check(
    reads.filter((x) => x.status === 'fulfilled').length === 50,
    'Cota de cinquenta detalhes respeitada sob concorrencia',
  );
  const declined = reads.findIndex((x) => x.status === 'rejected');
  await execute('UPDATE subscriptions SET plan_id=? WHERE user_id=?', [proPlan!.id, v.id]);
  await s.post(v.id, bulk[declined].insertId);
  check(true, 'Upgrade Pro libera detalhes alem da cota Free');
  const exported = await req('GET', '/users/me/export', undefined, p.token);
  check(
    exported.status === 200 &&
      JSON.stringify(exported.body).includes('market_profiles') &&
      !JSON.stringify(exported.body).includes('password_hash'),
    'Exportacao inclui novos dados sem segredos',
  );
  const image =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8T8AAAAASUVORK5CYII=';
  check(cleanImage(image).startsWith('data:image/png;'), 'PNG valido aceito');
  assert.throws(() => cleanImage('data:image/jpeg;base64,/9j/wAAC/9k='));
  check(true, 'JPEG truncado e rejeitado');
  const httpInvalid = await req('POST', '/market/posts', { ...post, ownerId: o.id }, c.token);
  check(httpInvalid.status === 422, 'Campos extras nao permitem escolher dono do anuncio');
  await req('POST', '/auth/delete-account', { email: c.email, password });
  check(
    !(await queryOne<Row>('SELECT id FROM market_works WHERE id=?', [w])),
    'Exclusao de conta remove trabalho compartilhado e dependencias',
  );
  console.log(`MARKETPLACE: ${n} verificacoes aprovadas.`);
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const u of users)
      await req('POST', '/auth/delete-account', { email: u.email, password }).catch(() => {});
    await closePool();
  });
