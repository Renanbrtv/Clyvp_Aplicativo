// Run after npm run build: node tests/moderation-unit.cjs
// Isolated service tests: database functions are mocked. No live credentials or services.
const assert = require('node:assert/strict');
process.env.NODE_ENV='test';
process.env.JWT_ACCESS_SECRET='unit-test-access-only-not-a-real-secret-12345';
process.env.JWT_REFRESH_SECRET='unit-test-refresh-only-not-a-real-secret-67890';
process.env.REVENUECAT_SECRET_KEY='';
process.env.MARKET_MODERATOR_USER_IDS='99';
const db=require('../dist/config/database');
const calls=[];
let review={state:'pending',revision:1,note:'',owner_id:1};
let post={id:10,owner_id:1,status:'aberta',hidden:0,photos:'[]',title:'Serviço de teste',due_date:null};
db.withTransaction=async fn=>fn({});
db.queryOne=async(sql,args=[])=>{
 calls.push([sql,args]);
 if(sql.includes('market_suspensions')||sql.includes('market_blocks'))return null;
 if(sql.includes('market_content_reviews'))return {...review};
 if(sql.includes('market_preferences'))return {consent_version:'mercado-2026-10-v2'};
 if(sql.includes('market_works'))return null;
 if(sql.includes('market_posts')&&!sql.includes('COUNT'))return {...post};
 if(sql.includes('COUNT'))return {n:0,view_count:2};
 if(sql.includes('subscriptions'))return null;
 if(sql.includes('market_views'))return null;
 return {id:1};
};
db.query=async(sql,args=[])=>{calls.push([sql,args]);return [];};
db.execute=async(sql,args=[])=>{
 calls.push([sql,args]);
 if(sql.startsWith('UPDATE market_content_reviews SET state='))review={...review,state:args[0]};
 if(sql.includes('INSERT INTO market_content_reviews'))review={...review,state:'pending',revision:review.revision+1};
 return {insertId:10,affectedRows:1};
};
const {marketService:s}=require('../dist/modules/marketplace/service');
const {postSchema,day}=require('../dist/modules/marketplace/validation');
let passed=0;
async function test(name,fn){await fn();passed++;console.log('OK '+name);}
async function main(){
 const input={title:'Instalação de câmeras',category:'Outros',description:'Preciso instalar duas câmeras em minha loja.',city:'Goiânia',region:'Centro',latitude:null,longitude:null,mode:'presencial',budgetFrom:100,budgetTo:200,dueDate:null,photos:[],acceptRules:true};
 await test('formulário válido e data opcional',()=>assert.equal(postSchema.parse(input).dueDate,null));
 await test('data impossível é rejeitada',()=>assert.equal(day.safeParse('2027-02-31').success,false));
 await test('cidade presencial obrigatória',()=>assert.equal(postSchema.safeParse({...input,city:''}).success,false));
 await test('cliente não pode autoaprovar',()=>assert.equal(postSchema.safeParse({...input,state:'approved'}).success,false));
 await test('usuário comum não acessa fila',()=>assert.rejects(()=>s.moderation(2),e=>e.statusCode===403));
 await test('usuário comum não lê conteúdo da moderação',()=>assert.rejects(()=>s.reviewContent(2,'post',10),e=>e.statusCode===403));
 await test('usuário comum não aprova',()=>assert.rejects(()=>s.decideContent(2,'post',10,{revision:1,action:'approved',note:'Aprovado'}),e=>e.statusCode===403));
 await test('anúncio pendente não abre para terceiro',()=>assert.rejects(()=>s.post(2,10),e=>e.statusCode===404));
 await test('autor pode ver pendência e métricas',async()=>{const r=await s.post(1,10);assert.equal(r.post.moderation.state,'pending');assert.equal(r.post.view_count,2);});
 await test('aprovação de revisão antiga é recusada',()=>assert.rejects(()=>s.decideContent(99,'post',10,{revision:2,action:'approved',note:'Conferido'}),e=>e.statusCode===409));
 await test('aprovação válida gera auditoria',async()=>{await s.decideContent(99,'post',10,{revision:1,action:'approved',note:'Conferido'});assert.equal(review.state,'approved');assert.ok(calls.some(([q])=>q.includes('INSERT INTO market_content_decisions')));});
 await test('edição de outra conta é recusada',()=>assert.rejects(()=>s.editPost(2,10,input),e=>e.statusCode===404));
 await test('edição do autor volta para análise',async()=>{await s.editPost(1,10,input);assert.equal(review.state,'pending');assert.equal(review.revision,2);});
 await test('visitas do autor não são registradas',async()=>{calls.length=0;await s.post(1,10);assert.ok(!calls.some(([q])=>q.includes('INSERT INTO market_views')));});
 await test('novo anúncio entra na fila',async()=>{const r=await s.createPost(1,input);assert.equal(r.moderation,'pending');});
 await test('listagem exige aprovação e não exclui autor',async()=>{calls.length=0;await s.posts(1,{page:1,search:'câmeras'});const sql=calls.find(([q])=>q.includes('distance_km FROM market_posts'))?.[0];assert.ok(sql.includes("cr.state='approved'"));assert.ok(!sql.includes('p.owner_id<>?'));assert.ok(sql.includes('p.title LIKE ?'));});
 console.log(passed+' testes unitários passaram (banco simulado).');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
