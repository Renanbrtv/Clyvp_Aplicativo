import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const front = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(front, '..');
const profile = process.env.EAS_BUILD_PROFILE;
if (profile && profile !== 'production') process.exit(0);
const problems = [];
const eas = JSON.parse(fs.readFileSync(path.join(front, 'eas.json'), 'utf8'));
const api = process.env.EXPO_PUBLIC_API_URL || eas.build.production.env.EXPO_PUBLIC_API_URL;
try {
  const url = new URL(api);
  if (url.protocol !== 'https:' || /localhost|example|SEU-|127\.0\.0\.1|\.invalid$/.test(url.hostname)) throw new Error();
} catch { problems.push('Configure a URL HTTPS real da API com node scripts/configurar-publicacao.mjs.'); }
const legal = fs.readFileSync(path.join(front, 'src/features/legal/legal-content.ts'), 'utf8');
if (legal.includes('Responsavel a configurar') || legal.includes('00.000.000/0001-00')) problems.push('Preencha os dados reais do responsavel pela privacidade.');
if (legal.includes('RETENCAO_A_CONFIGURAR')) problems.push('Informe os prazos reais de retencao de logs e backups na politica de privacidade.');
const billingKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || eas.build.production.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
if (!billingKey?.startsWith('goog_')) problems.push('Configure EXPO_PUBLIC_REVENUECAT_ANDROID_KEY para habilitar os planos pagos no Android.');
if (!fs.existsSync(path.join(front, 'package-lock.json'))) problems.push('Falta package-lock.json no app. Execute npm install.');
if (problems.length) {
  console.error('\nClyvo — publicacao bloqueada:\n' + problems.map(x => '- ' + x).join('\n'));
  process.exit(1);
}
console.log('Configuracao local de publicacao conferida. Ainda teste a API hospedada, e-mail e aparelho real.');
