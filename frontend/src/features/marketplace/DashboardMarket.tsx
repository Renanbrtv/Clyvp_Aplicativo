import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../auth/auth-context';
import { theme } from '../../shared/theme';
import { Button, Card, Text, View, styles, Note, useData, currency } from './ui';
export function DashboardMarket() {
  const { user } = useAuth();
  const preferenceKey = `clyvo.market-card.hidden.${user?.id ?? 'guest'}`;
  const [preference, setPreference] = useState<{ key: string; hidden: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    async function restore() {
      let hidden = false;
      try {
        const saved = Platform.OS === 'web'
          ? globalThis.localStorage?.getItem(preferenceKey)
          : await SecureStore.getItemAsync(preferenceKey);
        hidden = saved === 'true';
      } catch { /* Continue with the card visible if storage is unavailable. */ }
      if (active) setPreference({ key: preferenceKey, hidden });
    }
    void restore();
    return () => { active = false; };
  }, [preferenceKey]);
  async function setHidden(hidden: boolean) {
    setPreference({ key: preferenceKey, hidden });
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.setItem(preferenceKey, String(hidden));
      else await SecureStore.setItemAsync(preferenceKey, String(hidden));
    } catch { /* The choice still applies during this session. */ }
  }
  const d = useData('/market/summary'),
    me = useData('/market/me'),
    r = useRouter();
  const established = ['tenho_clientes', 'organizar_negocio'].includes(d.data?.preferences?.intent);
  if (preference?.key !== preferenceKey) return null;
  if (preference.hidden) {
    return <Button label="Mostrar oportunidades" variant="ghost" onPress={() => void setHidden(false)} />;
  }
  return (
    <Card style={{ marginVertical: 18 }}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Text style={[styles.title, { flex: 1 }]}>
          {established ? 'Novos clientes e seus ganhos' : 'Transforme o que você sabe fazer em dinheiro.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar quadro de oportunidades"
          accessibilityHint="Oculta este quadro. Você pode reabri-lo em Mostrar oportunidades."
          onPress={() => void setHidden(true)}
          style={({ pressed }) => ({
            width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
            borderRadius: 22, opacity: pressed ? 0.6 : 1,
          })}
        >
          <Feather name="x" size={22} color={theme.colors.textSecondary} />
        </Pressable>
        </View>
        <Note>
          {established
            ? 'Acompanhe seus clientes e encontre novas oportunidades.'
            : 'Pronto para transformar suas habilidades em dinheiro? Comece pelo seu perfil profissional.'}
        </Note>
        {d.data ? (
          <>
            <Text style={styles.metric}>{currency(d.data.earnings.metrics.month_total)}</Text>
            <Note>Registrados neste mês · {d.data.counts.completed} serviços concluídos</Note>
            <Note>
              {d.data.counts.available} oportunidades disponíveis · {d.data.counts.proposals} propostas
              pendentes · {d.data.counts.active} trabalhos em andamento
            </Note>
          </>
        ) : d.error ? (
          <>
            <Note>Não foi possível carregar o resumo de oportunidades.</Note>
            <Button label="Tentar novamente" variant="ghost" onPress={() => void d.load()} />
          </>
        ) : (
          <Note>Carregando oportunidades...</Note>
        )}
        <Button label="Encontrar oportunidades" onPress={() => r.push('/mercado')} />
        <Button
          label="Publicar meu serviço"
          variant="outline"
          onPress={() => r.push('/mercado/perfil-profissional')}
        />
        <Button label="Meus ganhos e metas" variant="ghost" onPress={() => r.push('/mercado/ganhos')} />
        {!d.data?.preferences ? (
          <Button label="Escolher meu objetivo" variant="ghost" onPress={() => r.push('/mercado/comecar')} />
        ) : null}
        {me.data?.moderator ? (
          <Button label="Moderar publicações e denúncias" variant="outline" onPress={() => r.push('/mercado/moderacao')} />
        ) : null}
      </View>
    </Card>
  );
}
