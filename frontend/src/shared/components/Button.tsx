import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { theme, useThemeMode, createThemedStyles, createThemedValue } from '../theme';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'large' | 'small';

interface ButtonProps {
  label: string;
  labelLines?: number;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Feather.glyphMap;
  iconRight?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  labelLines = 1,
  onPress,
  variant = 'primary',
  size = 'large',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: ButtonProps) {
  useThemeMode();
  const isDisabled = disabled || loading;
  const tone = TONES[variant];
  const height = size === 'large' ? theme.size.control : theme.size.controlSmall;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          ...(labelLines > 1 ? { height: undefined, minHeight: height, paddingVertical: 12 } : {}),
          backgroundColor: pressed && !isDisabled ? tone.pressedBackground : tone.background,
          borderColor: tone.border,
          borderWidth: tone.border === 'transparent' ? 0 : 1,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: fullWidth ? theme.spacing.lg : theme.spacing.xl,
        },
        variant === 'primary' && !isDisabled ? theme.shadow.raised : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.text} />
      ) : (
        <View style={styles.content}>
          {icon ? <Feather name={icon} size={18} color={tone.text} /> : null}
          <Text style={[styles.label, { color: tone.text }]} numberOfLines={labelLines}>
            {label}
          </Text>
          {iconRight ? <Feather name={iconRight} size={18} color={tone.text} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const TONES: Record<Variant, { background: string; pressedBackground: string; border: string; text: string }> = createThemedValue(() => ({
  primary: {
    background: theme.colors.primary,
    pressedBackground: theme.colors.primaryPressed,
    border: 'transparent',
    text: theme.colors.onPrimary,
  },
  outline: {
    background: theme.colors.surface,
    pressedBackground: theme.colors.surfaceSoft,
    border: theme.colors.borderPrimary,
    text: theme.colors.primaryInk,
  },
  ghost: {
    background: 'transparent',
    pressedBackground: theme.colors.surfaceSoft,
    border: 'transparent',
    text: theme.colors.primaryInk,
  },
  danger: {
    background: theme.colors.dangerSoft,
    pressedBackground: theme.colors.dangerPressed,
    border: 'transparent',
    text: theme.colors.danger,
  },
}));

const styles = createThemedStyles(() => ({
  base: {
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.semibold,
  },
}));
