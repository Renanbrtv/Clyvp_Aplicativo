/**
 * Gera docs/POLITICA-DE-PRIVACIDADE.md e docs/TERMOS-DE-USO.md a partir
 * do mesmo arquivo que alimenta as telas do app. Assim os dois nunca
 * saem do lugar um do outro.
 *
 *   node scripts/make-legal-docs.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../frontend/src/features/legal/legal-content.ts', import.meta.url));
const src = readFileSync(SRC, 'utf8');

// O arquivo e TypeScript; convertemos para JS executavel removendo os tipos.
const js = src
  .replace(/export interface [\s\S]*?\n}\n/g, '')
  .replace(/: LegalDocument\b/g, '')
  .replace(/ as const/g, '')
  .replace(/^import[\s\S]*?;\n/gm, '');

const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

function toMarkdown(doc) {
  const lines = [`# ${doc.title}`, '', `_${doc.subtitle}_`, ''];
  for (const section of doc.sections) {
    lines.push(`## ${section.heading}`, '');
    for (const p of section.paragraphs ?? []) lines.push(p, '');
    for (const b of section.bullets ?? []) lines.push(`- ${b}`);
    if (section.bullets?.length) lines.push('');
  }
  return lines.join('\n');
}

const OUT = fileURLToPath(new URL('../docs/', import.meta.url));
writeFileSync(`${OUT}POLITICA-DE-PRIVACIDADE.md`, toMarkdown(mod.privacyPolicy));
writeFileSync(`${OUT}TERMOS-DE-USO.md`, toMarkdown(mod.termsOfUse));
console.log('docs/POLITICA-DE-PRIVACIDADE.md e docs/TERMOS-DE-USO.md gerados');
