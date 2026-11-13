import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, Card, Choices, MarketScreen, Note, Text, styles, useData } from '../../src/features/marketplace/ui';

const inviteLabels: Record<string, string> = {
  pendente: 'Aguardando resposta', respondido: 'Respondido', proposta: 'Proposta enviada',
  recusado: 'Recusado', cancelado: 'Cancelado', contratado: 'Contratado',
};

type Invite = { id: number; title: string; status: string; counterpart: string; direction: 'recebido' | 'enviado' };

export default function Convites() {
  const router = useRouter();
  const d = useData('/market/invites');
  const [tab, setTab] = useState('Recebidos');
  const items = (d.data?.invites as Invite[] | undefined)?.filter(i =>
    i.direction === (tab === 'Recebidos' ? 'recebido' : 'enviado')) ?? [];

  return <MarketScreen title="Convites de projeto" subtitle="Acompanhe os convites e propostas privadas."
    loading={d.loading} error={d.error} retry={d.load}>
    <Choices label="Convites" options={['Recebidos', 'Enviados']} value={tab} onChange={setTab} />
    {!items.length ? <Note>Nenhum convite nesta lista.</Note> : null}
    {items.map(i => <Card key={i.id}>
      <Text style={styles.title}>{i.title}</Text>
      <Note>{i.counterpart} · {inviteLabels[i.status] ?? i.status}</Note>
      <Button label="Ver convite" variant="outline"
        onPress={() => router.push({ pathname: '/mercado/convite', params: { id: String(i.id) } })} />
    </Card>)}
    <Button label="Encontrar profissionais" variant="ghost" onPress={() => router.push('/mercado/profissionais')} />
  </MarketScreen>;
}
