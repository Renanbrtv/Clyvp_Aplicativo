import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { theme, useThemeMode, createThemedStyles } from '../theme';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterChipsProps<T extends string> {
  options: Array<ChipOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

export function FilterChips<T extends string>({ options, value, onChange }: FilterChipsProps<T>) {
  useThemeMode();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {option.label}
              {option.count !== undefined && option.count > 0 ? ` (${option.count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = createThemedStyles(() => ({
  row: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs,
  },
  chip: {
    height: theme.size.chip,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceSoftStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  label: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  labelActive: {
    color: theme.colors.onPrimary,
  },
}));
