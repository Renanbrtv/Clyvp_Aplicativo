import { useState } from 'react';
import { Link } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { authApi } from '../src/shared/api/auth.api';
import { ApiError } from '../src/shared/api/types';
import { useAuth } from '../src/features/auth/auth-context';
import { Button, Input, Screen, ScreenHeader } from '../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../src/shared/theme';

export default function ExcluirContaScreen() {
  useThemeMode();
  const { user, logout } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    if (confirmation !== 'EXCLUIR' || !email.trim() || !password || loading) return;
    setLoading(true); setError(null);
    try {
      await authApi.deleteAccount(email.trim(), password);
      // Ao excluir outra conta pela pagina publica, preserve a sessao corrente.
      if (user?.email.toLowerCase() === email.trim().toLowerCase()) await logout();
      setPassword(''); setDone(true);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Nao foi possivel excluir. Tente novamente.'); }
    finally { setLoading(false); }
  }
  return <Screen scroll keyboardAware>
    <ScreenHeader title="Excluir conta Clyvo" />
    <View style={styles.form}>
      {done ? <>
        <Text style={styles.text}>Sua conta e os dados associados foram excluidos do banco ativo.</Text>
        <Link href="/(auth)/login">Voltar para o login</Link>
      </> : <>
        <Text style={styles.text}>Esta acao e permanente. Serao apagados seu perfil, empresa, clientes, catalogo, propostas, oportunidades, vendas, lembretes e sessoes. Exporte o que deseja guardar antes de continuar.</Text>
        <Text style={styles.text}>Excluir a conta nao cancela uma assinatura na Google Play. Cancele a renovacao na loja antes de excluir.</Text>
        <Button label="Gerenciar assinatura na Google Play" variant="outline" onPress={() => void Linking.openURL('https://play.google.com/store/account/subscriptions').catch(() => setError('Abra Assinaturas no aplicativo Google Play.'))} />
        <Input label="E-mail da conta" keyboard="email-address" value={email} onChangeText={setEmail} />
        <Input label="Senha atual" secure value={password} onChangeText={setPassword} />
        <Input label="Digite EXCLUIR para confirmar" autoCapitalize="characters" value={confirmation} onChangeText={setConfirmation} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Excluir minha conta e dados" variant="danger" loading={loading}
          disabled={confirmation !== 'EXCLUIR' || !email.trim() || !password} onPress={() => void remove()} />
        <Link href="/(auth)/esqueci-senha">Esqueci minha senha</Link>
        <Link href="/privacidade">Politica de privacidade</Link>
      </>}
    </View>
  </Screen>;
}
const styles = createThemedStyles(() => ({
  form: { gap: theme.spacing.md, paddingTop: theme.spacing.lg },
  text: { ...theme.typography.body, color: theme.colors.textSecondary },
  error: { ...theme.typography.body, color: theme.colors.danger },
}));
