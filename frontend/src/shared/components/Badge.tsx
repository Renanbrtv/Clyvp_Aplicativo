import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { theme, useThemeMode, createThemedStyles } from '../theme';

type Tone = 'semResposta' | 'recorrente' | 'novoCliente' | 'altoValor' | 'atencao' | 'neutro';

interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Feather.glyphMap;
}

export function Badge({ label, tone = 'neutro', icon }: BadgeProps) {
  useThemeMode();
  const colors =
    tone === 'neutro'
      ? { background: theme.colors.surfaceSoftStrong, text: theme.colors.textSecondary }
      : theme.badgeColors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      {icon ? <Feather name={icon} size={12} color={colors.text} /> : null}
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = createThemedStyles(() => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
  },
  label: {
    ...theme.typography.badge,
  },
}));
