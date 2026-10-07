import sharp from '/home/claude/.npm-global/lib/node_modules/sharp/lib/index.js';

const SRC = '/mnt/user-data/uploads/Clyvo.jpg';
const OUT = '/home/claude/clyvo/frontend/assets';
const ORANGE = { r: 255, g: 120, b: 39, alpha: 1 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// 1. Recorta a moldura branca do arquivo original.
const trimmed = await sharp(SRC).trim({ threshold: 12 }).toBuffer();
const { width, height } = await sharp(trimmed).metadata();
console.log(`logo recortado: ${width}x${height}`);

// 2. Deriva o canal alfa pixel a pixel: quanto mais longe do branco, mais opaco.
//    Isso preserva o antialias das bordas (unflatten corta na marra e serrilha).
const { data: rgb } = await sharp(trimmed)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const px = width * height;
const cover = new Uint8Array(px);
let darkest = 255;
for (let i = 0; i < px; i++) {
  const r = rgb[i * 3];
  const g = rgb[i * 3 + 1];
  const b = rgb[i * 3 + 2];
  const min = r < g ? (r < b ? r : b) : g < b ? g : b;
  cover[i] = 255 - min;
  if (min < darkest) darkest = min;
}

// Normaliza para que o traco cheio fique 100% opaco e descarta o halo
// (a sombra suave do JPEG original viraria um brilho ao redor das letras).
const span = 255 - darkest || 1;
const FLOOR = 42; // abaixo disso e sombra, nao traco
const alpha = Buffer.alloc(px);
for (let i = 0; i < px; i++) {
  const norm = (cover[i] * 255) / span;
  const v = Math.round(((norm - FLOOR) * 255) / (255 - FLOOR));
  alpha[i] = v < 0 ? 0 : v > 255 ? 255 : v;
}

/** Pinta a marca de uma cor solida usando o alfa derivado acima. */
async function tint({ r, g, b }) {
  const out = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = alpha[i];
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

const wordmarkOrange = await tint(ORANGE);
const wordmarkWhite = await tint(WHITE);

/** Centraliza a marca sobre um fundo, com margem de seguranca. */
async function compose(size, background, logo, scale) {
  const resized = await sharp(logo)
    .resize({ width: Math.round(size * scale), fit: 'inside' })
    .toBuffer();

  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer();
}

// icon.png - laranja da marca com a palavra em branco
await sharp(await compose(1024, ORANGE, wordmarkWhite, 0.72)).toFile(`${OUT}/icon.png`);

// adaptive-icon.png - so o primeiro plano. O Android recorta as bordas,
// entao o conteudo cabe dentro da zona segura (66% da area).
await sharp(await compose(1024, TRANSPARENT, wordmarkWhite, 0.54)).toFile(`${OUT}/adaptive-icon.png`);

// splash-icon.png - marca laranja sobre branco
await sharp(await compose(1024, WHITE, wordmarkOrange, 0.66)).toFile(`${OUT}/splash-icon.png`);

// favicon.png - aba do navegador
await sharp(await compose(196, ORANGE, wordmarkWhite, 0.82)).toFile(`${OUT}/favicon.png`);

// notification-icon.png - Android exige silhueta branca sobre transparente
await sharp(await compose(256, TRANSPARENT, wordmarkWhite, 0.78)).toFile(`${OUT}/notification-icon.png`);

// og-image.png - miniatura ao compartilhar o link do site
await sharp({ create: { width: 1200, height: 630, channels: 4, background: ORANGE } })
  .composite([
    { input: await sharp(wordmarkWhite).resize({ width: 520, fit: 'inside' }).toBuffer(), gravity: 'center' },
  ])
  .png()
  .toFile(`${OUT}/og-image.png`);

// ---------- Imagens exigidas pela Google Play ----------
const STORE = '/home/claude/clyvo/docs/play-store';

// Icone da loja: 512x512, sem transparencia.
await sharp(await compose(512, ORANGE, wordmarkWhite, 0.72)).toFile(`${STORE}/icone-512.png`);

// Imagem de destaque: 1024x500, com a frase da marca.
const FEATURE_W = 1024;
const FEATURE_H = 500;
const tagline = Buffer.from(
  `<svg width="${FEATURE_W}" height="${FEATURE_H}" xmlns="http://www.w3.org/2000/svg">
     <text x="${FEATURE_W / 2}" y="352" text-anchor="middle"
           font-family="Verdana, DejaVu Sans, sans-serif" font-size="38"
           font-weight="500" fill="#FFFFFF" opacity="0.92">
       Transforme conversas em vendas
     </text>
   </svg>`,
);

await sharp({ create: { width: FEATURE_W, height: FEATURE_H, channels: 4, background: ORANGE } })
  .composite([
    {
      input: await sharp(wordmarkWhite).resize({ width: 430, fit: 'inside' }).toBuffer(),
      top: 130,
      left: Math.round((FEATURE_W - 430) / 2),
    },
    { input: tagline, top: 0, left: 0 },
  ])
  .png()
  .toFile(`${STORE}/destaque-1024x500.png`);

console.log(`assets gerados (pixel mais escuro: ${darkest})`);
