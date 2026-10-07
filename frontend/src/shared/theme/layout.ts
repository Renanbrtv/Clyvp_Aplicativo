/**
 * Clyvo - espacamento, raios e sombras.
 * Grade de 4pt: todo espacamento e multiplo de 4.
 */
import { Platform, type ViewStyle } from 'react-native';

import { palette } from './colors';

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

/** Margem lateral das telas. */
export const screenPadding = spacing.lg;

export const radius = {
  sm: 10,
  md: 14,
  /** Botoes e campos de busca. */
  lg: 16,
  /** Cards. */
  xl: 20,
  /** Card de destaque (vendas do mes). */
  xxl: 24,
  /** Chips, badges e avatares. */
  pill: 999,
} as const;

export const size = {
  /** Altura dos botoes principais e do campo de busca. */
  control: 56,
  /** Altura dos botoes secundarios dentro dos cards. */
  controlSmall: 46,
  chip: 44,
  avatar: 52,
  avatarSmall: 40,
  icon: 24,
  iconSmall: 20,
  tabBar: 64,
  headerAvatar: 44,
} as const;

/**
 * Sombras discretas: o design se apoia em superficies e bordas,
 * nao em profundidade. Use `card` na maioria dos casos.
 */
export const shadow = {
  none: {} as ViewStyle,
  card: Platform.select({
    ios: {
      shadowColor: palette.gray900,
      shadowOpacity: 0.04,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 1 },
    default: {},
  }) as ViewStyle,
  raised: Platform.select({
    ios: {
      shadowColor: palette.orange500,
      shadowOpacity: 0.22,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 4 },
    default: {},
  }) as ViewStyle,
} as const;

/** Duracao das animacoes. Discretas, nunca chamativas. */
export const motion = {
  fast: 120,
  normal: 200,
  slow: 320,
} as const;

/** Area minima de toque (acessibilidade). */
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
