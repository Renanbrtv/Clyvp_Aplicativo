import { Redirect, useRouter } from 'expo-router';
import { Image, Text, View } from 'react-native';
import { useAuth } from '../src/features/auth/auth-context';
import {
  Button, Card, LoadingState, Screen, ScreenHeader,
} from '../src/shared/components';
import {
  theme, useThemeMode, createThemedStyles,
} from '../src/shared/theme';

export default function ClyScreen() {
  useThemeMode();
  const router = useRouter();
  const { status } = useAuth();

  if (status === 'carregando') {
    return <Screen><LoadingState /></Screen>;
  }

  if (status === 'visitante') {
    return <Redirect href="/login" />;
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Cly" subtitle="Sua assistente de trabalho" />
      <Card>
        <View style={styles.content}>
          <Image
            source={require('../assets/cly/cly.png')}
            style={styles.avatar}
            accessibilityLabel="Cly, a mascote laranja do Clyvo"
          />
          <Text style={styles.title}>Em breve</Text>
          <Text style={styles.text}>
            Sua assistente está sendo preparada. Enquanto isso, use as mensagens prontas.
          </Text>
          <Button
            label="Mensagens prontas"
            onPress={() => router.push('/recuperacao')}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = createThemedStyles(() => ({
  content: { gap: 18, paddingVertical: 20 },
  avatar: { width: 96, height: 96, alignSelf: 'center' },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  text: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
}));
