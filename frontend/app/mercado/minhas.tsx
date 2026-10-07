import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Button,
  Card,
  Text,
  styles,
  MarketScreen,
  Note,
  Choices,
  useData,
  currency,
  prettyDay,
} from '../../src/features/marketplace/ui';
export default function Mine() {
  const me = useData('/market/me'),
    d = useData('/market/mine'),
    r = useRouter(),
    [tab, setTab] = useState('Trabalhos');
  const items =
    d.data?.[tab === 'Trabalhos' ? 'works' : tab === 'Minhas propostas' ? 'proposals' : 'posts'] ?? [];
  return (
    <MarketScreen
      title="Minha atividade"
      subtitle="Publicacoes, propostas e trabalhos combinados."
      loading={d.loading}
      error={d.error}
      retry={d.load}
    >
      {me.data ? (
        <Card>
          <Note>
            Uso neste mes: {me.data.usage.views} detalhes de oportunidades /{' '}
            {me.data.plan === 'free' ? 50 : 'sem limite'}; {me.data.usage.offers} propostas /{' '}
            {me.data.plan === 'free' ? 5 : me.data.plan === 'pro' ? 50 : 150}; {me.data.usage.posts}{' '}
            publicacoes / {me.data.plan === 'free' ? 5 : me.data.plan === 'pro' ? 30 : 60}.
          </Note>
          <Note>
            As cotas renovam no primeiro dia do mes, em UTC. Retirar uma proposta nao devolve a cota.
          </Note>
          <Button label="Ver planos e beneficios" variant="ghost" onPress={() => r.push('/planos')} />
        </Card>
      ) : null}
      <Choices
        label="Mostrar"
        options={['Trabalhos', 'Minhas propostas', 'Minhas publicacoes']}
        value={tab}
        onChange={setTab}
      />
      {!items.length ? <Note>Nenhuma atividade nesta area ainda.</Note> : null}
      {items.map((item: any) => (
        <Card key={item.id}>
          <Text style={styles.title}>{item.title}</Text>
          <Note>
            {item.status} · {prettyDay(item.due_date)}
          </Note>
          {item.amount ? <Note>{currency(item.amount)}</Note> : null}
          <Note>{item.message ?? ''}</Note>
          {tab !== 'Minhas propostas' || item.post_status === 'aberta' ? (
            <Button
              label={tab === 'Trabalhos' ? 'Abrir trabalho' : 'Ver oportunidade'}
              variant="outline"
              onPress={() =>
                r.push(
                  (tab === 'Trabalhos'
                    ? `/mercado/trabalho?id=${item.id}`
                    : `/mercado/oportunidade?id=${item.post_id ?? item.id}`) as any,
                )
              }
            />
          ) : (
            <Note>Publicacao encerrada. Consulte Trabalhos se sua proposta foi aceita.</Note>
          )}
        </Card>
      ))}
      <Note>Mostrando ate as 100 atividades mais recentes de cada area.</Note>
      <Button label="Encontrar oportunidades" onPress={() => r.push('/mercado')} />
      <Button label="Publicar oportunidade" variant="outline" onPress={() => r.push('/mercado/publicar')} />
    </MarketScreen>
  );
}
