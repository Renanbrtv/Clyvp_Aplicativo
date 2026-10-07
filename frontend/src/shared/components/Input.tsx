import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { theme, useThemeMode, createThemedStyles } from '../theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: keyof typeof Feather.glyphMap;
  error?: string;
  hint?: string;
  secure?: boolean;
  keyboard?: KeyboardTypeOptions;
}

export function Input({
  label,
  icon,
  error,
  hint,
  secure = false,
  keyboard,
  ...rest
}: InputProps) {
  useThemeMode();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.field, { borderColor, borderWidth: focused || error ? 1.5 : 1 }]}>
        {icon ? (
          <Feather
            name={icon}
            size={20}
            color={focused ? theme.colors.primary : theme.colors.textMuted}
          />
        ) : null}

        <TextInput
          style={styles.input}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={hidden}
          keyboardType={keyboard}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={secure || keyboard === 'email-address' ? 'none' : 'sentences'}
          autoCorrect={false}
          {...rest}
        />

        {secure ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={theme.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
          >
            <Feather name={hidden ? 'eye' : 'eye-off'} size={20} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = createThemedStyles(() => ({
  wrapper: {
    gap: theme.spacing.xxs,
  },
  label: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    marginBottom: 2,
  },
  field: {
    height: theme.size.control,
    borderRadius: theme.radius.lg,
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
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
}));
