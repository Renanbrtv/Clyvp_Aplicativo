import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { queryOne, execute, type RowDataPacket as Row } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../utils/app-error';
import { fakePasswordCheck, verifyPassword } from '../../utils/password';
import { allowed, grantsFor, type Permission, type Role } from './permissions';
export const adminEnabled = () => process.env.ADMIN_ENABLED === 'true';
export const hash = (text: string) => createHash('sha256').update(text).digest('hex');
export const cookieName = () => env.isProduction ? '__Host-clyvo-admin' : 'clyvo_admin';
export const cookieOptions = () => ({ httpOnly: true, secure: env.isProduction, sameSite: 'strict' as const, path: '/', maxAge: 8*3600*1000 });
export function tokenFrom(req: Request) {
 const raw = (req.headers.cookie ?? '').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName()+'='))?.slice(cookieName().length+1) ?? '';
 return /^[a-f0-9]{64}$/.test(raw) ? raw : '';
}
export function checkOrigin(req: Request) {
 const configured = process.env.ADMIN_ORIGIN;
 if (!configured || (env.isProduction && !configured.startsWith('https://')) || req.get('origin') !== configured) throw AppError.forbidden('Origem administrativa não autorizada.');
}
export function checkCsrf(req: Request) {
 checkOrigin(req);
 const token = tokenFrom(req); const supplied = req.get('x-clyvo-csrf') ?? '';
 const expected = hash('admin-csrf:'+token);
 if (!token || !/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected))) throw AppError.forbidden('Sessão inválida. Atualize a página.');
}
export async function audit(actor: number | null, action: string, type: string, id: number | null, reason='', metadata: unknown=null) {
 await execute('INSERT INTO admin_audit(actor_id,action,target_type,target_id,reason,metadata) VALUES(?,?,?,?,?,?)',[actor,action,type,id,reason,metadata===null?null:JSON.stringify(metadata)]);
}
export async function session(req: Request, lock=false) {
 const token=tokenFrom(req); if(!token) throw AppError.unauthorized('Entre no Clyvo Admin.');
 const row=await queryOne<Row>(`SELECT u.id,u.name,u.email,m.role,s.token_hash FROM admin_sessions s
 JOIN users u ON u.id=s.user_id JOIN admin_members m ON m.user_id=u.id
 LEFT JOIN session_security v ON v.user_id=u.id
 WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP() AND s.last_seen_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 30 MINUTE)
 AND s.security_version=COALESCE(v.version,0) AND m.enabled=1 AND u.status='ativo' AND u.deleted_at IS NULL ${lock?'FOR UPDATE':''}`,[hash(token)]);
 if(!row) throw AppError.unauthorized('Sua sessão expirou ou foi revogada. Entre novamente.');
 return row;
}
export async function authorize(req: Request, permission: Permission, lock=false) {
 const member=await session(req,lock);
 if(!allowed(member.role,permission)) throw AppError.forbidden('Você não tem permissão para esta ação.');
 return member;
}
export const guard=(permission: Permission)=>(req: Request,_res:Response,next:NextFunction)=>{authorize(req,permission).then(()=>next(),next);};
export async function login(email:string,password:string) {
 const user=await queryOne<Row>(`SELECT u.id,u.password_hash,u.status,u.deleted_at,m.role,m.enabled,COALESCE(v.version,0) version
 FROM users u LEFT JOIN admin_members m ON m.user_id=u.id LEFT JOIN session_security v ON v.user_id=u.id WHERE u.email=?`,[email]);
 const valid=user ? await verifyPassword(password,user.password_hash) : (await fakePasswordCheck(),false);
 if(!valid || !user || !user.enabled || user.status!=='ativo' || user.deleted_at || !allowed(user.role,'dashboard')) throw AppError.unauthorized('E-mail, senha ou acesso administrativo inválidos.');
 const token=randomBytes(32).toString('hex');
 await execute('DELETE FROM admin_sessions WHERE expires_at<=UTC_TIMESTAMP() OR last_seen_at<=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 30 MINUTE)');
 await execute('INSERT INTO admin_sessions(token_hash,user_id,security_version,expires_at) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))',[hash(token),user.id,user.version]);
 await audit(user.id,'session.login','admin',user.id);
 return token;
}
export async function me(req: Request) {
 const member=await session(req);
 await execute('UPDATE admin_sessions SET last_seen_at=UTC_TIMESTAMP() WHERE token_hash=?',[member.token_hash]);
 return {id:member.id,name:member.name,email:member.email,role:member.role,permissions:grantsFor(member.role as Role),csrf:hash('admin-csrf:'+tokenFrom(req))};
}
