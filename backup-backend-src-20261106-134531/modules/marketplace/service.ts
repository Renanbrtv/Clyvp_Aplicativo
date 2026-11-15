import { execute, query, queryOne, withTransaction, type RowDataPacket as Row } from '../../config/database';
import { userRepository } from '../../repositories/user.repository';
import { clientRepository } from '../../repositories/client.repository';
import { opportunityRepository } from '../../repositories/opportunity.repository';
import { subscriptionRepository } from '../../repositories/subscription.repository';
import { planLimitService } from '../../services/plan-limit.service';
import { billingService } from '../../services/billing.service';
import { AppError } from '../../utils/app-error';
import { supportService } from '../../services/support.service';
import { cleanImage } from './images';
import {
  RULES_VERSION,
  categories,
  type ProfileInput,
  type PostInput,
  type ProposalInput,
} from './validation';
export const parseJson = (v: any, fallback: any = null) =>
  v == null ? fallback : typeof v === 'string' ? JSON.parse(v) : v;
const month = () => new Date().toISOString().slice(0, 7);
const approx = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);
const date = (v: any) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').slice(0, 10));
const row = (sql: string, args: unknown[] = []) => queryOne<Row>(sql, args);
const rows = (sql: string, args: unknown[] = []) => query<Row>(sql, args);
export const isModerator = (id: number) =>
  (process.env.MARKET_MODERATOR_USER_IDS ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .includes(String(id));
async function active(id: number) {
  if (await row('SELECT user_id FROM market_suspensions WHERE user_id=?', [id]))
    throw AppError.forbidden(
      'Seu acesso de publicacao ao marketplace foi suspenso. Entre em contato com o suporte.',
      'MARKET_SUSPENDED',
    );
}
async function consent(id: number) {
  await active(id);
  if (
    (await row('SELECT consent_version FROM market_preferences WHERE user_id=?', [id]))?.consent_version !==
    RULES_VERSION
  )
    throw AppError.forbidden('Leia e aceite as regras do marketplace antes de publicar.', 'MARKET_CONSENT');
}
async function blocked(a: number, b: number) {
  return Boolean(
    await row(
      'SELECT user_id FROM market_blocks WHERE (user_id=? AND target_id=?) OR (user_id=? AND target_id=?)',
      [a, b, b, a],
    ),
  );
}
async function assertPair(a: number, b: number) {
  if (await blocked(a, b))
    throw AppError.forbidden('Interacao indisponivel entre estas contas.', 'MARKET_BLOCKED');
}
async function plan(id: number) {
  return (await subscriptionRepository.findCurrentByUserId(id))?.plan_code ?? 'free';
}
async function lockUsers(...ids: number[]) {
  for (const id of [...new Set(ids)].sort((a, b) => a - b)) await userRepository.lock(id);
}
async function quota(id: number, kind: 'offers' | 'posts' | 'views') {
  const p = await plan(id);
  const limits =
    p === 'free'
      ? { offers: 5, posts: 5, views: 50 }
      : p === 'pro'
        ? { offers: 50, posts: 30, views: null }
        : { offers: 150, posts: 60, views: null };
  const limit = limits[kind];
  if (limit === null) return;
  const n =
    kind === 'views'
      ? (await row('SELECT COUNT(*) n FROM market_views WHERE user_id=? AND month_key=?', [id, month()]))!.n
      : (await row(
          `SELECT COUNT(*) n FROM ${kind === 'offers' ? 'market_proposals' : 'market_posts'} WHERE ${kind === 'offers' ? 'professional_id' : 'owner_id'}=? AND created_at>=?`,
          [id, month() + '-01'],
        ))!.n;
  if (n >= limit)
    throw new AppError(
      `Voce atingiu ${limit} ${kind === 'offers' ? 'propostas' : kind === 'posts' ? 'publicacoes' : 'oportunidades detalhadas'} neste mes. Consulte os planos ou aguarde o proximo mes.`,
      402,
      'MARKET_LIMIT',
    );
}
function publicProfile(p: Row) {
  return {
    ...p,
    skills: parseJson(p.skills, []),
    published: Boolean(p.published),
    price_from: p.price_from === null ? null : Number(p.price_from),
    price_to: p.price_to === null ? null : Number(p.price_to),
  };
}
function postData(p: Row) {
  return { ...p, photos: parseJson(p.photos, []), due_date: p.due_date ? date(p.due_date) : null };
}
async function postById(id: number) {
  const p = await row(
    `SELECT p.*,CASE WHEN EXISTS(SELECT 1 FROM market_content_reviews cr WHERE cr.target_type='profile' AND cr.target_id=mp.user_id AND cr.state='approved') THEN mp.name ELSE 'Usuário do Clyvo' END owner_name FROM market_posts p JOIN users u ON u.id=p.owner_id LEFT JOIN market_profiles mp ON mp.user_id=p.owner_id WHERE p.id=?`,
    [id],
  );
  if (!p) throw AppError.notFound('Oportunidade nao encontrada.');
  return p;
}
async function workById(actor: number, id: number, locking = false) {
  const w = await row(`SELECT * FROM market_works WHERE id=? ${locking ? 'FOR UPDATE' : ''}`, [id]);
  if (!w || ![w.customer_id, w.professional_id].includes(actor))
    throw AppError.notFound('Trabalho nao encontrado.');
  return w;
}
async function mutateWork<T>(actor: number, id: number, fn: (w: Row) => Promise<T>) {
  const initial = await workById(actor, id);
  return withTransaction(async () => {
    await lockUsers(initial.customer_id, initial.professional_id);
    return fn(await workById(actor, id, true));
  });
}
const hideBlocked = `NOT EXISTS(SELECT 1 FROM market_blocks b WHERE (b.user_id=? AND b.target_id=p.owner_id) OR (b.target_id=? AND b.user_id=p.owner_id))`;
const approvedPost = `EXISTS(SELECT 1 FROM market_content_reviews cr WHERE cr.target_type='post' AND cr.target_id=p.id AND cr.state='approved')`;
const approvedProfile = `EXISTS(SELECT 1 FROM market_content_reviews cr WHERE cr.target_type='profile' AND cr.target_id=p.user_id AND cr.state='approved')`;
async function queueContent(type: 'post' | 'profile', target: number, owner: number) {
  await execute(`INSERT INTO market_content_reviews(target_type,target_id,owner_id) VALUES(?,?,?)
    ON DUPLICATE KEY UPDATE state='pending',revision=revision+1,note='',moderator_id=NULL`, [type,target,owner]);
}
async function reviewState(type: 'post' | 'profile', target: number) {
  return await row('SELECT state,revision,note FROM market_content_reviews WHERE target_type=? AND target_id=?', [type,target])
    ?? { state: 'pending', revision: 0, note: '' };
}
async function acceptPostRules(id: number, accepted?: boolean) {
  if (accepted) await execute(`INSERT INTO market_preferences(user_id,consent_version,consent_at) VALUES(?,?,UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE consent_version=VALUES(consent_version),consent_at=VALUES(consent_at)`, [id,RULES_VERSION]);
  await consent(id);
}
export const marketService = {
  async me(id: number) {
    const [preferences, profile, p] = await Promise.all([
      row('SELECT * FROM market_preferences WHERE user_id=?', [id]),
      row('SELECT * FROM market_profiles WHERE user_id=?', [id]),
      plan(id),
    ]);
    const usage = await row(
      `SELECT (SELECT COUNT(*) FROM market_proposals WHERE professional_id=? AND created_at>=?) offers,(SELECT COUNT(*) FROM market_posts WHERE owner_id=? AND created_at>=?) posts,(SELECT COUNT(*) FROM market_views WHERE user_id=? AND month_key=?) views`,
      [id, month() + '-01', id, month() + '-01', id, month()],
    );
    return {
      accountId: id,
      preferences,
      profile: profile ? { ...publicProfile(profile), moderation: await reviewState('profile', id) } : null,
      plan: p,
      usage,
      rulesVersion: RULES_VERSION,
      moderator: isModerator(id),
      stats: profile ? (await marketService.profile(id, id)).stats : null,
      categories,
    };
  },
  async preferences(id: number, input: { intent: string; acceptRules?: boolean }) {
    await execute(
      `INSERT INTO market_preferences(user_id,intent,consent_version,consent_at) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE intent=VALUES(intent),consent_version=IF(? IS NULL,consent_version,VALUES(consent_version)),consent_at=IF(? IS NULL,consent_at,VALUES(consent_at))`,
      [
        id,
        input.intent,
        input.acceptRules ? RULES_VERSION : null,
        input.acceptRules ? new Date() : null,
        input.acceptRules ?? null,
        input.acceptRules ?? null,
      ],
    );
    return marketService.me(id);
  },
  async saveProfile(id: number, input: ProfileInput) {
    await active(id);
    if (input.published) await acceptPostRules(id, input.acceptRules);
    const photo = input.photo ? cleanImage(input.photo) : null;
    return withTransaction(async () => {
    await lockUsers(id);
    await execute(
      `INSERT INTO market_profiles(user_id,name,photo,city,region,latitude,longitude,skills,services,experience,bio,price_from,price_to,availability,radius_km,mode,published) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),photo=VALUES(photo),city=VALUES(city),region=VALUES(region),latitude=VALUES(latitude),longitude=VALUES(longitude),skills=VALUES(skills),services=VALUES(services),experience=VALUES(experience),bio=VALUES(bio),price_from=VALUES(price_from),price_to=VALUES(price_to),availability=VALUES(availability),radius_km=VALUES(radius_km),mode=VALUES(mode),published=VALUES(published)`,
      [
        id,
        input.name,
        photo,
        input.city,
        input.region,
        approx(input.latitude),
        approx(input.longitude),
        JSON.stringify([...new Set(input.skills)]),
        input.services,
        input.experience,
        input.bio,
        input.priceFrom,
        input.priceTo,
        input.availability,
        input.radiusKm,
        input.mode,
        input.published ? 1 : 0,
      ],
    );
    await queueContent('profile', id, id);
    return marketService.me(id);
    });
  },
  async profile(viewer: number, id: number) {
    if (viewer !== id) {
      await assertPair(viewer, id);
      await active(id);
    }
    const p = await row('SELECT * FROM market_profiles WHERE user_id=?', [id]);
    if (!p || (viewer !== id && (!p.published || (await reviewState('profile', id)).state !== 'approved'))) throw AppError.notFound('Perfil profissional indisponível.');
    const stats = await row(
      `SELECT (SELECT COUNT(*) FROM market_works WHERE professional_id=? AND status='concluido') completed, (SELECT COUNT(*) FROM market_reviews WHERE target_id=? AND hidden=0) reviews, (SELECT AVG(stars) FROM market_reviews WHERE target_id=? AND hidden=0) rating`,
      [id, id, id],
    );
    const reviews = await rows(
      `SELECT r.id,r.author_id,r.stars,r.comment,r.created_at,COALESCE(mp.name,u.name) author_name FROM market_reviews r JOIN users u ON u.id=r.author_id LEFT JOIN market_profiles mp ON mp.user_id=r.author_id WHERE r.target_id=? AND r.hidden=0 ORDER BY r.id DESC LIMIT 50`,
      [id],
    );
    return { profile: publicProfile(p), stats, reviews };
  },
  async professionals(viewer: number, search: string, page: number) {
    return {
      profiles: await rows(
        `SELECT p.user_id,p.name,p.city,p.region,p.skills,p.bio,p.price_from,p.price_to,p.mode,(SELECT AVG(stars) FROM market_reviews WHERE target_id=p.user_id AND hidden=0) rating FROM market_profiles p WHERE p.published=1 AND ${approvedProfile} AND NOT EXISTS(SELECT 1 FROM market_suspensions WHERE user_id=p.user_id) AND NOT EXISTS(SELECT 1 FROM market_blocks b WHERE (b.user_id=? AND b.target_id=p.user_id) OR (b.target_id=? AND b.user_id=p.user_id)) AND (p.name LIKE ? OR p.skills LIKE ? OR p.city LIKE ?) ORDER BY p.updated_at DESC LIMIT 20 OFFSET ?`,
        [viewer, viewer, '%' + search + '%', '%' + search + '%', '%' + search + '%', (page - 1) * 20],
      ),
    };
  },
  async posts(
    viewer: number,
    f: {
      category?: string;
      search?: string;
      mode?: string;
      city?: string;
      min?: number;
      max?: number;
      date?: string;
      distance?: number;
      sort?: string;
      page: number;
    },
  ) {
    const origin = await row('SELECT latitude,longitude FROM market_profiles WHERE user_id=?', [viewer]);
    const hasOrigin = origin?.latitude != null && origin?.longitude != null;
    if ((f.distance || f.sort === 'proximas') && !hasOrigin)
      throw AppError.badRequest('Informe um ponto aproximado no seu perfil para filtrar por distancia.');
    const distance = hasOrigin
      ? 'ROUND(6371*2*ASIN(SQRT(LEAST(1,POW(SIN(RADIANS(p.latitude-?)/2),2)+COS(RADIANS(?))*COS(RADIANS(p.latitude))*POW(SIN(RADIANS(p.longitude-?)/2),2)))),1)'
      : 'NULL';
    const values: any[] = hasOrigin ? [origin.latitude, origin.latitude, origin.longitude] : [];
    let where = `p.status='aberta' AND p.hidden=0 AND ${approvedPost} AND (p.due_date IS NULL OR p.due_date>=UTC_DATE()) AND NOT EXISTS(SELECT 1 FROM market_suspensions WHERE user_id=p.owner_id) AND ${hideBlocked}`;
    values.push(viewer, viewer);
    if (f.search) {
      where += ' AND (p.title LIKE ? OR p.description LIKE ?)';
      values.push('%' + f.search + '%', '%' + f.search + '%');
    }
    for (const [key, val] of [
      ['category', f.category],
      ['mode', f.mode],
    ] as const)
      if (val) {
        where += ` AND p.${key}=?`;
        values.push(val);
      }
    if (f.city) {
      where += ' AND p.city LIKE ?';
      values.push('%' + f.city + '%');
    }
    if (f.min !== undefined) {
      where += ' AND COALESCE(p.budget_to,p.budget_from)>=?';
      values.push(f.min);
    }
    if (f.max !== undefined) {
      where += ' AND COALESCE(p.budget_from,p.budget_to)<=?';
      values.push(f.max);
    }
    if (f.date) {
      where += ' AND p.due_date<=?';
      values.push(f.date);
    }
    let sql = `SELECT p.id,p.owner_id,p.title,p.category,p.city,p.region,p.mode,p.budget_from,p.budget_to,p.due_date,p.created_at,JSON_UNQUOTE(JSON_EXTRACT(p.photos,'$[0]')) thumbnail,${distance} distance_km FROM market_posts p WHERE ${where}`;
    if (f.distance) {
      sql += ' HAVING distance_km IS NOT NULL AND distance_km<=?';
      values.push(f.distance);
    }
    sql +=
      f.sort === 'proximas' ? ' ORDER BY distance_km IS NULL,distance_km,p.id DESC' : ' ORDER BY p.id DESC';
    sql += ' LIMIT 20 OFFSET ?';
    values.push((f.page - 1) * 20);
    return {
      posts: (await rows(sql, values)).map((p) => ({ ...p, mine: p.owner_id === viewer, due_date: p.due_date ? date(p.due_date) : null })),
      page: f.page,
    };
  },
  async post(viewer: number, id: number) {
    const p = await postById(id);
    const mine = p.owner_id === viewer;
    const moderation = await reviewState('post', id);
    if (!mine && (p.hidden || moderation.state !== 'approved')) throw AppError.notFound('Oportunidade indisponível.');
    const work = await row('SELECT id,customer_id,professional_id FROM market_works WHERE post_id=?', [id]);
    const participant = work && [work.customer_id, work.professional_id].includes(viewer);
    if (!mine && !participant) {
      await assertPair(viewer, p.owner_id);
      await active(p.owner_id);
      if (p.hidden || p.status !== 'aberta') throw AppError.notFound('Oportunidade indisponivel.');
      await withTransaction(async () => {
        await lockUsers(viewer);
        const old = await row(
          'SELECT user_id FROM market_views WHERE user_id=? AND post_id=? AND month_key=?',
          [viewer, id, month()],
        );
        if (!old) {
          await quota(viewer, 'views');
          await execute('INSERT INTO market_views(user_id,post_id,month_key) VALUES(?,?,?)', [
            viewer,
            id,
            month(),
          ]);
        }
      });
    }
    const offers = mine
      ? await rows(
          `SELECT a.*,COALESCE(mp.name,u.name) professional_name,(SELECT AVG(stars) FROM market_reviews WHERE target_id=a.professional_id AND hidden=0) rating FROM market_proposals a JOIN users u ON u.id=a.professional_id LEFT JOIN market_profiles mp ON mp.user_id=a.professional_id WHERE a.post_id=? ORDER BY a.created_at DESC`,
          [id],
        )
      : await rows('SELECT * FROM market_proposals WHERE post_id=? AND professional_id=?', [id, viewer]);
    const metrics = mine ? await row(`SELECT COUNT(DISTINCT user_id) view_count FROM market_views WHERE post_id=? AND user_id<>?`, [id,viewer]) : null;
    return { post: { ...postData(p), ...(mine ? { moderation, ...metrics } : {}) }, proposals: offers, workId: participant ? work!.id : null };
  },
  async createPost(id: number, input: PostInput) {
    await acceptPostRules(id, input.acceptRules);
    await billingService.sync(id);
    const photos = input.photos.map(cleanImage);
    return withTransaction(async () => {
      await lockUsers(id);
      await quota(id, 'posts');
      const result = await execute(
        `INSERT INTO market_posts(owner_id,title,category,description,city,region,latitude,longitude,mode,budget_from,budget_to,due_date,photos) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          input.title,
          input.category,
          input.description,
          input.city,
          input.region,
          approx(input.latitude),
          approx(input.longitude),
          input.mode,
          input.budgetFrom,
          input.budgetTo,
          input.dueDate,
          JSON.stringify(photos),
        ],
      );
      await queueContent('post', result.insertId, id);
      return { id: result.insertId, moderation: 'pending' };
    });
  },
  async editPost(actor: number, id: number, input: PostInput) {
    await acceptPostRules(actor, input.acceptRules);
    const photos = input.photos.map(cleanImage);
    return withTransaction(async () => {
      await lockUsers(actor);
      const p = await row('SELECT * FROM market_posts WHERE id=? FOR UPDATE', [id]);
      if (!p || p.owner_id !== actor) throw AppError.notFound('Publicação não encontrada.');
      if (p.status !== 'aberta' || p.hidden) throw AppError.conflict('Esta publicação não pode ser editada.');
      await execute(`UPDATE market_posts SET title=?,category=?,description=?,city=?,region=?,latitude=?,longitude=?,mode=?,budget_from=?,budget_to=?,due_date=?,photos=? WHERE id=?`,
        [input.title,input.category,input.description,input.city,input.region,approx(input.latitude),approx(input.longitude),input.mode,input.budgetFrom,input.budgetTo,input.dueDate,JSON.stringify(photos),id]);
      await queueContent('post', id, actor);
      return { id, moderation: 'pending' };
    });
  },
  async cancelPost(actor: number, id: number) {
    return withTransaction(async () => {
      await lockUsers(actor);
      const p = await row('SELECT * FROM market_posts WHERE id=? FOR UPDATE', [id]);
      if (!p || p.owner_id !== actor) throw AppError.notFound('Oportunidade nao encontrada.');
      if (p.status !== 'aberta')
        throw AppError.conflict('A oportunidade ja possui um trabalho ou esta encerrada.');
      await execute("UPDATE market_posts SET status='cancelada' WHERE id=?", [id]);
      await execute("UPDATE market_proposals SET status='recusada' WHERE post_id=? AND status='enviada'", [
        id,
      ]);
      return { cancelled: true };
    });
  },
  async propose(actor: number, id: number, input: ProposalInput) {
    await consent(actor);
    await billingService.sync(actor);
    const p = await postById(id);
    if (p.owner_id === actor) throw AppError.badRequest('Voce nao pode propor no proprio anuncio.');
    await assertPair(actor, p.owner_id);
    await active(p.owner_id);
    if (!(await row('SELECT user_id FROM market_profiles WHERE user_id=? AND published=1', [actor])))
      throw AppError.badRequest('Publique seu perfil profissional antes de enviar uma proposta.');
    return withTransaction(async () => {
      await lockUsers(actor);
      if ((await reviewState('profile', actor)).state !== 'approved')
        throw AppError.conflict('Seu perfil precisa ser aprovado antes de enviar propostas.');
      const current = await row('SELECT * FROM market_posts WHERE id=? FOR UPDATE', [id]);
      if (
        !current ||
        current.status !== 'aberta' ||
        current.hidden ||
        (await reviewState('post', id)).state !== 'approved' ||
        (current.due_date && date(current.due_date) < new Date().toISOString().slice(0, 10))
      )
        throw AppError.conflict('Esta oportunidade nao aceita novas propostas.');
      const old = await row('SELECT id FROM market_proposals WHERE post_id=? AND professional_id=?', [
        id,
        actor,
      ]);
      if (old) throw AppError.conflict('Voce ja enviou uma proposta para esta oportunidade.');
      await quota(actor, 'offers');
      const result = await execute(
        'INSERT INTO market_proposals(post_id,professional_id,amount,due_date,message,experience) VALUES(?,?,?,?,?,?)',
        [id, actor, input.amount, input.dueDate, input.message, input.experience],
      );
      return { id: result.insertId };
    });
  },
  async withdraw(actor: number, id: number) {
    const result = await execute(
      "UPDATE market_proposals SET status='retirada' WHERE id=? AND professional_id=? AND status='enviada'",
      [id, actor],
    );
    if (!result.affectedRows) throw AppError.conflict('Esta proposta nao pode mais ser retirada.');
    return { withdrawn: true };
  },
  async accept(actor: number, id: number) {
    await consent(actor);
    const initial = await row(
      'SELECT a.*,p.owner_id FROM market_proposals a JOIN market_posts p ON p.id=a.post_id WHERE a.id=?',
      [id],
    );
    if (!initial || initial.owner_id !== actor) throw AppError.notFound('Proposta nao encontrada.');
    await assertPair(actor, initial.professional_id);
    await active(initial.professional_id);
    return withTransaction(async () => {
      await lockUsers(actor, initial.professional_id);
      const p = await row('SELECT * FROM market_posts WHERE id=? FOR UPDATE', [initial.post_id]);
      const a = await row('SELECT * FROM market_proposals WHERE id=? FOR UPDATE', [id]);
      const existing = await row('SELECT id,proposal_id FROM market_works WHERE post_id=?', [
        initial.post_id,
      ]);
      if (existing) {
        if (existing.proposal_id === id) return { id: existing.id };
        throw AppError.conflict('Outro profissional ja foi escolhido.');
      }
      if (!p || p.status !== 'aberta' || p.hidden || (await reviewState('post', p.id)).state !== 'approved' || !a || a.status !== 'enviada')
        throw AppError.conflict('Proposta indisponivel.');
      if (date(a.due_date) < new Date().toISOString().slice(0, 10))
        throw AppError.conflict('O prazo desta proposta ja passou.');
      const result = await execute(
        'INSERT INTO market_works(post_id,proposal_id,customer_id,professional_id,title,amount,due_date) VALUES(?,?,?,?,?,?,?)',
        [p.id, id, actor, a.professional_id, p.title, a.amount, a.due_date],
      );
      await execute("UPDATE market_posts SET status='contratada' WHERE id=?", [p.id]);
      await execute(
        "UPDATE market_proposals SET status=IF(id=?,'aceita','recusada') WHERE post_id=? AND status='enviada'",
        [id, p.id],
      );
      return { id: result.insertId };
    });
  },
  async mine(id: number) {
    return {
      posts: (await rows(`SELECT p.*,cr.state moderation_state,cr.note moderation_note,
        (SELECT COUNT(DISTINCT v.user_id) FROM market_views v WHERE v.post_id=p.id AND v.user_id<>p.owner_id) view_count,
        (SELECT COUNT(*) FROM market_proposals a WHERE a.post_id=p.id) proposal_count,
        JSON_UNQUOTE(JSON_EXTRACT(p.photos,'$[0]')) thumbnail
        FROM market_posts p LEFT JOIN market_content_reviews cr ON cr.target_type='post' AND cr.target_id=p.id
        WHERE p.owner_id=? ORDER BY p.id DESC LIMIT 100`, [id])).map(
        (p) => ({ ...postData(p), photos: undefined }),
      ),
      proposals: await rows(
        `SELECT a.*,IF(p.hidden=0 AND ${approvedPost},p.title,'Publicação indisponível ou em análise') title,p.status post_status,(p.hidden=0 AND ${approvedPost}) post_visible FROM market_proposals a JOIN market_posts p ON p.id=a.post_id WHERE a.professional_id=? ORDER BY a.id DESC LIMIT 100`,
        [id],
      ),
      works: await rows(
        'SELECT id,post_id,title,status,amount,due_date,customer_id,professional_id,created_at FROM market_works WHERE customer_id=? OR professional_id=? ORDER BY id DESC LIMIT 100',
        [id, id],
      ),
    };
  },
  async work(actor: number, id: number, after = 0) {
    const w = await workById(actor, id);
    const people = await rows(
      'SELECT u.id,COALESCE(p.name,u.name) name FROM users u LEFT JOIN market_profiles p ON p.user_id=u.id WHERE u.id IN (?,?)',
      [w.customer_id, w.professional_id],
    );
    const messages = await rows(
      "SELECT id,sender_id,IF(hidden=1,'Mensagem removida pela moderacao',message) message,hidden,created_at FROM market_messages WHERE work_id=? AND id>? ORDER BY id LIMIT 100",
      [id, after],
    );
    const reviews = await rows('SELECT * FROM market_reviews WHERE work_id=? AND author_id=?', [id, actor]);
    return {
      work: {
        ...w,
        due_date: date(w.due_date),
        pending_terms: parseJson(w.pending_terms),
        provider_client_id: actor === w.professional_id ? w.provider_client_id : null,
        provider_opportunity_id: actor === w.professional_id ? w.provider_opportunity_id : null,
      },
      people,
      messages,
      myReview: reviews[0] ?? null,
      blocked: await blocked(w.customer_id, w.professional_id),
    };
  },
  async message(actor: number, id: number, message: string) {
    await consent(actor);
    return mutateWork(actor, id, async (w) => {
      await assertPair(w.customer_id, w.professional_id);
      await active(w.customer_id);
      await active(w.professional_id);
      if (w.status === 'cancelado') throw AppError.conflict('Este trabalho foi cancelado.');
      const result = await execute('INSERT INTO market_messages(work_id,sender_id,message) VALUES(?,?,?)', [
        id,
        actor,
        message,
      ]);
      return { id: result.insertId };
    });
  },
  async terms(actor: number, id: number, input: { amount: number; dueDate: string }) {
    await active(actor);
    return mutateWork(actor, id, async (w) => {
      await assertPair(w.customer_id, w.professional_id);
      if (w.status !== 'andamento' || w.customer_done || w.professional_done)
        throw AppError.conflict('Os termos nao podem ser alterados nesta etapa.');
      if (input.dueDate < new Date().toISOString().slice(0, 10))
        throw AppError.badRequest('Escolha uma data futura.');
      await execute('UPDATE market_works SET pending_terms=? WHERE id=?', [
        JSON.stringify({ ...input, proposerId: actor }),
        id,
      ]);
      return { requested: true };
    });
  },
  async acceptTerms(actor: number, id: number) {
    return mutateWork(actor, id, async (w) => {
      await assertPair(w.customer_id, w.professional_id);
      const t = parseJson(w.pending_terms);
      if (w.status !== 'andamento' || !t || t.proposerId === actor)
        throw AppError.conflict('Nao ha termos da outra parte para confirmar.');
      await execute('UPDATE market_works SET amount=?,due_date=?,pending_terms=NULL WHERE id=?', [
        t.amount,
        t.dueDate,
        id,
      ]);
      if (w.provider_opportunity_id)
        await opportunityRepository.update(w.professional_id, w.provider_opportunity_id, {
          totalAmount: t.amount,
          expectedCloseDate: t.dueDate,
        });
      return { accepted: true };
    });
  },
  async complete(actor: number, id: number) {
    return mutateWork(actor, id, async (w) => {
      if (w.status === 'concluido') return { completed: true };
      if (w.status !== 'andamento') throw AppError.conflict('Trabalho encerrado.');
      if (w.pending_terms)
        throw AppError.conflict('Confirme ou descarte a alteracao de termos antes de concluir.');
      const field = actor === w.customer_id ? 'customer_done' : 'professional_done';
      await execute(`UPDATE market_works SET ${field}=1 WHERE id=?`, [id]);
      const other = actor === w.customer_id ? w.professional_done : w.customer_done;
      if (other) {
        await execute("UPDATE market_works SET status='concluido',completed_at=UTC_TIMESTAMP() WHERE id=?", [
          id,
        ]);
        await execute("UPDATE market_posts SET status='concluida' WHERE id=?", [w.post_id]);
      }
      return { completed: Boolean(other) };
    });
  },
  async discardTerms(actor: number, id: number) {
    return mutateWork(actor, id, async (w) => {
      if (w.status !== 'andamento') throw AppError.conflict('Trabalho encerrado.');
      await execute('UPDATE market_works SET pending_terms=NULL WHERE id=?', [id]);
      return { discarded: true };
    });
  },
  async cancelWork(actor: number, id: number) {
    return mutateWork(actor, id, async (w) => {
      if (w.status !== 'andamento') throw AppError.conflict('Trabalho encerrado.');
      await execute("UPDATE market_works SET status='cancelado',pending_terms=NULL WHERE id=?", [id]);
      await execute("UPDATE market_posts SET status='cancelada' WHERE id=?", [w.post_id]);
      return { cancelled: true };
    });
  },
  async importClient(actor: number, id: number) {
    await billingService.sync(actor);
    return mutateWork(actor, id, async (w) => {
      if (w.professional_id !== actor)
        throw AppError.forbidden('Apenas o profissional pode salvar este cliente.');
      if (w.provider_client_id && w.provider_opportunity_id)
        return { clientId: w.provider_client_id, opportunityId: w.provider_opportunity_id };
      const previous = await row(
        'SELECT provider_client_id FROM market_works WHERE professional_id=? AND customer_id=? AND provider_client_id IS NOT NULL ORDER BY id DESC LIMIT 1',
        [actor, w.customer_id],
      );
      if (!previous) await planLimitService.assertCanCreate(actor, 'clientes');
      await planLimitService.assertCanCreate(actor, 'oportunidades');
      const customer = (
        await rows(
          'SELECT COALESCE(p.name,u.name) name FROM users u LEFT JOIN market_profiles p ON p.user_id=u.id WHERE u.id=?',
          [w.customer_id],
        )
      )[0];
      const clientId =
        previous?.provider_client_id ??
        (await clientRepository.create(actor, {
          name: customer.name,
          origin: 'marketplace',
          notes:
            'Contato originado de um trabalho aceito no Clyvo. Combine os dados de contato pela conversa.',
        }));
      const opportunityId = await opportunityRepository.create(actor, {
        clientId,
        title: w.title,
        totalAmount: Number(w.amount),
        expectedCloseDate: date(w.due_date),
        status: 'negociacao',
        source: 'marketplace',
      });
      await opportunityRepository.addHistory(
        actor,
        opportunityId,
        null,
        'negociacao',
        'Importado de trabalho aceito no marketplace',
      );
      await execute('UPDATE market_works SET provider_client_id=?,provider_opportunity_id=? WHERE id=?', [
        clientId,
        opportunityId,
        id,
      ]);
      return { clientId, opportunityId };
    });
  },
  async received(actor: number, id: number) {
    return mutateWork(actor, id, async (w) => {
      if (actor !== w.professional_id)
        throw AppError.forbidden('Somente o profissional registra seu recebimento.');
      if (w.status !== 'concluido')
        throw AppError.conflict('Conclua o trabalho com a confirmacao das duas partes primeiro.');
      await execute('UPDATE market_works SET received_at=COALESCE(received_at,UTC_TIMESTAMP()) WHERE id=?', [
        id,
      ]);
      return { received: true };
    });
  },
  async review(actor: number, id: number, stars: number, comment: string) {
    await consent(actor);
    return mutateWork(actor, id, async (w) => {
      if (w.status !== 'concluido')
        throw AppError.conflict('Avaliacao somente apos conclusao pelas duas partes.');
      const old = await row('SELECT id FROM market_reviews WHERE work_id=? AND author_id=?', [id, actor]);
      if (old) throw AppError.conflict('Voce ja avaliou este trabalho.');
      const target = actor === w.customer_id ? w.professional_id : w.customer_id;
      const result = await execute(
        'INSERT INTO market_reviews(work_id,author_id,target_id,stars,comment) VALUES(?,?,?,?,?)',
        [id, actor, target, stars, comment],
      );
      return { id: result.insertId };
    });
  },
  async block(actor: number, target: number, enabled: boolean) {
    if (actor === target) throw AppError.badRequest('Escolha outra conta.');
    if (!(await userRepository.findById(target))) throw AppError.notFound('Conta nao encontrada.');
    if (enabled)
      await execute('INSERT IGNORE INTO market_blocks(user_id,target_id) VALUES(?,?)', [actor, target]);
    else await execute('DELETE FROM market_blocks WHERE user_id=? AND target_id=?', [actor, target]);
    return { blocked: enabled };
  },
  async blocks(actor: number) {
    return {
      blocks: await rows(
        'SELECT b.target_id,u.name FROM market_blocks b JOIN users u ON u.id=b.target_id WHERE b.user_id=?',
        [actor],
      ),
    };
  },
  async report(actor: number, input: { targetType: string; targetId: number; reason: string }) {
    const tables: Record<string, string> = {
      post: 'market_posts',
      user: 'users',
      message: 'market_messages',
      review: 'market_reviews',
    };
    const target = await row(`SELECT * FROM ${tables[input.targetType]} WHERE id=?`, [input.targetId]);
    if (!target) throw AppError.notFound('Conteudo nao encontrado.');
    if (input.targetType === 'message') await workById(actor, target.work_id);
    const old = await row(
      "SELECT id FROM market_reports WHERE reporter_id=? AND target_type=? AND target_id=? AND status='aberta'",
      [actor, input.targetType, input.targetId],
    );
    if (old) return { id: old.id };
    const result = await execute(
      'INSERT INTO market_reports(reporter_id,target_type,target_id,reason) VALUES(?,?,?,?)',
      [actor, input.targetType, input.targetId, input.reason],
    );
    let emailed = false;
    try {
      const u = await userRepository.findById(actor);
      if (u) {
        await supportService.send(u, {
          category: 'denuncia',
          subject: `Denuncia ${result.insertId}: ${input.targetType} ${input.targetId}`,
          message: input.reason,
          appVersion: 'marketplace',
          platform: 'web',
          requestId: `report-${result.insertId}-${actor}`,
          createdAt: new Date().toISOString(),
        });
        emailed = true;
      }
    } catch {
      /* The durable moderation queue remains available when email fails. */
    }
    return { id: result.insertId, emailed };
  },
  async moderation(actor: number) {
    if (!isModerator(actor)) throw AppError.forbidden('Acesso restrito a moderacao.');
    return {
      queue: await rows(`SELECT cr.*,IF(cr.target_type='post',p.title,mp.name) title
        FROM market_content_reviews cr LEFT JOIN market_posts p ON cr.target_type='post' AND p.id=cr.target_id
        LEFT JOIN market_profiles mp ON cr.target_type='profile' AND mp.user_id=cr.target_id
        WHERE cr.state='pending' AND ((cr.target_type='post' AND p.status='aberta' AND p.hidden=0)
          OR (cr.target_type='profile' AND mp.published=1))
        AND NOT EXISTS(SELECT 1 FROM market_suspensions s WHERE s.user_id=cr.owner_id)
        ORDER BY cr.updated_at,cr.target_id LIMIT 100`),
      reports: await rows("SELECT * FROM market_reports ORDER BY status='aberta' DESC,id DESC LIMIT 100"),
      suspensions: await rows('SELECT s.*,u.name FROM market_suspensions s JOIN users u ON u.id=s.user_id'),
    };
  },
  async reviewContent(actor: number, type: 'post' | 'profile', id: number) {
    if (!isModerator(actor)) throw AppError.forbidden('Acesso restrito à moderação.');
    return withTransaction(async () => {
      const owner = await row('SELECT owner_id FROM market_content_reviews WHERE target_type=? AND target_id=?', [type,id]);
      if (!owner) throw AppError.notFound('Conteúdo não encontrado.');
      await lockUsers(owner.owner_id);
      const review = await reviewState(type,id);
      const content = await row(type === 'post' ? 'SELECT * FROM market_posts WHERE id=?' : 'SELECT * FROM market_profiles WHERE user_id=?', [id]);
      return { type, id, review, content };
    });
  },
  async decideContent(actor: number, type: 'post' | 'profile', id: number, input: { revision: number; action: 'approved' | 'rejected'; note: string }) {
    if (!isModerator(actor)) throw AppError.forbidden('Acesso restrito à moderação.');
    return withTransaction(async () => {
      const initial = await row('SELECT owner_id FROM market_content_reviews WHERE target_type=? AND target_id=?', [type,id]);
      if (!initial) throw AppError.notFound('Conteúdo não encontrado.');
      await lockUsers(initial.owner_id);
      await active(initial.owner_id);
      const review = await row('SELECT * FROM market_content_reviews WHERE target_type=? AND target_id=? FOR UPDATE', [type,id]);
      if (!review || review.state !== 'pending' || review.revision !== input.revision)
        throw AppError.conflict('O conteúdo foi alterado ou já foi analisado. Reabra antes de decidir.');
      const content = await row(type === 'post' ? 'SELECT * FROM market_posts WHERE id=? FOR UPDATE' : 'SELECT * FROM market_profiles WHERE user_id=? FOR UPDATE', [id]);
      if (!content || (type === 'post' ? content.hidden || content.status !== 'aberta' : !content.published))
        throw AppError.conflict('Este conteúdo não está mais disponível para publicação.');
      await execute('UPDATE market_content_reviews SET state=?,note=?,moderator_id=? WHERE target_type=? AND target_id=?', [input.action,input.note,actor,type,id]);
      await execute('INSERT INTO market_content_decisions(target_type,target_id,revision,decision,note,moderator_id) VALUES(?,?,?,?,?,?)', [type,id,input.revision,input.action,input.note,actor]);
      return { state: input.action };
    });
  },
  async reportContent(actor: number, id: number) {
    if (!isModerator(actor)) throw AppError.forbidden('Acesso restrito a moderacao.');
    const report = await row('SELECT * FROM market_reports WHERE id=?', [id]);
    if (!report) throw AppError.notFound('Denuncia nao encontrada.');
    const sql: Record<string, string> = {
      post: 'SELECT id,owner_id,title,description,photos,city,status,hidden FROM market_posts WHERE id=?',
      user: 'SELECT user_id,name,city,skills,services,experience,bio,published,photo FROM market_profiles WHERE user_id=?',
      message: 'SELECT id,work_id,sender_id,message,hidden FROM market_messages WHERE id=?',
      review: 'SELECT id,work_id,author_id,target_id,stars,comment,hidden FROM market_reviews WHERE id=?',
    };
    return { report, content: await row(sql[report.target_type], [report.target_id]) };
  },
  async resolve(actor: number, id: number, input: { action: string; note: string }) {
    if (!isModerator(actor)) throw AppError.forbidden('Acesso restrito a moderacao.');
    return withTransaction(async () => {
      const report = await row('SELECT * FROM market_reports WHERE id=? FOR UPDATE', [id]);
      if (!report) throw AppError.notFound('Denuncia nao encontrada.');
      if (report.status !== 'aberta') throw AppError.conflict('Denuncia ja analisada.');
      if (input.action === 'ocultar') {
        if (report.target_type === 'user') {
          await execute(
            'INSERT INTO market_suspensions(user_id,reason) VALUES(?,?) ON DUPLICATE KEY UPDATE reason=VALUES(reason)',
            [report.target_id, input.note],
          );
        } else {
          const table: Record<string, string> = {
            post: 'market_posts',
            message: 'market_messages',
            review: 'market_reviews',
          };
          await execute(`UPDATE ${table[report.target_type]} SET hidden=1 WHERE id=?`, [report.target_id]);
        }
      }
      await execute(
        "UPDATE market_reports SET status='resolvida',resolution=?,moderator_id=?,resolved_at=UTC_TIMESTAMP() WHERE id=?",
        [input.action + ': ' + input.note, actor, id],
      );
      return { resolved: true };
    });
  },
  async restoreUser(actor: number, target: number) {
    if (!isModerator(actor)) throw AppError.forbidden('Acesso restrito a moderacao.');
    await execute('DELETE FROM market_suspensions WHERE user_id=?', [target]);
    return { restored: true };
  },
  async goal(actor: number, input: { month: string; amount: number }) {
    await billingService.sync(actor);
    if ((await plan(actor)) === 'free')
      throw new AppError('Metas de renda estao disponiveis nos planos Pro e Pro Plus.', 402, 'MARKET_LIMIT');
    await execute(
      'INSERT INTO market_goals(user_id,month_key,amount) VALUES(?,?,?) ON DUPLICATE KEY UPDATE amount=VALUES(amount)',
      [actor, input.month, input.amount],
    );
    return { saved: true };
  },
  async earnings(actor: number, key = month()) {
    const from = key + '-01',
      end = new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 1))
        .toISOString()
        .slice(0, 10);
    // Legacy sales and explicit marketplace receipts, deduplicated when imported into CRM.
    const ledger = `SELECT s.amount,s.sold_at received_at,CONCAT('cliente-',s.client_id) customer_key,s.description title FROM sales s WHERE s.user_id=? AND s.deleted_at IS NULL UNION ALL SELECT w.amount,w.received_at,IF(w.provider_client_id IS NULL,CONCAT('mercado-',w.customer_id),CONCAT('cliente-',w.provider_client_id)),w.title FROM market_works w WHERE w.professional_id=? AND w.received_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sales s WHERE s.user_id=w.professional_id AND s.opportunity_id=w.provider_opportunity_id AND s.deleted_at IS NULL)`;
    const params = [actor, actor];
    const metrics = await row(
      `SELECT COALESCE(SUM(amount),0) total,COALESCE(SUM(IF(received_at>=? AND received_at<?,amount,0)),0) month_total,COALESCE(SUM(IF(received_at>=DATE_SUB(UTC_DATE(),INTERVAL WEEKDAY(UTC_DATE()) DAY) AND received_at<DATE_ADD(UTC_DATE(),INTERVAL 1 DAY),amount,0)),0) week_total,COALESCE(AVG(IF(received_at>=? AND received_at<?,amount,NULL)),0) average_ticket FROM (${ledger}) ledger`,
      [from, end, from, end, ...params],
    );
    const recurring = await row(
      `SELECT COUNT(*) total FROM (SELECT customer_key FROM (${ledger}) l GROUP BY customer_key HAVING COUNT(*)>1) t`,
      params,
    );
    const chart = await rows(
      `SELECT DATE_FORMAT(received_at,'%Y-%m-%d') day,SUM(amount) total FROM (${ledger}) l WHERE received_at>=? AND received_at<? GROUP BY day ORDER BY day`,
      [...params, from, end],
    );
    const history = await rows(
      `SELECT * FROM (${ledger}) l WHERE received_at>=? AND received_at<? ORDER BY received_at DESC LIMIT 100`,
      [...params, from, end],
    );
    const counts = await row(
      "SELECT COUNT(*) completed,SUM(completed_at>=? AND completed_at<?) completed_month FROM market_works WHERE professional_id=? AND status='concluido'",
      [from, end, actor],
    );
    const goal = await row('SELECT amount FROM market_goals WHERE user_id=? AND month_key=?', [actor, key]);
    return {
      month: key,
      metrics,
      recurringClients: recurring!.total,
      chart,
      history,
      services: counts,
      goal: goal?.amount ?? null,
      canSetGoal: (await plan(actor)) !== 'free',
    };
  },
  async summary(actor: number) {
    const counts = await row(
      `SELECT (SELECT COUNT(*) FROM market_posts p WHERE p.status='aberta' AND p.hidden=0 AND ${approvedPost} AND p.owner_id<>? AND (p.due_date IS NULL OR p.due_date>=UTC_DATE()) AND NOT EXISTS(SELECT 1 FROM market_suspensions WHERE user_id=p.owner_id) AND ${hideBlocked}) available,(SELECT COUNT(*) FROM market_proposals WHERE professional_id=? AND status='enviada') proposals,(SELECT COUNT(*) FROM market_works WHERE (customer_id=? OR professional_id=?) AND status='andamento') active,(SELECT COUNT(*) FROM market_works WHERE professional_id=? AND status='concluido') completed`,
      [actor, actor, actor, actor, actor, actor, actor],
    );
    return {
      counts,
      earnings: await marketService.earnings(actor),
      preferences: (await marketService.me(actor)).preferences,
    };
  },
};
