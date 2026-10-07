/**
 * Clyvo - paleta de cores.
 *
 * Os valores foram extraidos diretamente dos mockups aprovados
 * (telas "Inicio" e "Meus clientes") e do arquivo do logo.
 * Nenhuma cor deve ser escrita "na mao" dentro de uma tela:
 * sempre importe daqui.
 */

export const palette = {
  /* ---------- Marca ---------- */
  /** Laranja Clyvo. Cor do logo, dos botoes primarios e do card de vendas. */
  orange500: '#FF7827',
  /** Estado pressionado / gradiente do card de destaque. */
  orange600: '#F26A15',
  orange700: '#E8590C',
  /** Laranja para TEXTO e icones sobre fundo claro (contraste maior). */
  orange800: '#C2410C',

  /** Superficies alaranjadas, do mais forte para o mais suave. */
  orange100: '#FFEADD',
  orange75: '#FFF0E8',
  orange50: '#FFF5EF',

  /* ---------- Neutros ---------- */
  white: '#FFFFFF',
  gray25: '#FCFCFD',
  gray100: '#EFEEF0',
  gray200: '#EAEAEC',
  gray400: '#9799A5',
  gray600: '#5A5B67',
  gray900: '#111318',

  /* ---------- Semanticas ---------- */
  red600: '#CE0000',
  red100: '#FFD9D9',
  red50: '#FFECEC',

  amber700: '#BF5900',
  amber50: '#FFF0CB',

  green700: '#0E7830',
  green50: '#DCF7E3',

  blue700: '#0038A9',
  blue50: '#E5F0FE',

  purple700: '#48079E',
  purple50: '#F0E4FE',

  /* ---------- Avatares ---------- */
  peach100: '#FFE5D6',
  peach700: '#DA430B',
} as const;

export const colors = {
  /* Fundos */
  background: palette.white,
  surface: palette.white,
  /** Cards de acao, "Precisa da sua atencao", card de cliente em destaque. */
  surfaceSoft: palette.orange50,
  /** Chips inativos e pill da aba ativa. */
  surfaceSoftStrong: palette.orange75,

  /* Marca */
  primary: palette.orange500,
  primaryPressed: palette.orange600,
  /** Use em textos e icones laranja sobre fundo claro ("Ver todos", "WhatsApp"). */
  primaryInk: palette.orange700,
  primarySoft: palette.orange100,
  onPrimary: palette.white,
  /** Texto secundario sobre o card laranja (ex.: "Vendas do mes"). */
  onPrimaryMuted: 'rgba(255, 255, 255, 0.86)',
  /** Fundo do badge "+28%" dentro do card laranja. */
  onPrimaryOverlay: 'rgba(255, 255, 255, 0.22)',

  /* Texto */
  text: palette.gray900,
  textSecondary: palette.gray600,
  textMuted: palette.gray400,

  /* Linhas */
  border: palette.gray100,
  divider: palette.gray200,
  borderPrimary: palette.orange100,

  /* Feedback */
  danger: palette.red600,
  dangerSoft: palette.red50,
  dangerPressed: palette.red100,
  success: palette.green700,
  successSoft: palette.green50,
  warning: palette.amber700,
  warningSoft: palette.amber50,
  info: palette.blue700,
  infoSoft: palette.blue50,
} as const;

/** Cores dos badges de status do cliente e da oportunidade. */
export const badgeColors = {
  semResposta: { background: palette.amber50, text: palette.amber700 },
  recorrente: { background: palette.green50, text: palette.green700 },
  novoCliente: { background: palette.blue50, text: palette.blue700 },
  altoValor: { background: palette.purple50, text: palette.purple700 },
  atencao: { background: palette.red50, text: palette.red600 },
} as const;

/**
 * Cores de avatar por iniciais.
 * `avatarColorFor(nome)` escolhe sempre a mesma cor para o mesmo cliente.
 */
export const avatarColors = [
  { background: palette.peach100, text: palette.peach700 },
  { background: palette.purple50, text: palette.purple700 },
  { background: palette.blue50, text: palette.blue700 },
  { background: palette.green50, text: palette.green700 },
  { background: palette.amber50, text: palette.amber700 },
] as const;

export function avatarColorFor(name: string): (typeof avatarColors)[number] {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 100000;
  }
  return avatarColors[hash % avatarColors.length];
}

/** "Joao Silva" -> "JS" */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type Colors = typeof colors;
