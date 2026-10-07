/** Regression tests: isolation, transaction rollback, parallel mutations and account erasure. */
import assert from 'node:assert/strict';
import { env } from '../config/env';
import { closePool, queryOne, type RowDataPacket } from '../config/database';
const api = `${env.SMOKE_TEST_BASE_URL}${env.API_PREFIX}`;
let checks = 0;
function check(condition: unknown, message: string) { assert.ok(condition, message); checks++; console.log(`OK ${message}`); }
async function req(method: string, path: string, body?: unknown, token?: string) {
  const response = await fetch(api + path, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  return { status: response.status, body: await response.json() as any };
}
async function main() {
  if (env.isProduction || !/test/i.test(env.DB_NAME)) throw new Error('Use um banco de teste (DB_NAME contendo test), nunca producao.');
  const password = 'Release@2026'; const email = `release.${Date.now()}@clyvo.app`;
  const a = await req('POST', '/auth/register', { name: 'Release Test', email, password });
  check(a.status === 201, 'Conta de teste criada'); const uid = a.body.data.user.id;
  const token = a.body.data.tokens.accessToken;
  const b = await req('POST', '/auth/register', { name: 'Other Test', email: `other.${email}`, password });
  const otherToken = b.body.data.tokens.accessToken;
  const client = await req('POST', '/clients', { name: 'Cliente release', whatsapp: '55999991234' }, token);
  const cid = client.body.data.client.id;
  const opp = await req('POST','/opportunities',{ clientId: cid, title: 'Venda release', totalAmount: 250 },token);
  const oid = opp.body.data.opportunity.id;
  const item = { itemType: 'avulso', description: 'Servico', quantity: 1, unitPrice: 250 };
  const q = await req('POST','/quotes',{clientId:cid, opportunityId:oid, type:'orcamento', items:[item], discountType:'percentual', discountAmount:10},token);
  const qid = q.body.data.quote.id;
  check(q.body.data.quote.total === 225 && q.body.data.quote.discountValue === 25, 'Desconto percentual calculado em reais');
  const edited = await req('PATCH',`/quotes/${qid}`,{type:'proposta', discountAmount:20},token);
  check(edited.body.data.quote.total === 200 && edited.body.data.quote.discountAmount === 20, 'Alteracao isolada de desconto recalcula total');
  check(edited.body.data.quote.type === 'proposta', 'Tipo do documento pode ser editado');
  const editedAgain = await req('PATCH',`/quotes/${qid}`,{items:[item]},token);
  check(editedAgain.body.data.quote.total === 200, 'Editar itens preserva desconto percentual');
  const invalid = await req('PATCH',`/quotes/${qid}`,{notes:'Nao gravar',items:[{...item,itemType:'produto',productId:99999999}]},token);
  check(invalid.status === 400,'Item inexistente recusado');
  const afterInvalid = await req('GET',`/quotes/${qid}`,undefined,token);
  check(afterInvalid.body.data.quote.notes !== 'Nao gravar','Falha faz rollback de toda a alteracao');
  const statuses = await Promise.all([1,2].map(()=>req('POST',`/opportunities/${oid}/status`,{status:'fechado', amount:200},token)));
  check(statuses.every(x=>x.status===200),'Fechamentos concorrentes respondem sem falha');
  const exported = await req('GET','/users/me/export',undefined,token);
  check(exported.status === 200 && exported.body.data.user.id===uid,'Exportacao retorna o titular');
  check(exported.body.data.data.sales.length === 1,'Fechamentos concorrentes registram uma unica venda');
  check(!JSON.stringify(exported.body).includes('password_hash'),'Exportacao nao inclui hash de senha');
  const otherExport = await req('GET','/users/me/export',undefined,otherToken);
  check(otherExport.body.data.data.clients.length===0,'Exportacao nao vaza clientes de outra conta');
  const whatsapp = await req('GET',`/clients/${cid}/whatsapp`,undefined,token);
  check(whatsapp.body.data.link.startsWith('https://wa.me/5555999991234?'),'DDD 55 recebe codigo do pais');
  const refresh = a.body.data.tokens.refreshToken;
  const rotations = await Promise.all([1,2].map(()=>req('POST','/auth/refresh',{refreshToken:refresh})));
  check(rotations.filter(x=>x.status===200).length===1 && rotations.filter(x=>x.status===401).length===1,'Token de sessao consumido uma unica vez');
  const reset = await req('POST','/auth/forgot-password',{email});
  const code = reset.body.data.devToken;
  if (code) {
    const resetResults = await Promise.all([1,2].map(()=>req('POST','/auth/reset-password',{token:code,newPassword:password})));
    check(resetResults.filter(x=>x.status===200).length===1 && resetResults.filter(x=>x.status===400).length===1,'Codigo de recuperacao consumido uma unica vez');
  }
  const stale = await req('GET','/auth/me',undefined,token);
  check(stale.status===401, 'Access token revogado imediatamente apos redefinir senha');
  // Fill the five-quote free quota concurrently; no overflow and all sequence numbers unique.
  const newLogin = await req('POST','/auth/login',{email,password});
  const activeToken = newLogin.body.data.tokens.accessToken;
  const creations = await Promise.all(Array.from({length:8},()=>req('POST','/quotes',{clientId:cid,type:'orcamento',items:[item]},activeToken)));
  check(creations.filter(x=>x.status===201).length===4,'Limite mensal respeitado em criacoes concorrentes');
  check(creations.filter(x=>x.status===402).length===4,'Excesso concorrente devolve limite do plano');
  const numbers = creations.filter(x=>x.status===201).map(x=>x.body.data.quote.number);
  check(new Set(numbers).size===4,'Numeracao de proposta e unica sob concorrencia');
  const badDelete = await req('POST','/auth/delete-account',{email,password:'Errada'});
  check(badDelete.status===401,'Exclusao exige senha correta');
  const deletion = await req('POST','/auth/delete-account',{email,password});
  check(deletion.status===200,'Exclusao funciona sem sessao no navegador');
  const remains = await queryOne<RowDataPacket>('SELECT COUNT(*) AS total FROM users WHERE id = ?', [uid]);
  check(remains?.total===0,'Usuario fisicamente removido');
  for(const table of ['clients','opportunities','quotes','quote_items','sales','follow_ups','notifications','companies','settings','refresh_tokens','password_reset_tokens','subscriptions']) {
    const row = await queryOne<RowDataPacket>(`SELECT COUNT(*) AS total FROM ${table} WHERE user_id = ?`,[uid]);
    check(row?.total===0,`Exclusao em cascata: ${table}`);
  }
  const deletedAccess = await req('GET','/auth/me',undefined,activeToken);
  check(deletedAccess.status===401 || deletedAccess.status===403,'Sessao antiga perde acesso apos exclusao');
  const signupAgain = await req('POST','/auth/register',{email,password,name:'Conta nova'});
  check(signupAgain.status===201,'E-mail liberado depois de excluir conta');
  await req('POST','/auth/delete-account',{email,password});
  await req('POST','/auth/delete-account',{email:`other.${email}`,password});
  console.log(`\nREGRESSAO: ${checks} verificacoes aprovadas`);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(closePool);
