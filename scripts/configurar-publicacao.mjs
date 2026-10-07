import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rl = readline.createInterface({ input: stdin, output: stdout });
async function ask(label, valid = value => value.length > 0) {
  while (true) { const value = (await rl.question(label + ': ')).trim(); if (valid(value)) return value;
    console.log('Valor invalido. Informe um valor real para continuar.'); }
}
const https = value => { try { const u = new URL(value); return u.protocol === 'https:' && !/localhost|example|\.invalid$/.test(u.hostname); } catch { return false; } };
console.log('Clyvo — configuracao de publicacao. Sem senhas ou chaves secretas neste assistente.');
try {
  const name = await ask('Seu nome completo ou razao social');
  const document = await ask('CNPJ real ou escreva Pessoa fisica');
  const city = await ask('Cidade e estado');
  const retention = await ask('Descreva os prazos reais de retencao e exclusao de logs e backups');
  const billingKey = await ask('Chave PUBLICA Android do RevenueCat (goog_...)', v => /^goog_[A-Za-z0-9]+$/.test(v));
  const email = await ask('E-mail real de suporte e privacidade', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  const site = (await ask('URL HTTPS da hospedagem das paginas publicas (nao precisa de site comercial)', https)).replace(/\/$/, '');
  const api = (await ask('URL HTTPS da API hospedada, terminando em /api', v => https(v) && /\/api\/?$/.test(v))).replace(/\/$/, '');
  const legalPath = path.join(root, 'frontend/src/features/legal/legal-content.ts');
  const legal = fs.readFileSync(legalPath, 'utf8').replace(/export const COMPANY = \{[\s\S]*?\} as const;/,
    `export const COMPANY = ${JSON.stringify({ name, document, city, email, site, retention }, null, 2)} as const;`);
  fs.writeFileSync(legalPath, legal);
  const easPath = path.join(root, 'frontend/eas.json');
  const eas = JSON.parse(fs.readFileSync(easPath, 'utf8'));
  for (const key of ['preview', 'production']) { eas.build[key].env.EXPO_PUBLIC_API_URL = api; eas.build[key].env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = billingKey; }
  fs.writeFileSync(easPath, JSON.stringify(eas, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'frontend/.env.production'), `EXPO_PUBLIC_API_URL=${api}\nEXPO_PUBLIC_REVENUECAT_ANDROID_KEY=${billingKey}\n`);
  console.log('Configurado. Agora rode: node scripts/make-legal-docs.mjs');
  console.log('Publique /privacidade, /termos e /excluir-conta em ' + site);
  console.log('Configure backend/.env com banco, segredos JWT, EMAIL_API_KEY e EMAIL_FROM.');
} finally { rl.close(); }
