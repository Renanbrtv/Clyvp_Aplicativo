import { query, queryOne, execute, withTransaction, type RowDataPacket as Row } from '../../config/database';
import type { Request } from 'express';
import { AppError } from '../../utils/app-error';
import { audit, authorize } from './security';
import type { Role } from './permissions';
export interface Filter { search: string; status: string; page: number }
const q=(sql:string,args:unknown[]=[])=>query<Row>(sql,args);
const one=(sql:string,args:unknown[]=[])=>queryOne<Row>(sql,args);
const like=(s:string)=>'%'+s.replace(/[\\%_]/g, c=>'\\'+c)+'%';
export const modules=['users','posts','profiles','reports','proposals','subscriptions','admins','audit'] as const;
export type Module=typeof modules[number];
const definitions: Record<Module,{from:string; fields:string; search:string[]; status:string; order:string; base?:string}> = {
 users:{from:`users u LEFT JOIN subscriptions s ON s.id=(SELECT MAX(id) FROM subscriptions WHERE user_id=u.id) LEFT JOIN plans p ON p.id=s.plan_id`,fields:'u.id,u.name,u.email,u.status,u.created_at,u.last_login_at,p.name plan',search:['u.name','u.email'],status:'u.status',order:'u.id',base:'u.deleted_at IS NULL'},
 posts:{from:`market_posts p JOIN users u ON u.id=p.owner_id LEFT JOIN market_content_reviews r ON r.target_type='post' AND r.target_id=p.id`,fields:'p.id,p.title,u.name owner,p.category,p.budget_from,p.budget_to,p.created_at,p.status publication_status,r.state status,r.revision,p.hidden',search:['p.title','u.name','p.category'],status:'r.state',order:'p.id'},
 profiles:{from:`market_profiles p JOIN users u ON u.id=p.user_id LEFT JOIN market_content_reviews r ON r.target_type='profile' AND r.target_id=p.user_id`,fields:`p.user_id id,p.name,u.email,p.city,p.skills,p.published,r.state status,r.revision,(SELECT AVG(stars) FROM market_reviews WHERE target_id=p.user_id AND hidden=0) rating`,search:['p.name','u.email','p.city'],status:'r.state',order:'p.user_id'},
 reports:{from:'market_reports r JOIN users u ON u.id=r.reporter_id',fields:'r.id,r.target_type,r.target_id,r.reason,r.status,r.created_at,u.name reporter',search:['r.reason','u.name'],status:'r.status',order:'r.id'},
 proposals:{from:'market_proposals a JOIN market_posts p ON p.id=a.post_id JOIN users u ON u.id=a.professional_id',fields:'a.id,p.title,u.name professional,a.amount,a.due_date,a.status,a.created_at',search:['p.title','u.name'],status:'a.status',order:'a.id'},
 subscriptions:{from:'subscriptions s JOIN users u ON u.id=s.user_id JOIN plans p ON p.id=s.plan_id',fields:`s.id,u.name,u.email,p.name plan,s.status,s.current_period_end,s.external_provider,s.price_paid,CASE WHEN s.current_period_end IS NOT NULL AND s.current_period_end<=UTC_TIMESTAMP() AND s.status IN ('ativa','trialing','inadimplente') THEN 'expirada' ELSE s.status END effective_status`,search:['u.name','u.email','p.name'],status:"CASE WHEN s.current_period_end IS NOT NULL AND s.current_period_end<=UTC_TIMESTAMP() AND s.status IN ('ativa','trialing','inadimplente') THEN 'expirada' ELSE s.status END",order:'s.id',base:'s.id=(SELECT MAX(latest.id) FROM subscriptions latest WHERE latest.user_id=s.user_id)'},
 admins:{from:'admin_members m JOIN users u ON u.id=m.user_id',fields:"u.id,u.name,u.email,m.role,IF(m.enabled=1,'ativo','inativo') status,m.created_at",search:['u.name','u.email'],status:"IF(m.enabled=1,'ativo','inativo')",order:'u.id'},
 audit:{from:'admin_audit a LEFT JOIN users u ON u.id=a.actor_id',fields:'a.id,u.name actor,a.action,a.target_type,a.target_id,a.reason,a.created_at',search:['a.action','a.reason','u.name'],status:'a.action',order:'a.id'},
};
export async function list(module:Module,f:Filter) {
 const d=definitions[module];const args:unknown[]=[];const where=[d.base??'1=1'];
 if(f.search){where.push('('+d.search.map(c=>c+' LIKE ?').join(' OR ')+')');args.push(...d.search.map(()=>like(f.search)));}
 if(f.status){where.push(d.status+'=?');args.push(f.status);}
 const sql=`FROM ${d.from} WHERE ${where.join(' AND ')}`;
 const total=Number((await one('SELECT COUNT(*) total '+sql,args))?.total??0);
 const rows=await q(`SELECT ${d.fields} ${sql} ORDER BY ${d.order} DESC LIMIT 25 OFFSET ?`,[...args,(f.page-1)*25]);
 return {rows,total,page:f.page,pageSize:25};
}
export async function dashboard() {
 const counts=await one(`SELECT (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) users,
 (SELECT COUNT(*) FROM market_profiles) professionals,(SELECT COUNT(*) FROM market_posts) opportunities,
 (SELECT COUNT(*) FROM market_content_reviews WHERE state='pending') pending,
 (SELECT COUNT(*) FROM market_proposals) proposals,(SELECT COUNT(*) FROM market_reports WHERE status='aberta') reports`);
 const growth=await q("SELECT DATE_FORMAT(created_at,'%Y-%m') month,COUNT(*) total FROM users WHERE deleted_at IS NULL AND created_at>=DATE_FORMAT(DATE_SUB(UTC_DATE(),INTERVAL 11 MONTH),'%Y-%m-01') GROUP BY month ORDER BY month");
 return {counts,growth,asOf:new Date().toISOString()};
}
export async function userDetail(id:number) {
 const user=await one('SELECT id,name,email,status,created_at,last_login_at FROM users WHERE id=? AND deleted_at IS NULL',[id]);
 if(!user)throw AppError.notFound();
 return {user,company:await one('SELECT trade_name,city,state FROM companies WHERE user_id=?',[id])};
}
export async function proposalDetail(id:number) {
 const result=await one('SELECT a.id,a.message,a.experience,a.amount,a.due_date,a.status,p.title,u.name professional FROM market_proposals a JOIN market_posts p ON p.id=a.post_id JOIN users u ON u.id=a.professional_id WHERE a.id=?',[id]);
 if(!result)throw AppError.notFound();return result;
}
export async function reviews(id:number) { return q('SELECT r.id,r.stars,r.comment,r.created_at,r.hidden,u.name author FROM market_reviews r JOIN users u ON u.id=r.author_id WHERE r.target_id=? ORDER BY r.id DESC LIMIT 100',[id]); }
export async function changeUser(req:Request,id:number,status:'ativo'|'bloqueado',reason:string) {
 return withTransaction(async()=>{
  // All membership and account restrictions use this same lock order.
  await one('SELECT id FROM admin_control WHERE id=1 FOR UPDATE');
  const actor=await authorize(req,'users.write',true);
  if(actor.id===id)throw AppError.conflict('Você não pode suspender sua própria conta.');
  if(await one('SELECT user_id FROM admin_members WHERE user_id=? AND enabled=1',[id]))throw AppError.conflict('Revogue o acesso administrativo antes de suspender esta conta.');
  const user=await one('SELECT status FROM users WHERE id=? AND deleted_at IS NULL FOR UPDATE',[id]);
  if(!user)throw AppError.notFound();
  await execute('UPDATE users SET status=? WHERE id=?',[status,id]);
  if(status==='bloqueado'){
   await execute('INSERT INTO session_security(user_id,version) VALUES(?,1) ON DUPLICATE KEY UPDATE version=version+1',[id]);
   await execute('DELETE FROM refresh_tokens WHERE user_id=?',[id]);
   await execute('DELETE FROM admin_sessions WHERE user_id=?',[id]);
  }
  await audit(actor.id,'user.status','user',id,reason,{before:user.status,after:status});
  return {status};
 });
}
export async function changeMember(req:Request,email:string,role:Role,enabled:boolean,reason:string) {
 return withTransaction(async()=>{
  await one('SELECT id FROM admin_control WHERE id=1 FOR UPDATE');
  const actor=await authorize(req,'settings',true);
  const target=await one("SELECT id FROM users WHERE email=? AND status='ativo' AND deleted_at IS NULL FOR UPDATE",[email]);
  if(!target)throw AppError.notFound('Cadastre primeiro uma conta ativa no Clyvo com este e-mail.');
  if(target.id===actor.id)throw AppError.conflict('Outro proprietário deve alterar seu acesso.');
  const prior=await one('SELECT role,enabled FROM admin_members WHERE user_id=? FOR UPDATE',[target.id]);
  if(prior?.role==='owner' && prior.enabled && (!enabled || role!=='owner')){
   const count=await one("SELECT COUNT(*) n FROM admin_members m JOIN users u ON u.id=m.user_id WHERE m.role='owner' AND m.enabled=1 AND u.status='ativo' AND u.deleted_at IS NULL");
   if(Number(count?.n)<=1)throw AppError.conflict('Mantenha pelo menos um proprietário ativo.');
  }
  await execute('INSERT INTO admin_members(user_id,role,enabled) VALUES(?,?,?) ON DUPLICATE KEY UPDATE role=VALUES(role),enabled=VALUES(enabled)',[target.id,role,enabled?1:0]);
  await execute('DELETE FROM admin_sessions WHERE user_id=?',[target.id]);
  await audit(actor.id,'admin.access','user',target.id,reason,{before:prior,after:{role,enabled}});
  return {id:target.id,role,enabled};
 });
}
