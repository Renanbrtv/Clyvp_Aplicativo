import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { api } from '../src/shared/api/client';
import { ApiError } from '../src/shared/api/types';
import { Button, Screen, ScreenHeader } from '../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../src/shared/theme';
export default function ExportarDadosScreen() {
  useThemeMode();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  async function save() {
    if (loading) return;
    setLoading(true); setMessage('');
    try {
      const data = await api.get<unknown>('/users/me/export');
      const content = JSON.stringify(data, null, 2);
      const name = `clyvo-dados-${new Date().toISOString().slice(0,10)}.json`;
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
        anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        if (!await Sharing.isAvailableAsync()) throw new Error('Compartilhamento indisponivel neste aparelho.');
        const file = new File(Paths.cache, name); file.write(content);
        try { await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Salvar dados do Clyvo' }); }
        finally { if (file.exists) file.delete(); }
      }
      setMessage('Exportacao preparada. Guarde o arquivo num local seguro.');
    } catch (e) { setMessage(e instanceof ApiError || e instanceof Error ? e.message : 'Nao foi possivel exportar.'); }
    finally { setLoading(false); }
  }
  return <Screen scroll><ScreenHeader title="Exportar meus dados" />
    <View style={styles.form}>
      <Text style={styles.text}>Baixe um arquivo JSON com seu perfil, empresa, clientes, catalogo, oportunidades, propostas, vendas e lembretes. Ele contem dados pessoais: compartilhe apenas com quem voce autorizar.</Text>
      <Button label="Baixar meus dados" icon="download" loading={loading} onPress={() => void save()} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  </Screen>;
}
const styles = createThemedStyles(() => ({ form: { gap: theme.spacing.md, paddingTop: theme.spacing.lg },
  text: { ...theme.typography.body, color: theme.colors.textSecondary } }));
