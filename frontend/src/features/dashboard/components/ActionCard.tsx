import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { theme, useThemeMode, createThemedStyles } from '../../../shared/theme';

interface ActionCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  badge?: string;
  onPress?: () => void;
}

/** Atalhos "Clientes" e "Orcamentos" da tela Inicio. */
export function ActionCard({ icon, label, badge, onPress }: ActionCardProps) {
  useThemeMode();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Feather name={icon} size={22} color={theme.colors.primary} />

      <View style={styles.texts}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      </View>


    </Pressable>
  );
}

const styles = createThemedStyles(() => ({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  pressed: {
    backgroundColor: theme.colors.surfaceSoftStrong,
  },
  texts: {
    flex: 1,
  },
  label: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  badge: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
}));
