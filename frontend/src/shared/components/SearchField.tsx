import { StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { theme, useThemeMode, createThemedStyles } from '../theme';

interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

export function SearchField({ value, onChangeText, placeholder = 'Buscar' }: SearchFieldProps) {
  useThemeMode();
  return (
    <View style={styles.field}>
      <Feather name="search" size={20} color={theme.colors.textMuted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const styles = createThemedStyles(() => ({
  field: {
    height: theme.size.control,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: theme.fontSize.body,
    color: theme.colors.text,
    padding: 0,
  },
}));
