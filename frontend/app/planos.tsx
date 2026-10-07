import { useCallback, useState } from 'react';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/features/auth/auth-context';
import { loadStore, buyPlan, restoreStore, type StorePlan } from '../src/features/billing/store';
import { api } from '../src/shared/api/client';
import { plansApi } from '../src/shared/api/resources.api';
import { type Plan, type Subscription } from '../src/shared/api/types';
import { Badge, Button, Card, ErrorState, LoadingState, Screen, ScreenHeader } from '../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../src/shared/theme';
import { currency } from '../src/shared/utils/format';

export default function PlanosScreen() {
  useThemeMode();
 const { user, status, reload } = useAuth(); const router = useRouter();
 const [plans, setPlans] = useState<Plan[]>([]); const [subscription, setSubscription] = useState<Subscription | null>(null);
 const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [message, setMessage] = useState('');
 const [storePlans, setStorePlans] = useState<StorePlan[]>([]); const [identity, setIdentity] = useState<string | null>(null); const [busy, setBusy] = useState(false);
 const load = useCallback(async () => {
   if (!user) { setLoading(false); return; }
   try {
     const [data, current, billing] = await Promise.all([plansApi.list(),plansApi.current(),api.get<{ configured: boolean; appUserId: string | null }>('/subscriptions/billing')]);
     setPlans(data.plans);setSubscription(current.subscription);setIdentity(billing.appUserId);setError('');
     if (billing.configured && billing.appUserId && Platform.OS === 'android') {
       try { setStorePlans(await loadStore(billing.appUserId)); } catch (e) { setMessage(e instanceof Error ? e.message : 'Nao foi possivel consultar a loja.'); }
     } else setStorePlans([]);
   } catch (e) { setError(e instanceof Error ? e.message : 'Nao foi possivel carregar os planos.'); }
   finally { setLoading(false); }
 }, [user?.id]);
 useFocusEffect(useCallback(() => { void load(); }, [load]));
 if (status === 'visitante') return <Redirect href="/login" />;
 async function purchase(plan: StorePlan) {
   setBusy(true); setMessage('');
   try {
     await buyPlan(plan); await api.post('/subscriptions/sync'); await reload(); await load();
     const current = await plansApi.current();
     setMessage(current.subscription.plan.code === plan.code ? 'Assinatura confirmada. Seus beneficios estao liberados.' : 'A compra ainda nao foi confirmada pelo servidor. Se estiver pendente, aguarde; nao compre novamente. Use Atualizar assinatura.');
   } catch (e) { if (!(e as { userCancelled?: boolean }).userCancelled) setMessage(e instanceof Error ? e.message : 'Compra nao confirmada. Confira a Google Play.'); }
   finally { setBusy(false); }
 }
 async function restore() {
   if (!identity) return;setBusy(true);
   try { await restoreStore(identity);await api.post('/subscriptions/sync');await reload();await load();setMessage('Compras consultadas. Confira seu plano atual.'); }
   catch (e) { setMessage(e instanceof Error ? e.message : 'Nao foi possivel restaurar.'); } finally { setBusy(false); }
 }
 const paid = subscription?.plan.code !== 'free';
 return <Screen scroll><ScreenHeader title="Planos e beneficios" subtitle="Escolha a capacidade que combina com seu negocio." />
 {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : <>
 {message ? <Text accessibilityRole="alert" style={styles.note}>{message}</Text> : null}
 {subscription?.usage ? <Card style={styles.usage}><Text style={styles.usageTitle}>Seu uso</Text>{Object.entries({ Clientes: subscription.usage.clientes, 'Orcamentos neste mes': subscription.usage.propostas, 'Itens no catalogo': subscription.usage.catalogo }).map(([name,entry]) => <Text key={name} style={styles.usageLabel}>{name}: {entry.used} / {entry.limit ?? 'sem limite'}</Text>)}</Card> : null}
 <View style={styles.list}>{plans.map(plan => {
   const current = subscription?.plan.code === plan.code;const offer = storePlans.find(p => p.code === plan.code);
   const features = [plan.limits.maxClients===null?'Clientes ilimitados':`Ate ${plan.limits.maxClients} clientes ativos`, plan.limits.maxQuotesPerMonth===null?'Orcamentos ilimitados':`Ate ${plan.limits.maxQuotesPerMonth} orcamentos por mes`, `Ate ${plan.limits.maxCatalogItems} itens no catalogo`, 'Funil, lembretes e mensagens prontas para WhatsApp', plan.features.customPdf ? 'PDF com logo da sua empresa' : 'PDF com a marca Clyvo', plan.code === 'free' ? 'Cly: 3 geracoes por rodada; esperas de 2, 4 e 8 horas' : `Cly: ${plan.code === 'pro' ? 50 : 150} geracoes por mes`, 'Perfil profissional, conversa e avaliacoes de trabalhos', plan.code==='free'?'50 oportunidades detalhadas e 5 propostas por mes':`Oportunidades detalhadas sem limite; ${plan.code==='pro'?50:150} propostas por mes`, `${plan.code==='free'?5:plan.code==='pro'?30:60} publicacoes de oportunidades por mes`, ...(plan.code==='free'?[]:['Metas mensais de renda']), 'Historico de ganhos e exportacao dos seus dados'];
   return <Card key={plan.id} style={[styles.plan,current && styles.planCurrent]}><View style={styles.planHeader}><Text style={styles.planName}>{plan.name}</Text>{current ? <Badge label="Seu plano" tone="recorrente" /> : null}</View>
     <Text style={styles.price}>{plan.code === 'free' ? 'Gratis' : `${offer?.price ?? currency(plan.price,{cents:true})} / mes`}</Text>
     {features.map(feature => <Text key={feature} style={styles.featureText}>✓ {feature}</Text>)}
     {current ? <Button label="Plano atual" disabled /> : plan.code === 'free' ? null : <Button label={paid ? 'Gerenciar assinatura atual' : offer ? `Assinar ${plan.name}` : 'Compra indisponivel nesta instalacao'} disabled={busy || (!offer && !paid)} onPress={() => { if (paid) void Linking.openURL('https://play.google.com/store/account/subscriptions'); else if (offer) void purchase(offer); }} />}
   </Card>;
 })}</View>
 <Text style={styles.note}>Assinaturas mensais com renovacao automatica ate o cancelamento. Confirme o valor e as condicoes na Google Play. Cancele em Assinaturas da Google Play; o acesso permanece ate o fim do periodo pago. Excluir a conta Clyvo nao cancela a assinatura na loja. A geracao da Cly depende da disponibilidade do servico.</Text>
 {identity && Platform.OS === 'android' ? <Button label="Restaurar compras" variant="outline" loading={busy} onPress={() => void restore()} /> : null}
 <Button label="Atualizar assinatura" variant="ghost" disabled={busy} onPress={() => { setBusy(true); void api.post('/subscriptions/sync').then(async () => { await reload();await load(); }).catch(e => setMessage(e.message)).finally(() => setBusy(false)); }} />
 <Button label="Gerenciar na Google Play" variant="ghost" onPress={() => { void Linking.openURL('https://play.google.com/store/account/subscriptions'); }} />
 <Button label="Termos de uso" variant="ghost" onPress={() => router.push('/termos')} /><Button label="Privacidade" variant="ghost" onPress={() => router.push('/privacidade')} />
 </>}
 </Screen>;
}
const styles = createThemedStyles(() => ({
  usage: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
  },
  usageTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  usageBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderPrimary,
  },
  usageLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  usageValue: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  usageReached: {
    color: theme.colors.danger,
  },
  list: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
  },
  plan: {
    gap: theme.spacing.sm,
  },
  planPopular: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  planCurrent: {
    backgroundColor: theme.colors.surfaceSoft,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  planDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.xs,
  },
  price: {
    ...theme.typography.h2,
    color: theme.colors.primary,
  },
  priceOld: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  pricePeriod: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  founder: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: theme.colors.warningSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  founderText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    flex: 1,
  },
  features: {
    gap: 6,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  featureText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  note: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    paddingTop: theme.spacing.xl,
  },
}));
