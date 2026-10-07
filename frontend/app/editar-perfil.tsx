import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/features/auth/auth-context';
import { api } from '../src/shared/api/client';
import { ApiError } from '../src/shared/api/types';
import { Button, Input, Screen, ScreenHeader } from '../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../src/shared/theme';
export default function EditarPerfilScreen() {
  useThemeMode();
  const { account, reload } = useAuth();
  const company = account?.company;
  const [form, setForm] = useState({ name: account?.user.name ?? '', whatsapp: account?.user.whatsapp ?? '',
    tradeName: company?.tradeName ?? '', email: company?.email ?? '', document: company?.document ?? '',
    city: company?.address.city ?? '', state: company?.address.state ?? '', logoUrl: company?.logoUrl ?? '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const set = (key: keyof typeof form) => (value: string) => setForm(prev => ({ ...prev, [key]: value }));
  async function save() {
    if (saving) return;
    if (form.name.trim().length < 2) { setMessage('Informe seu nome com pelo menos 2 caracteres.'); return; }
    setSaving(true); setMessage('');
    try {
      // Separately show what remains if the second endpoint fails.
      await api.patch('/companies/me', { tradeName: form.tradeName.trim() || null,
        whatsapp: form.whatsapp.trim() || null, email: form.email.trim() || null,
        document: form.document.trim() || null, city: form.city.trim() || null,
        state: form.state.trim() || null, logoUrl: form.logoUrl.trim() || null });
      await api.patch('/users/me', { name: form.name.trim(), whatsapp: form.whatsapp.trim() || null });
      await reload(); setMessage('Perfil e empresa atualizados.');
    } catch (e) { await reload().catch(() => undefined);
      setMessage((e instanceof ApiError ? e.message : 'Nao foi possivel salvar.') + ' Confira os campos e tente novamente.'); }
    finally { setSaving(false); }
  }
  return <Screen scroll keyboardAware><ScreenHeader title="Perfil e empresa" />
    <View style={styles.form}>
      <Input label="Seu nome" value={form.name} onChangeText={set('name')} />
      <Input label="Nome do negocio" value={form.tradeName} onChangeText={set('tradeName')} />
      <Input label="WhatsApp" keyboard="phone-pad" value={form.whatsapp} onChangeText={set('whatsapp')} />
      <Input label="E-mail do negocio" keyboard="email-address" value={form.email} onChangeText={set('email')} />
      <Input label="CPF ou CNPJ do negocio (opcional)" value={form.document} onChangeText={set('document')} />
      <Input label="Cidade" value={form.city} onChangeText={set('city')} />
      <Input label="Estado (sigla)" autoCapitalize="characters" maxLength={2} value={form.state} onChangeText={set('state')} />
      <Input label="Link HTTPS da logo (opcional)" autoCapitalize="none" value={form.logoUrl} onChangeText={set('logoUrl')} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
      <Button label="Salvar" loading={saving} onPress={() => void save()} />
    </View>
  </Screen>;
}
const styles = createThemedStyles(() => ({ form: { gap: theme.spacing.md, paddingTop: theme.spacing.lg },
  text: { ...theme.typography.body, color: theme.colors.textSecondary } }));
