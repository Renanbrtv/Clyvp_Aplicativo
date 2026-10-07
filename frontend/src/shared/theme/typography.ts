/**
 * Clyvo - escala tipografica.
 *
 * Uma unica familia, pesos bem definidos e uma escala curta.
 * Regra do design: quanto maior o numero, mais pesado o texto -
 * valores em destaque sao sempre bold e quase pretos.
 */
import { Platform, type TextStyle } from 'react-native';

export const fontFamily = {
  regular: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }) as string,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

export const fontSize = {
  /** Numero heroi do card de vendas: R$ 8.450 */
  display: 34,
  /** Saudacao: "Ola, Renan" */
  h1: 30,
  /** Numero secundario: R$ 14.200 */
  h2: 28,
  /** Titulo de secao: "Resumo do mes" */
  h3: 20,
  /** Nome do cliente, titulo de card, texto de botao */
  title: 17,
  /** Texto corrido e labels */
  body: 15,
  /** Legendas, "Ultimo contato ha 3 dias" */
  caption: 13,
  /** Badges e labels da tab bar */
  tiny: 11,
} as const;

export const lineHeight = {
  display: 40,
  h1: 38,
  h2: 34,
  h3: 26,
  title: 22,
  body: 20,
  caption: 18,
  tiny: 14,
} as const;

/** Estilos prontos - use `typography.h1` direto no style do Text. */
export const typography = {
  display: {
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.6,
  },
  h1: {
    fontSize: fontSize.h1,
    lineHeight: lineHeight.h1,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: fontSize.h2,
    lineHeight: lineHeight.h2,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: fontSize.h3,
    lineHeight: lineHeight.h3,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.2,
  },
  title: {
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    fontWeight: fontWeight.semibold,
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    fontWeight: fontWeight.regular,
  },
  bodyMedium: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    fontWeight: fontWeight.medium,
  },
  caption: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    fontWeight: fontWeight.regular,
  },
  badge: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    fontWeight: fontWeight.semibold,
  },
  tab: {
    fontSize: fontSize.tiny,
    lineHeight: lineHeight.tiny,
    fontWeight: fontWeight.medium,
  },
} as const satisfies Record<string, TextStyle>;

export type Typography = typeof typography;
