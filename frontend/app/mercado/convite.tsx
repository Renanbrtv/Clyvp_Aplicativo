import { useState } from 'react';
import { Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DateField } from '../../src/features/marketplace/DateField';
import { api, amount, Button, Card, currency, Feedback, Field, MarketScreen, Note, prettyDay, styles, Text, useAction, useData } from '../../src/features/marketplace/ui';

const labels: Record<string, string> = {
  pendente: 'Aguardando resposta', respondido: 'Respondido', proposta: 'Proposta enviada',
  recusado: 'Recusado', cancelado: 'Cancelado', contratado: 'Contratado',
};

export default function Convite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const path = '/market/invites/' + encodeURIComponent(id ?? '');
  const d = useData(path);
  const action = useAction(d.load);
  const [form, setForm] = useState<'reply' | 'proposal' | null>(null);
  const [reply, setReply] = useState('');
  const [message, setMessage] = useState('');
  const [price, setPrice] = useState('');
  const [dueDate, setDueDate] = useState('');
  const i = d.data;
  const received = i?.direction === 'recebido';
  const canPropose = received && ['pendente', 'respondido'].includes(i?.status);
  const open = ['pendente', 'respondido', 'proposta'].includes(i?.status);
  const value = amount(price);
  function respond(next: 'reply' | 'decline' | 'cancel') {
    return action.run(() => api.post(path + '/respond', { action: next, ...(next === 'reply' ? { message: reply } : {}) }));
  }

  return <MarketScreen title="Convite de projeto" loading={d.loading} error={d.error} retry={d.load}>
    {i ? <>
      <Card>
        <Text style={styles.title}>{i.title}</Text>
        <Note>{labels[i.status] ?? i.status}</Note>
        <Note>{i.description}</Note>
      </Card>
      {i.reply ? <Card><Text style={styles.label}>Resposta do profissional</Text><Note>{i.reply}</Note></Card> : null}
      {i.proposalMessage ? <Card>
        <Text style={styles.title}>Proposta</Text>
        <Note>{currency(i.amount)} · Entrega até {prettyDay(i.dueDate)}</Note>
        <Note>{i.proposalMessage}</Note>
      </Card> : null}
      {canPropose ? <>
        {i.status === 'pendente' ? <Button label="Responder ao convite" variant="outline" onPress={() => setForm('reply')} /> : null}
        <Button label="Enviar proposta" onPress={() => setForm('proposal')} />
        {form === 'reply' && i.status === 'pendente' ? <Card>
          <Field label="Sua resposta" multiline maxLength={1000} value={reply} onChangeText={setReply} />
          <Button label="Enviar resposta" loading={action.busy} disabled={!reply.trim()} onPress={() => void respond('reply')} />
        </Card> : null}
        {form === 'proposal' ? <Card>
          <Field label="Valor (R$)" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
          <DateField label="Prazo de entrega" value={dueDate} onChange={setDueDate} optional={false} />
          <Field label="O que a proposta inclui?" multiline maxLength={2000} value={message} onChangeText={setMessage} />
          <Button label="Confirmar envio" loading={action.busy}
            disabled={value === null || !Number.isFinite(value) || value <= 0 || !dueDate || message.trim().length < 10}
            onPress={() => void action.run(() => api.post(path + '/proposal', { amount: value, dueDate, message }), 'Proposta enviada.')} />
        </Card> : null}
      </> : null}
      {!received && i.status === 'proposta' ? <Button label="Aceitar proposta" loading={action.busy}
        onPress={() => void action.run(() => api.post(path + '/accept'), 'Proposta aceita. Seu trabalho foi criado.')} /> : null}
      {open ? <Button label={received ? 'Recusar convite' : 'Cancelar convite'} variant="outline" disabled={action.busy}
        onPress={() => void respond(received ? 'decline' : 'cancel')} /> : null}
      {i.workId ? <Button label="Abrir trabalho" onPress={() => router.push({ pathname: '/mercado/trabalho', params: { id: String(i.workId) } })} /> : null}
      {i.shareAllowed ? <Card>
        <Text style={styles.label}>Conversar no WhatsApp</Text>
        <Note>Seu número só será disponibilizado neste convite se os dois autorizarem.</Note>
        <Button label={i.sharing ? 'Parar de compartilhar meu WhatsApp' : 'Autorizar meu WhatsApp neste projeto'}
          variant="outline" loading={action.busy}
          onPress={() => void action.run(() => api.post(path + '/whatsapp', { enabled: !i.sharing }))} />
        {i.whatsappLink ? <Button label="Continuar no WhatsApp"
          onPress={() => void action.run(() => Linking.openURL(i.whatsappLink), 'WhatsApp aberto.')} />
          : i.sharing ? <Note>Aguardando a autorização da outra pessoa.</Note> : null}
      </Card> : null}
      <Button label="Denunciar usuário" variant="ghost" onPress={() => router.push('/mercado/denunciar?type=user&id=' + i.counterpartId)} />
      <Feedback action={action} />
    </> : null}
    <Button label="Ver todos os convites" variant="ghost" onPress={() => router.replace('/mercado/convites')} />
  </MarketScreen>;
}
