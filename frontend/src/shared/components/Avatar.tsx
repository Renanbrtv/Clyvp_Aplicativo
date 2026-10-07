import { StyleSheet, Text, View } from 'react-native';

import { theme, useThemeMode, createThemedStyles } from '../theme';

interface AvatarProps {
  name: string;
  size?: number;
  /** Forca as cores da marca (usado no avatar do cabecalho). */
  brand?: boolean;
}

export function Avatar({ name, size = theme.size.avatar, brand = false }: AvatarProps) {
  useThemeMode();
  const colors = brand
    ? { background: theme.colors.primarySoft, text: theme.colors.primaryInk }
    : theme.avatarColorFor(name);

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.background,
        },
      ]}
    >
      <Text style={[styles.initials, { color: colors.text, fontSize: size * 0.36 }]}>
        {theme.initialsFor(name)}
      </Text>
    </View>
  );
}

const styles = createThemedStyles(() => ({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.2,
  },
}));
