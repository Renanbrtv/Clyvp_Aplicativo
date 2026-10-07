import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme, useThemeMode, createThemedStyles } from '../theme';

export interface FabAction {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
}

/** Botao flutuante "+" com o menu de criacao rapida. */
export function Fab({ actions, bottom = theme.size.tabBar + 12 }: { actions: FabAction[]; bottom?: number }) {
  useThemeMode();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Criar"
        style={({ pressed }) => [
          styles.fab,
          { bottom: bottom + insets.bottom },
          pressed && { backgroundColor: theme.colors.primaryPressed },
        ]}
      >
        <Feather name="plus" size={28} color={theme.colors.onPrimary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing.lg }]}>
            <View style={styles.handle} />
            <Text style={styles.title}>O que voce quer criar?</Text>

            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => {
                  setOpen(false);
                  setTimeout(action.onPress, 120);
                }}
                style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              >
                <View style={styles.actionIcon}>
                  <Feather name={action.icon} size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.actionTexts}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  {action.description ? (
                    <Text style={styles.actionDescription}>{action.description}</Text>
                  ) : null}
                </View>
                <Feather name="chevron-right" size={20} color={theme.colors.primaryInk} />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = createThemedStyles(() => ({
  fab: {
    position: 'absolute',
    right: theme.screenPadding,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.raised,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 19, 24, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
    paddingHorizontal: theme.screenPadding,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.divider,
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surfaceSoft,
  },
  actionPressed: {
    backgroundColor: theme.colors.surfaceSoftStrong,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  actionTexts: {
    flex: 1,
  },
  actionLabel: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  actionDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
}));
