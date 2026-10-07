import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { theme, useThemeMode, createThemedStyles } from '../theme';
import { Avatar } from './Avatar';
import { Logo } from './Logo';

interface AppHeaderProps {
  userName: string;
  hasNotifications?: boolean;
  onPressNotifications?: () => void;
  onPressAvatar?: () => void;
}

/** Cabecalho fixo das telas internas: logo a esquerda, sino e avatar a direita. */
export function AppHeader({
  userName,
  hasNotifications = false,
  onPressNotifications,
  onPressAvatar,
}: AppHeaderProps) {
  useThemeMode();
  return (
    <View style={styles.header}>
      <Logo size={30} />

      <View style={styles.actions}>
        <Pressable
          onPress={onPressNotifications}
          hitSlop={theme.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Notificacoes"
          style={styles.bell}
        >
          <Feather name="bell" size={24} color={theme.colors.text} />
          {hasNotifications ? <View style={styles.dot} /> : null}
        </Pressable>

        <Pressable
          onPress={onPressAvatar}
          hitSlop={theme.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Seu perfil"
        >
          <Avatar name={userName} size={theme.size.headerAvatar} brand />
        </Pressable>
      </View>
    </View>
  );
}

const styles = createThemedStyles(() => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  bell: {
    padding: 2,
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
}));
