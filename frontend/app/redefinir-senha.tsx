import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { authApi } from '../src/shared/api/auth.api';
import { ApiError } from '../src/shared/api/types';
import { Button, Input, Screen, ScreenHeader } from '../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../src/shared/theme';
export default function RedefinirSenhaScreen() {
  useThemeMode();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (loading) return;
    setError(null);
    if (password.length < 8 || password !== confirmation || token.trim().length < 20) {
      setError('Cole o codigo recebido, use uma senha de pelo menos 8 caracteres e confirme a mesma senha.'); return;
    }
    setLoading(true);
    try { await authApi.resetPassword(token.trim(), password); setToken(''); setPassword(''); setConfirmation(''); setDone(true); }
    catch(e) { setError(e instanceof ApiError ? e.message : 'Nao foi possivel alterar sua senha.'); }
    finally { setLoading(false); }
  }
  return <Screen scroll keyboardAware>
    <ScreenHeader title="Redefinir senha" />
    <View style={styles.form}>
      {done ? <>
        <Text style={styles.text}>Senha alterada. Entre novamente com sua nova senha.</Text>
        <Link href="/(auth)/login">Entrar na minha conta</Link>
      </> : <>
        <Text style={styles.text}>Cole o codigo do e-mail de recuperacao. Ele so pode ser usado uma vez.</Text>
        <Input label="Codigo de recuperacao" autoCapitalize="none" value={token} onChangeText={setToken} />
        <Input label="Nova senha" secure value={password} onChangeText={setPassword} />
        <Input label="Confirmar nova senha" secure value={confirmation} onChangeText={setConfirmation} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Salvar nova senha" loading={loading} onPress={() => void submit()} />
        <Link href="/(auth)/esqueci-senha">Solicitar outro codigo</Link>
      </>}
    </View>
  </Screen>;
}
const styles = createThemedStyles(() => ({
  form: { gap: theme.spacing.md, paddingTop: theme.spacing.lg },
  text: { ...theme.typography.body, color: theme.colors.textSecondary },
  error: { ...theme.typography.body, color: theme.colors.danger },
}));
