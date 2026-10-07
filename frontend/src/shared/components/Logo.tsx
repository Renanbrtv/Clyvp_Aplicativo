import { Text, type TextStyle } from 'react-native';

import { theme, useThemeMode, createThemedStyles } from '../theme';

interface LogoProps {
  size?: number;
  color?: string;
  style?: TextStyle;
}

/**
 * Marca do Clyvo em texto.
 * Quando tivermos o SVG do logo, ele entra aqui sem mudar nenhuma tela.
 */
export function Logo({ size = 28, color = theme.colors.primary, style }: LogoProps) {
  useThemeMode();
  return (
    <Text
      style={[
        {
          fontSize: size,
          lineHeight: size * 1.25,
          fontWeight: theme.fontWeight.bold,
          letterSpacing: -0.8,
          color,
        },
        style,
      ]}
    >
      Clyvo
    </Text>
  );
}
