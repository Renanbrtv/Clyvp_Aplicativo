import { Stack } from 'expo-router';

import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';

export default function AuthLayout() {
  useThemeMode();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
