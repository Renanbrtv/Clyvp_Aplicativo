import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { allowed, permissions } from '../modules/admin/permissions';
process.env.NODE_ENV='test';
process.env.JWT_ACCESS_SECRET=randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET=randomBytes(48).toString('hex');
process.env.ADMIN_ORIGIN='http://localhost:3333';
process.env.ADMIN_ENABLED='true';
process.env.LOG_LEVEL='error';
async function main(){
 const s=await import('../modules/admin/security');
 let count=0;const check=(v:boolean)=>{assert.ok(v);count++;};
 for(const p of permissions)check(allowed('owner',p));
 for(const role of ['free','pro','pro_max','user','', '__proto__'])for(const p of permissions)check(!allowed(role,p));
 check(allowed('moderator','content.write'));check(!allowed('moderator','settings'));check(!allowed('moderator','billing'));
 check(allowed('support','users.read'));check(!allowed('support','users.write'));check(!allowed('finance','users.read'));check(allowed('finance','billing'));check(!allowed('auditor','content.write'));
 const token=randomBytes(32).toString('hex');
 const req=(origin:string|undefined,csrf:string,cookie='clyvo_admin='+token)=>({headers:{cookie},get:(key:string)=>key==='origin'?origin:key==='x-clyvo-csrf'?csrf:undefined} as unknown as Request);
 const csrf=s.hash('admin-csrf:'+token);
 s.checkCsrf(req(process.env.ADMIN_ORIGIN,csrf));count++;
 for(const r of [req('https://evil.example',csrf),req(undefined,csrf),req(process.env.ADMIN_ORIGIN,''),req(process.env.ADMIN_ORIGIN,'a'.repeat(64)),req(process.env.ADMIN_ORIGIN,'é'.repeat(64)),req(process.env.ADMIN_ORIGIN,csrf,'')]){assert.throws(()=>s.checkCsrf(r));count++;}
 assert.equal(s.tokenFrom(req(process.env.ADMIN_ORIGIN,csrf,'clyvo_admin=invalid')),'');count++;
 assert.equal(s.cookieOptions().httpOnly,true);count++;assert.equal(s.cookieOptions().sameSite,'strict');count++;
 await assert.rejects(()=>s.session({headers:{authorization:'Bearer regular-app-token'}} as Request));count++;
 const {createApp}=await import('../app');const server=createApp().listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const address=server.address() as {port:number};const base='http://127.0.0.1:'+address.port;
 try{
  for(const path of ['/api/admin/dashboard','/api/admin/users','/api/admin/posts','/api/admin/subscriptions','/api/admin/admins','/api/admin/audit']){
   const res=await fetch(base+path,{headers:{Authorization:'Bearer regular-app-token'}});assert.equal(res.status,401);count++;
  }
  const denied=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:JSON.stringify({email:'test@example.invalid',password:'not-a-real-password'})});assert.equal(denied.status,403);count++;
  process.env.ADMIN_ENABLED='false';const disabled=await fetch(base+'/api/admin/dashboard');assert.equal(disabled.status,404);count++;
 }finally{await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));}
 console.log(`${count} verificações de permissões, CSRF, cookie e isolamento HTTP aprovadas. Não substituem testes com MySQL.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
