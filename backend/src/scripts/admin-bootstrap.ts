import { queryOne, execute, withTransaction, closePool, type RowDataPacket } from '../config/database';
import { audit } from '../modules/admin/security';
async function main(){
 const [email,idText,...extra]=process.argv.slice(2);const id=Number(idText);
 if(!email || !Number.isSafeInteger(id) || id<1 || extra.length)throw new Error('Uso: node dist/scripts/admin-bootstrap.js EMAIL ID. Use uma conta existente.');
 await withTransaction(async()=>{
  await queryOne('SELECT id FROM admin_control WHERE id=1 FOR UPDATE');
  const existing=await queryOne<RowDataPacket>("SELECT COUNT(*) n FROM admin_members m JOIN users u ON u.id=m.user_id WHERE m.enabled=1 AND m.role='owner' AND u.status='ativo' AND u.deleted_at IS NULL");
  if(Number(existing?.n)>0)throw new Error('Já existe um proprietário. Gerencie os acessos pelo painel.');
  const user=await queryOne<RowDataPacket>("SELECT id FROM users WHERE id=? AND email=? AND status='ativo' AND deleted_at IS NULL FOR UPDATE",[id,email]);
  if(!user)throw new Error('ID e e-mail não correspondem a uma conta ativa.');
  await execute("INSERT INTO admin_members(user_id,role,enabled) VALUES(?,'owner',1) ON DUPLICATE KEY UPDATE role='owner',enabled=1",[id]);
  await audit(null,'admin.bootstrap','user',id,'Autorização inicial pelo operador do servidor');
  console.log('Proprietário autorizado. Entre com a senha dessa conta no Clyvo Admin.');
 });
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(closePool);
