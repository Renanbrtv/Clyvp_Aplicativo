import { useRouter } from 'expo-router';
import { Button, Card, Text, View, styles, Note, useData, currency } from './ui';
export function DashboardMarket() {
  const d = useData('/market/summary'),
    me = useData('/market/me'),
    r = useRouter();
  const established = ['tenho_clientes', 'organizar_negocio'].includes(d.data?.preferences?.intent);
  return (
    <Card style={{ marginVertical: 18 }}>
      <View style={{ gap: 12 }}>
        <Text style={styles.title}>
          {established ? 'Novos clientes e seus ganhos' : 'Transforme o que voce sabe fazer em dinheiro.'}
        </Text>
        <Note>
          {established
            ? 'Acompanhe seus clientes e encontre novas oportunidades.'
            : 'Pronto para transformar suas habilidades em dinheiro? Comece pelo seu perfil profissional.'}
        </Note>
        {d.data ? (
          <>
            <Text style={styles.metric}>{currency(d.data.earnings.metrics.month_total)}</Text>
            <Note>Registrados neste mes · {d.data.counts.completed} servicos concluidos</Note>
            <Note>
              {d.data.counts.available} oportunidades disponiveis · {d.data.counts.proposals} propostas
              pendentes · {d.data.counts.active} trabalhos em andamento
            </Note>
          </>
        ) : d.error ? (
          <>
            <Note>Nao foi possivel carregar o resumo de oportunidades.</Note>
            <Button label="Tentar novamente" variant="ghost" onPress={() => void d.load()} />
          </>
        ) : (
          <Note>Carregando oportunidades...</Note>
        )}
        <Button label="Encontrar oportunidades" onPress={() => r.push('/mercado')} />
        <Button
          label="Publicar meu servico"
          variant="outline"
          onPress={() => r.push('/mercado/perfil-profissional')}
        />
        <Button label="Meus ganhos e metas" variant="ghost" onPress={() => r.push('/mercado/ganhos')} />
        {!d.data?.preferences ? (
          <Button label="Escolher meu objetivo" variant="ghost" onPress={() => r.push('/mercado/comecar')} />
        ) : null}
        {me.data?.moderator ? (
          <Button label="Analisar denuncias" variant="outline" onPress={() => r.push('/mercado/moderacao')} />
        ) : null}
      </View>
    </Card>
  );
}
