/** Requires a migrated, isolated local database. Never points at production. */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
async function main(){
 if(process.env.NODE_ENV!=='test'||!process.env.DB_NAME?.endsWith('_admin_test')||!['localhost','127.0.0.1'].includes(process.env.DB_HOST??''))throw new Error('Use NODE_ENV=test, DB_HOST=127.0.0.1 e DB_NAME terminado em _admin_test.');
 process.env.ADMIN_ENABLED='true';process.env.LOG_LEVEL='error';
 const {execute,queryOne,closePool}=await import('../config/database');
 const {hashPassword}=await import('../utils/password');
 const {createApp}=await import('../app');
 const ids:number[]=[];const password=randomBytes(24).toString('hex');const hash=await hashPassword(password);
 const prefix='admin-test-'+Date.now();let checks=0;
 const check=(condition:boolean)=>{assert.ok(condition);checks++;};
 const server=createApp().listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base='http://127.0.0.1:'+(server.address() as {port:number}).port;process.env.ADMIN_ORIGIN=base;
 const request=async(path:string,body?:unknown,cookie='',csrf='')=>{
  const response=await fetch(base+'/api/admin'+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie,'X-Clyvo-Csrf':csrf},body:body===undefined?undefined:JSON.stringify(body)});
  const result=await response.json().catch(()=>null) as {data?: {csrf?: string}} | null;return {status:response.status,data:result?.data,cookie:response.headers.get('set-cookie')?.split(';')[0]??''};
 };
 try{
  for(const role of ['owner','moderator','support','finance','user']){
   const user=await execute('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)',[`Teste ${role}`,`${prefix}-${role}@example.invalid`,hash]);ids.push(user.insertId);
   if(role!=='user')await execute('INSERT INTO admin_members(user_id,role) VALUES(?,?)',[user.insertId,role]);
  }
  check((await request('/login',{email:`${prefix}-user@example.invalid`,password})).status===401);
  const owner=await request('/login',{email:`${prefix}-owner@example.invalid`,password});check(owner.status===200);const identity=await request('/me',undefined,owner.cookie);const csrf=identity.data?.csrf ?? '';check(Boolean(csrf));
  const mod=await request('/login',{email:`${prefix}-moderator@example.invalid`,password});const modCsrf=(await request('/me',undefined,mod.cookie)).data?.csrf ?? '';
  check((await request('/users',undefined,mod.cookie)).status===403);
  check((await request('/subscriptions',undefined,mod.cookie)).status===403);
  check((await request('/admins',{email:`${prefix}-user@example.invalid`,role:'owner',enabled:true,reason:'Teste de acesso negado'},mod.cookie,modCsrf)).status===403);
  const post=await execute("INSERT INTO market_posts(owner_id,title,category,description,mode,photos) VALUES(?,'Teste isolado','Outros','Publicação usada somente no teste','remoto','[]')",[ids[4]]);
  await execute("INSERT INTO market_content_reviews(target_type,target_id,owner_id) VALUES('post',?,?)",[post.insertId,ids[4]]);
  const path=`/content/post/${post.insertId}/decision`;
  check((await request(path,{revision:1,action:'approved',note:'Conteúdo de teste aprovado'},owner.cookie)).status===403);
  const concurrent=await Promise.all(['approved','rejected'].map(action=>request(path,{revision:1,action,note:'Decisão concorrente de teste'},owner.cookie,csrf)));
  check(concurrent.filter(r=>r.status===200).length===1);check(concurrent.filter(r=>r.status===409).length===1);
  const review=await queryOne<any>("SELECT * FROM market_content_reviews WHERE target_type='post' AND target_id=?",[post.insertId]);check(review.revision===2);
  check((await request(path,{revision:2,action:'approved',note:'Aprovação para teste público'},owner.cookie,csrf)).status===200);
  const {marketService}=await import('../modules/marketplace/service');
  const published=await marketService.posts(ids[2],{page:1,sort:'recentes'});check(JSON.stringify(published).includes('Teste isolado'));
  check((await request(path,{revision:3,action:'suspended',note:'Suspensão para teste público'},owner.cookie,csrf)).status===200);
  const hidden=await marketService.posts(ids[2],{page:1,sort:'recentes'});check(!JSON.stringify(hidden).includes('Teste isolado'));
  const reports=await execute("INSERT INTO market_reports(reporter_id,target_type,target_id,reason) VALUES(?,'post',?,'Teste de denúncia')",[ids[2],post.insertId]);
  check((await request(`/reports/${reports.insertId}/resolve`,{action:'arquivar',note:'Encerramento de teste'},mod.cookie,modCsrf)).status===200);
  check((await queryOne<any>('SELECT status FROM market_reports WHERE id=?',[reports.insertId]))?.status==='resolvida');
  const audits=await queryOne<any>("SELECT COUNT(*) n FROM admin_audit WHERE target_type='post' AND target_id=?",[post.insertId]);check(Number(audits?.n)>=3);
  check((await request('/admins',{email:`${prefix}-moderator@example.invalid`,role:'moderator',enabled:false,reason:'Revogação de teste'},owner.cookie,csrf)).status===200);
  check((await request('/posts',undefined,mod.cookie)).status===401);
  check((await request(`/users/${ids[4]}/status`,{status:'bloqueado',reason:'Suspensão de teste'},owner.cookie,csrf)).status===200);
  check((await queryOne<any>('SELECT status FROM users WHERE id=?',[ids[4]]))?.status==='bloqueado');
  await execute('UPDATE admin_sessions SET last_seen_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 31 MINUTE) WHERE user_id=?',[ids[0]]);
  check((await request('/dashboard',undefined,owner.cookie)).status===401);
  console.log(`${checks} verificações de integração com banco real aprovadas.`);
 }finally{
  for(const id of ids){await execute('DELETE FROM admin_audit WHERE actor_id=? OR (target_type=\'user\' AND target_id=?)',[id,id]);await execute('DELETE FROM users WHERE id=?',[id]);}
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await closePool();
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
