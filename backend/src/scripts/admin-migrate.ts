import fs from 'node:fs';
import path from 'node:path';
import {getPool,closePool} from '../config/database';
async function main(){
 const candidates=[path.resolve('database/admin.sql'),path.resolve('../database/admin.sql')];
 const file=candidates.find(p=>fs.existsSync(p));if(!file)throw new Error('database/admin.sql não encontrado.');
 // Run only additive admin DDL; never rerun plan seeds or drop data.
 const sql=fs.readFileSync(file,'utf8').replace(/^--.*$/gm,'');
 for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await getPool().query(statement);
 console.log('Estrutura administrativa criada. Nenhum plano ou dado existente foi alterado.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(closePool);
