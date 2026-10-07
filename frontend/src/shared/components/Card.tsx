import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme, useThemeMode, createThemedStyles } from '../theme';

interface CardProps {
  children: ReactNode;
  /** `soft` usa o fundo alaranjado das telas aprovadas. */
  tone?: 'surface' | 'soft' | 'primary';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, tone = 'surface', padded = true, style }: CardProps) {
  useThemeMode();
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        tone === 'surface' && styles.surface,
        tone === 'soft' && styles.soft,
        tone === 'primary' && styles.primary,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = createThemedStyles(() => ({
  base: {
    borderRadius: theme.radius.xl,
  },
  padded: {
    padding: theme.spacing.md,
  },
  surface: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  soft: {
    backgroundColor: theme.colors.surfaceSoft,
  },
  primary: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xxl,
  },
}));
