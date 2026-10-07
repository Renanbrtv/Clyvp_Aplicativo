import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  api,
  Button,
  Card,
  Text,
  View,
  theme,
  styles,
  MarketScreen,
  Note,
  Field,
  Feedback,
  useData,
  useAction,
  currency,
  amount,
  prettyDay,
} from '../../src/features/marketplace/ui';
export default function Earnings() {
  const current = new Date().toISOString().slice(0, 7),
    [month, M] = useState(current),
    [selected, S] = useState(current),
    [goal, G] = useState(''),
    r = useRouter(),
    d = useData(`/market/earnings?month=${selected}`),
    a = useAction(d.load),
    e = d.data;
  const progress = e?.goal ? Math.min(100, (Number(e.metrics.month_total) / Number(e.goal)) * 100) : 0;
  const max = Math.max(1, ...(e?.chart ?? []).map((x: any) => Number(x.total)));
  return (
    <MarketScreen
      title="Meus ganhos"
      subtitle="Registros de vendas e recebimentos informados por voce."
      loading={d.loading}
      error={d.error}
      retry={d.load}
    >
      <Field label="Mes (AAAA-MM)" value={month} onChangeText={M} />
      <Button
        label="Consultar mes"
        disabled={!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)}
        onPress={() => S(month)}
      />
      {e ? (
        <>
          <Card>
            <Note>Ganhos do mes {selected}</Note>
            <Text style={styles.metric}>{currency(e.metrics.month_total)}</Text>
            <Note>Semana atual: {currency(e.metrics.week_total)}</Note>
            <Note>Total registrado: {currency(e.metrics.total)}</Note>
            <Note>Ticket medio no mes: {currency(e.metrics.average_ticket)}</Note>
            <Note>
              Servicos do marketplace concluidos no mes: {Number(e.services.completed_month ?? 0)} · Total:{' '}
              {e.services.completed}
            </Note>
            <Note>Clientes com mais de um recebimento: {e.recurringClients}</Note>
          </Card>
          <Note>
            Estes valores dependem dos seus registros; nao representam verificacao bancaria. Semanas comecam
            na segunda-feira e periodos usam UTC.
          </Note>
          <Card>
            <Text style={styles.title}>Meta de renda · {selected}</Text>
            {e.goal ? (
              <>
                <Note>
                  {currency(e.metrics.month_total)} de {currency(e.goal)} · {Math.round(progress)}%
                </Note>
                <View
                  accessibilityLabel={`${Math.round(progress)} por cento da meta`}
                  style={{
                    height: 14,
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: 7,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{ width: `${progress}%`, height: 14, backgroundColor: theme.colors.primary }}
                  />
                </View>
                <Note>
                  {Number(e.metrics.month_total) >= Number(e.goal)
                    ? 'Meta alcancada!'
                    : `Faltam ${currency(Number(e.goal) - Number(e.metrics.month_total))} para sua meta.`}
                </Note>
              </>
            ) : (
              <Note>Voce ainda nao definiu uma meta para este mes.</Note>
            )}
            {e.canSetGoal ? (
              <>
                <Field label="Definir meta (R$)" keyboardType="decimal-pad" value={goal} onChangeText={G} />
                <Button
                  label="Salvar meta"
                  loading={a.busy}
                  onPress={() =>
                    void a.run(() => api.post('/market/goals', { month: selected, amount: amount(goal) }))
                  }
                />
              </>
            ) : (
              <Button label="Conhecer planos com metas" variant="outline" onPress={() => r.push('/planos')} />
            )}
            <Feedback action={a} />
          </Card>
          <Text style={styles.title}>Recebimentos por dia</Text>
          {e.chart.map((x: any) => (
            <View key={x.day} style={{ gap: 6 }}>
              <Note>
                {prettyDay(x.day)} · {currency(x.total)}
              </Note>
              <View
                style={{
                  height: 12,
                  width: `${Math.max(1, (Number(x.total) / max) * 100)}%`,
                  borderRadius: 6,
                  backgroundColor: theme.colors.primary,
                }}
              />
            </View>
          ))}
          {!e.chart.length ? <Note>Sem recebimentos registrados neste mes.</Note> : null}
          <Text style={styles.title}>Historico do mes</Text>
          {e.history.map((x: any, i: number) => (
            <Card key={i}>
              <Text style={styles.label}>{x.title || 'Venda registrada'}</Text>
              <Note>
                {currency(x.amount)} · {prettyDay(x.received_at)}
              </Note>
            </Card>
          ))}
          <Note>Historico: ate 100 registros mais recentes. Totais incluem todos os registros.</Note>
        </>
      ) : null}
    </MarketScreen>
  );
}
