import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../utils/http';
import { withTransaction, execute, queryOne, type RowDataPacket } from '../../config/database';
import { marketService } from '../marketplace/service';
import { allowed, roles, type Permission } from './permissions';
import { adminEnabled, checkOrigin, checkCsrf, login, me, session, authorize, cookieName, cookieOptions, tokenFrom, hash } from './security';
import * as service from './service';
const router=Router();
router.use((_req,res,next)=>{res.set('Cache-Control','no-store');if(!adminEnabled()){res.status(404).end();return;}next();});
const throttle=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:true,legacyHeaders:false,message:{success:false,error:{message:'Muitas tentativas. Aguarde 15 minutos.'}}});
router.post('/login',throttle,asyncHandler(async(req,res)=>{
 checkOrigin(req);
 const input=z.object({email:z.string().email().max(160),password:z.string().min(1).max(200)}).strict().parse(req.body);
 const token=await login(input.email.trim().toLowerCase(),input.password);
 const old=tokenFrom(req);if(old)await execute('DELETE FROM admin_sessions WHERE token_hash=?',[hash(old)]);
 res.cookie(cookieName(),token,cookieOptions());return sendSuccess(res,{authenticated:true});
}));
router.use(asyncHandler(async(req,_res,next)=>{const member=await session(req);await execute('UPDATE admin_sessions SET last_seen_at=UTC_TIMESTAMP() WHERE token_hash=?',[member.token_hash]);if(!['GET','HEAD'].includes(req.method))checkCsrf(req);next();}));
router.get('/me',asyncHandler(async(req,res)=>sendSuccess(res,await me(req))));
router.post('/logout',asyncHandler(async(req,res)=>{await execute('DELETE FROM admin_sessions WHERE token_hash=?',[hash(tokenFrom(req))]);res.clearCookie(cookieName(),{...cookieOptions(),maxAge:undefined});return sendSuccess(res,{loggedOut:true});}));
const permissionFor:Record<service.Module,Permission>={users:'users.read',posts:'content.read',profiles:'content.read',reports:'reports',proposals:'proposals',subscriptions:'billing',admins:'settings',audit:'audit'};
const filter=z.object({search:z.string().trim().max(100).default(''),status:z.string().max(40).default(''),page:z.coerce.number().int().min(1).max(100000).default(1)}).strict();
const id=(x:unknown)=>z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).parse(x);
router.get('/dashboard',asyncHandler(async(req,res)=>{await authorize(req,'dashboard');return sendSuccess(res,await service.dashboard());}));
router.get('/search',asyncHandler(async(req,res)=>{
 const member=await session(req);const f=filter.parse(req.query);const result:Record<string,unknown>={};
 for(const m of ['users','posts','profiles','proposals'] as service.Module[])if(allowed(member.role,permissionFor[m]))result[m]=await service.list(m,{...f,page:1});
 return sendSuccess(res,result);
}));
router.get('/settings',asyncHandler(async(req,res)=>{await authorize(req,'settings');return sendSuccess(res,{approvalRequired:true,sessionHours:8,idleMinutes:30,roles});}));
for(const m of service.modules)router.get('/'+m,asyncHandler(async(req,res)=>{await authorize(req,permissionFor[m]);return sendSuccess(res,await service.list(m,filter.parse(req.query)));}));
router.get('/users/:id',asyncHandler(async(req,res)=>{await authorize(req,'users.read');return sendSuccess(res,await service.userDetail(id(req.params.id)));}));
router.get('/proposals/:id',asyncHandler(async(req,res)=>{await authorize(req,'proposals');return sendSuccess(res,await service.proposalDetail(id(req.params.id)));}));
router.get('/profiles/:id/reviews',asyncHandler(async(req,res)=>{await authorize(req,'content.read');return sendSuccess(res,await service.reviews(id(req.params.id)));}));
// Reuse existing content review service. Readers are restricted to administrators with content permission.
router.get('/content/:type/:id',asyncHandler(async(req,res)=>{
 const member=await authorize(req,'content.read');const type=z.enum(['post','profile']).parse(req.params.type);
 // Existing moderation service has the stricter moderator requirement; read-only admins use bounded SQL below.
 const target=id(req.params.id);
 const content=await queryOne<RowDataPacket>(type==='post'?'SELECT * FROM market_posts WHERE id=?':'SELECT * FROM market_profiles WHERE user_id=?',[target]);
 const review=await queryOne('SELECT state,revision,note FROM market_content_reviews WHERE target_type=? AND target_id=?',[type,target]);
 void member;
 const ownerId=content?.owner_id??content?.user_id;
 const owner=ownerId?await queryOne('SELECT id,name FROM users WHERE id=?',[ownerId]):null;
 return sendSuccess(res,{type,id:target,content,review,owner});
}));
router.get('/reports/:id',asyncHandler(async(req,res)=>{const member=await authorize(req,'reports');const data=await marketService.reportContent(member.id,id(req.params.id));const c=data.content;const userId=c?.owner_id??c?.sender_id??c?.author_id??c?.user_id;const reportedUser=userId?await queryOne('SELECT id,name FROM users WHERE id=?',[userId]):null;return sendSuccess(res,{...data,reportedUser});}));
const reason=z.string().trim().min(5).max(450);
router.post('/content/:type/:id/decision',asyncHandler(async(req,res)=>{
 const body=z.object({revision:z.number().int().positive(),action:z.enum(['approved','rejected','changes','suspended']),note:reason}).strict().parse(req.body);
 const type=z.enum(['post','profile']).parse(req.params.type);
 const result=await withTransaction(async()=>{const member=await authorize(req,'content.write',true);return marketService.decideContent(member.id,type,id(req.params.id),body);});
 return sendSuccess(res,result);
}));
router.post('/reports/:id/resolve',asyncHandler(async(req,res)=>{
 const body=z.object({action:z.enum(['ocultar','arquivar']),note:reason}).strict().parse(req.body);
 const result=await withTransaction(async()=>{const member=await authorize(req,'reports',true);return marketService.resolve(member.id,id(req.params.id),body);});return sendSuccess(res,result);
}));
router.post('/users/:id/status',asyncHandler(async(req,res)=>{
 const body=z.object({status:z.enum(['ativo','bloqueado']),reason}).strict().parse(req.body);
 return sendSuccess(res,await service.changeUser(req,id(req.params.id),body.status,body.reason));
}));
router.post('/admins',asyncHandler(async(req,res)=>{
 const body=z.object({email:z.string().email().max(160),role:z.enum(roles),enabled:z.boolean(),reason}).strict().parse(req.body);
 return sendSuccess(res,await service.changeMember(req,body.email,body.role,body.enabled,body.reason));
}));
export {router as adminRoutes};
