
import { useCallback, useState } from 'react';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

import { useAuth } from '../src/features/auth/auth-context';
import {
  loadStore,
  buyPlan,
  restoreStore,
  type StorePlan,
} from '../src/features/billing/store';
import { api } from '../src/shared/api/client';
import { plansApi } from '../src/shared/api/resources.api';
import { type Plan, type Subscription } from '../src/shared/api/types';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
} from '../src/shared/components';
import {
  theme,
  useThemeMode,
  createThemedStyles,
} from '../src/shared/theme';
import { currency } from '../src/shared/utils/format';

const GAP = theme.spacing.md;

export default function PlanosScreen() {
  useThemeMode();

  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 64, 370);
  const router = useRouter();
  const { user, status, reload } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [storePlans, setStorePlans] = useState<StorePlan[]>([]);
  const [identity, setIdentity] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [data, current, billing] = await Promise.all([
        plansApi.list(),
        plansApi.current(),
        api.get<{
          configured: boolean;
          appUserId: string | null;
        }>('/subscriptions/billing'),
      ]);

      setPlans(data.plans);
      setSubscription(current.subscription);
      setIdentity(billing.appUserId);
      setError('');

      if (
        billing.configured &&
        billing.appUserId &&
        Platform.OS === 'android'
      ) {
        try {
          setStorePlans(await loadStore(billing.appUserId));
        } catch (e) {
          setMessage(
            e instanceof Error
              ? e.message
              : 'Não foi possível consultar a loja.',
          );
        }
      } else {
        setStorePlans([]);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Não foi possível carregar os planos.',
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (status === 'visitante') {
    return <Redirect href="/login" />;
  }

  async function purchase(plan: StorePlan) {
    setBusy(true);
    setMessage('');

    try {
      await buyPlan(plan);
      await api.post('/subscriptions/sync');
      await reload();
      await load();

      const current = await plansApi.current();

      setMessage(
        current.subscription.plan.code === plan.code
          ? 'Assinatura confirmada. Seus benefícios estão liberados.'
          : 'A compra ainda não foi confirmada pelo servidor. Se estiver pendente, aguarde; não compre novamente. Use Atualizar assinatura.',
      );
    } catch (e) {
      if (!(e as { userCancelled?: boolean }).userCancelled) {
        setMessage(
          e instanceof Error
            ? e.message
            : 'Compra não confirmada. Confira a Google Play.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!identity) return;

    setBusy(true);

    try {
      await restoreStore(identity);
      await api.post('/subscriptions/sync');
      await reload();
      await load();
      setMessage('Compras consultadas. Confira seu plano atual.');
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : 'Não foi possível restaurar.',
      );
    } finally {
      setBusy(false);
    }
  }

  const paid = subscription?.plan.code !== 'free';

  function getFeatures(plan: Plan): string[] {
    const code = plan.code;
    const isFree = code === 'free';
    const isPro = code === 'pro';
    const isProPlus = code === 'pro_max';

    const features = [
      plan.limits.maxClients === null
        ? 'Clientes ilimitados'
        : `Até ${plan.limits.maxClients} clientes`,

      plan.limits.maxQuotesPerMonth === null
        ? 'Orçamentos ilimitados'
        : `Até ${plan.limits.maxQuotesPerMonth} orçamentos por mês`,

      `Até ${plan.limits.maxCatalogItems} itens no catálogo`,

      'Funil de vendas, lembretes e mensagens prontas para WhatsApp',

      plan.features.customPdf
        ? 'PDF com logo da sua empresa'
        : 'PDF com a marca Clyvo',

      isFree
        ? 'Cly: 3 gerações por rodada, com intervalos de 2, 4 e 8 horas'
        : `Cly: ${isPro ? 50 : 150} gerações por mês`,

      'Perfil profissional, conversa e avaliações de trabalhos',

      isFree
        ? 'Acesso a oportunidades e até 5 propostas por mês'
        : isPro
          ? 'Oportunidades detalhadas e até 50 propostas por mês'
          : 'Oportunidades detalhadas sem limite; 150 propostas por mês',

      `Até ${isFree ? 5 : isPro ? 30 : 60} publicações de oportunidades por mês`,

      ...(isFree ? [] : ['Metas mensais de renda']),

      'Histórico de ganhos e exportação dos seus dados',
    ];

    return features;
  }

  function handleCarouselScroll(
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / (cardWidth + GAP));
    setActiveIndex(Math.max(0, Math.min(index, plans.length - 1)));
  }

  return (
    <Screen scroll>
      <ScreenHeader
        title="Planos e benefícios"
        subtitle="Escolha a capacidade que combina com seu negócio."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : (
        <>
          {message ? (
            <Text accessibilityRole="alert" style={styles.note}>
              {message}
            </Text>
          ) : null}

          {subscription?.usage ? (
            <Card style={styles.usage}>
              <Text style={styles.usageTitle}>Seu uso</Text>

              {Object.entries({
                Clientes: subscription.usage.clientes,
                'Orçamentos neste mês': subscription.usage.propostas,
                'Itens no catálogo': subscription.usage.catalogo,
              }).map(([name, entry]) => (
                <Text key={name} style={styles.usageLabel}>
                  {name}: {entry.used} / {entry.limit ?? 'sem limite'}
                </Text>
              ))}
            </Card>
          ) : null}

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Conheça os planos</Text>
            <Text style={styles.sectionSubtitle}>
              Deslize para o lado e compare os benefícios.
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            contentContainerStyle={styles.carouselContent}
            onMomentumScrollEnd={handleCarouselScroll}
          >
            {plans.map((plan) => {
              const current = subscription?.plan.code === plan.code;
              const recommended = plan.code === 'pro_max';
              const offer = storePlans.find(
                (item) => item.code === plan.code,
              );

              const displayName =
                plan.code === 'free' ? 'Grátis' : plan.name;

              return (
                <View
                  key={plan.id}
                  style={{ width: cardWidth }}
                >
                  <Card
                    style={[
                      styles.plan,
                      recommended && styles.planRecommended,
                      current && styles.planCurrent,
                    ]}
                  >
                    {recommended ? (
                      <View style={styles.recommendedLabel}>
                        <Text style={styles.recommendedText}>
                          RECOMENDADO
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.planHeader}>
                      <View style={styles.planHeading}>
                        <Text style={styles.planName}>
                          {displayName}
                        </Text>
                        <Text style={styles.planDescription}>
                          {plan.description}
                        </Text>
                      </View>

                      {current ? (
                        <Badge
                          label="Seu plano"
                          tone="recorrente"
                        />
                      ) : null}
                    </View>

                    <View style={styles.priceBlock}>
                      <Text style={styles.price}>
                        {plan.code === 'free'
                          ? 'Grátis'
                          : offer?.price ??
                            currency(plan.price, { cents: true })}
                      </Text>

                      {plan.code !== 'free' ? (
                        <Text style={styles.pricePeriod}>
                          / mês
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.featureHeading}>
                      <Text style={styles.featureHeadingText}>
                        O que está incluído
                      </Text>
                    </View>

                    <View style={styles.features}>
                      {getFeatures(plan).map((feature, index) => (
                        <View
                          key={`${plan.code}-${index}`}
                          style={styles.featureRow}
                        >
                          <Text style={styles.check}>✓</Text>
                          <Text style={styles.featureText}>
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.planAction}>
                      {current ? (
                        <Button
                          label="Plano atual"
                          disabled
                        />
                      ) : plan.code === 'free' ? null : (
                        <Button
                          label={
                            paid
                              ? 'Gerenciar assinatura atual'
                              : offer
                                ? `Assinar ${displayName}`
                                : 'Compra indisponível nesta instalação'
                          }
                          disabled={busy || (!offer && !paid)}
                          onPress={() => {
                            if (paid) {
                              void Linking.openURL(
                                'https://play.google.com/store/account/subscriptions',
                              );
                            } else if (offer) {
                              void purchase(offer);
                            }
                          }}
                        />
                      )}
                    </View>
                  </Card>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.pagination}>
            {plans.map((plan, index) => (
              <View
                key={plan.id}
                style={[
                  styles.dot,
                  activeIndex === index && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <Text style={styles.swipeHint}>
            Deslize para o lado para conhecer os outros planos
          </Text>

          <Text style={styles.note}>
            Assinaturas mensais com renovação automática até o
            cancelamento. Confirme o valor e as condições na Google
            Play. Cancele em Assinaturas da Google Play; o acesso
            permanece até o fim do período pago. Excluir a conta
            Clyvo não cancela a assinatura na loja. A geração da Cly
            depende da disponibilidade do serviço.
          </Text>

          {identity && Platform.OS === 'android' ? (
            <Button
              label="Restaurar compras"
              variant="outline"
              loading={busy}
              onPress={() => void restore()}
            />
          ) : null}

          <Button
            label="Atualizar assinatura"
            variant="ghost"
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void api
                .post('/subscriptions/sync')
                .then(async () => {
                  await reload();
                  await load();
                })
                .catch((e) => setMessage(e.message))
                .finally(() => setBusy(false));
            }}
          />

          <Button
            label="Gerenciar na Google Play"
            variant="ghost"
            onPress={() => {
              void Linking.openURL(
                'https://play.google.com/store/account/subscriptions',
              );
            }}
          />

          <Button
            label="Termos de uso"
            variant="ghost"
            onPress={() => router.push('/termos')}
          />

          <Button
            label="Privacidade"
            variant="ghost"
            onPress={() => router.push('/privacidade')}
          />
        </>
      )}
    </Screen>
  );
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
  usageLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    paddingVertical: 3,
  },
  sectionHeading: {
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    gap: 4,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  carouselContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: GAP,
  },
  plan: {
    height: '100%',
    minHeight: 650,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderPrimary,
  },
  planRecommended: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  planCurrent: {
    backgroundColor: theme.colors.surfaceSoft,
  },
  recommendedLabel: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  recommendedText: {
    ...theme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  planHeading: {
    flex: 1,
    gap: 5,
  },
  planName: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  planDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    paddingVertical: theme.spacing.xs,
  },
  price: {
    ...theme.typography.h1,
    color: theme.colors.primary,
  },
  pricePeriod: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  featureHeading: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderPrimary,
    paddingTop: theme.spacing.md,
  },
  featureHeadingText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  features: {
    gap: theme.spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  check: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  featureText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  planAction: {
    marginTop: 'auto',
    paddingTop: theme.spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingVertical: theme.spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.borderPrimary,
  },
  dotActive: {
    width: 20,
    backgroundColor: theme.colors.primary,
  },
  swipeHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  note: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    paddingTop: theme.spacing.xl,
  },
}));
