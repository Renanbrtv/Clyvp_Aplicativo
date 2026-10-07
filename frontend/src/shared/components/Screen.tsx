import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme, useThemeMode, createThemedStyles } from '../theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Espacamento lateral padrao das telas. */
  padded?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardAware?: boolean;
  bottomInset?: number;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  refreshControl,
  contentStyle,
  keyboardAware = false,
  bottomInset = 0,
}: ScreenProps) {
  useThemeMode();
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={[
        styles.content,
        padded && { paddingHorizontal: theme.screenPadding },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ paddingBottom: insets.bottom + bottomInset + theme.spacing.xl }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {content}
    </ScrollView>
  ) : (
    content
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {keyboardAware ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}

const styles = createThemedStyles(() => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
}));
