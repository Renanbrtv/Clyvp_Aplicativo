/**
 * Design system do Clyvo.
 *
 *   import { theme } from '@/shared/theme';
 *   ...
 *   backgroundColor: theme.colors.primary
 *
 * Toda cor, tamanho e espacamento das telas sai daqui - assim o app
 * inteiro muda de aparencia a partir de um unico lugar.
 */
export * from './colors';
export * from './typography';
export * from './layout';
export * from './state';
import { isDarkTheme } from './state';

import { avatarColorFor, badgeColors, colors, initialsFor, palette } from './colors';
import { hitSlop, motion, radius, screenPadding, shadow, size, spacing } from './layout';
import { fontSize, fontWeight, lineHeight, typography } from './typography';

const darkColors = { ...colors, background: '#101113', surface: '#1A1C20', surfaceSoft: '#292018', surfaceSoftStrong: '#36271D',
 primaryInk: '#FFAB70', primarySoft: '#472B1B', text: '#F5F5F7', textSecondary: '#C2C3CB', textMuted: '#A4A6B0',
 border: '#383A40', divider: '#383A40', borderPrimary: '#5F3924', danger: '#FF8A8A', dangerSoft: '#3B2025', dangerPressed: '#52272F',
 success: '#8DDDA8', successSoft: '#173425', warning: '#FFC583', warningSoft: '#392D17', info: '#9DC4FF', infoSoft: '#1E2C44' };

export const theme = {
  get colors(): { [K in keyof typeof colors]: string } { return isDarkTheme() ? darkColors : colors; },
  palette,
  badgeColors,
  typography,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  screenPadding,
  radius,
  size,
  shadow,
  motion,
  hitSlop,
  avatarColorFor,
  initialsFor,
} as const;

export type Theme = typeof theme;
