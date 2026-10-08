import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/features/auth/auth-context';
import { categoryLabel } from '../../src/features/marketplace/ui';
import { DateField } from '../../src/features/marketplace/DateField';
import { moderationLabel } from '../../src/features/marketplace/PostCard';
import {
  api,
  Button,
  Card,
  Text,
  Image,
  styles,
  MarketScreen,
  Note,
  Field,
  Feedback,
  Confirm,
  useData,
  useAction,
  currency,
  prettyDay,
  amount,
} from '../../src/features/marketplace/ui';
export default function Opportunity() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    router = useRouter(),
    { user } = useAuth();
  const d = useData(`/market/posts/${id}`),
    a = useAction(d.load);
  const [price, setPrice] = useState(''),
    [due, setDue] = useState(''),
    [message, setMessage] = useState(''),
    [experience, setExperience] = useState('');
  const p = d.data?.post,
    mine = p?.owner_id === user?.id;
  return (
    <MarketScreen title="Oportunidade" loading={d.loading} error={d.error} retry={d.load}>
      {p ? (
        <>
          <Card>
            <Text style={styles.title}>{p.title}</Text>
            <Note>
              {categoryLabel(p.category)} · {p.status}
            </Note>
            <Note>
              {p.mode === 'remoto' ? 'Remoto' : `${p.city} / ${p.region}`} · {prettyDay(p.due_date)}
            </Note>
            <Text style={styles.price}>
              {p.budget_from == null && p.budget_to == null
                ? 'Valor a combinar'
                : `${currency(p.budget_from ?? p.budget_to)}${p.budget_to != null ? ' a ' + currency(p.budget_to) : ''}`}
            </Text>
            <Note>{p.description}</Note>
            <Note>Publicado por {p.owner_name}</Note>
            {p.photos.map((uri: string, i: number) => (
              <Image
                key={i}
                source={{ uri }}
                style={styles.image}
                accessibilityLabel={`Foto da oportunidade ${i + 1}`}
              />
            ))}
          </Card>
          {d.data.workId ? (
            <Button
              label="Abrir trabalho e conversa"
              onPress={() => router.push(`/mercado/trabalho?id=${d.data.workId}` as any)}
            />
          ) : null}
          <Feedback action={a} />
          {mine ? (
            <>
              <Card>
                <Text style={styles.title}>{p.hidden ? 'Removido pela moderação' : moderationLabel(p.moderation?.state)}</Text>
                {p.moderation?.state === 'pending' ? <Note>Sua publicação está em análise. Ela ainda não aparece para outras pessoas.</Note> : null}
                {p.moderation?.note ? <Note>Mensagem da equipe: {p.moderation.note}</Note> : null}
                <Note>{p.view_count ?? 0} pessoas visualizaram · {d.data.proposals.length} propostas recebidas</Note>
                {p.status === 'aberta' && !p.hidden ? <Button label="Editar publicação" variant="outline" onPress={() => router.push(('/mercado/publicar?id='+id) as any)} /> : null}
              </Card>
              <Text style={styles.title}>Propostas recebidas</Text>
              {!d.data.proposals.length ? (
                <Note>Ainda não há propostas. Elas aparecerão aqui quando profissionais responderem.</Note>
              ) : null}
              {d.data.proposals.map((o: any) => (
                <Card key={o.id}>
                  <Text style={styles.title}>{o.professional_name}</Text>
                  <Note>
                    {currency(o.amount)} · {prettyDay(o.due_date)} · {o.status}
                  </Note>
                  <Note>{o.message}</Note>
                  <Note>{o.experience}</Note>
                  <Button
                    label="Ver perfil profissional"
                    variant="ghost"
                    onPress={() => router.push(`/mercado/perfil-profissional?id=${o.professional_id}` as any)}
                  />
                  {p.status === 'aberta' && !p.hidden && p.moderation?.state === 'approved' && o.status === 'enviada' ? (
                    <Confirm
                      label="Escolher profissional"
                      description={`Aceitar proposta de ${currency(o.amount)} para ${prettyDay(o.due_date)}? Isso cria um trabalho e uma conversa privada. Não realiza pagamento.`}
                      disabled={a.busy}
                      onConfirm={() =>
                        void a.run(async () => {
                          const w = await api.post<{ id: number }>(`/market/proposals/${o.id}/accept`, {});
                          router.push(`/mercado/trabalho?id=${w.id}` as any);
                        })
                      }
                    />
                  ) : null}
                </Card>
              ))}
              {p.status === 'aberta' ? (
                <Confirm
                  label="Encerrar oportunidade"
                  description="Encerrar esta publicação e recusar as propostas ainda pendentes?"
                  disabled={a.busy}
                  onConfirm={() => void a.run(() => api.post(`/market/posts/${id}/cancel`, {}))}
                />
              ) : null}
            </>
          ) : (
            <>
              {d.data.proposals.length ? (
                d.data.proposals.map((o: any) => (
                  <Card key={o.id}>
                    <Text style={styles.title}>Sua proposta · {o.status}</Text>
                    <Note>
                      {currency(o.amount)} · {prettyDay(o.due_date)}
                    </Note>
                    <Note>{o.message}</Note>
                    {o.status === 'enviada' ? (
                      <Confirm
                        label="Retirar proposta"
                        description="Retirar sua proposta? A cota mensal usada não será devolvida."
                        disabled={a.busy}
                        onConfirm={() => void a.run(() => api.post(`/market/proposals/${o.id}/withdraw`, {}))}
                      />
                    ) : null}
                  </Card>
                ))
              ) : p.status === 'aberta' ? (
                <Card>
                  <Text style={styles.title}>Tenho interesse neste serviço</Text>
                  <Note>Publique seu perfil profissional e aceite as regras antes de propor.</Note>
                  <Field
                    label="Valor da proposta (R$)"
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                  />
                  <DateField
                    label="Prazo do serviço"
                    value={due}
                    onChange={setDue}
                    optional={false}
                  />
                  <Field
                    label="Mensagem da proposta"
                    multiline
                    maxLength={2000}
                    value={message}
                    onChangeText={setMessage}
                  />
                  <Field
                    label="Experiência relacionada"
                    multiline
                    maxLength={1200}
                    value={experience}
                    onChangeText={setExperience}
                  />
                  <Button
                    label="Enviar proposta"
                    loading={a.busy}
                    onPress={() =>
                      void a.run(
                        () =>
                          api.post(`/market/posts/${id}/proposals`, {
                            amount: amount(price),
                            dueDate: due,
                            message,
                            experience,
                          }),
                        'Proposta enviada. Acompanhe em Propostas enviadas.',
                      )
                    }
                  />
                  <Button
                    label="Preparar meu perfil"
                    variant="ghost"
                    onPress={() => router.push('/mercado/perfil-profissional')}
                  />
                </Card>
              ) : null}
              <Button
                label="Denunciar oportunidade"
                variant="ghost"
                onPress={() => router.push(`/mercado/denunciar?type=post&id=${id}` as any)}
              />
              <Confirm
                label="Bloquear este usuário"
                description="Ocultar oportunidades deste usuário e impedir novas interações entre vocês?"
                disabled={a.busy}
                onConfirm={() =>
                  void a.run(async () => {
                    await api.post('/market/blocks', { targetId: p.owner_id, enabled: true });
                    router.replace('/mercado');
                  })
                }
              />
            </>
          )}
          <Button
            label="Minhas publicações, propostas e trabalhos"
            variant="outline"
            onPress={() => router.push('/mercado/minhas')}
          />
        </>
      ) : null}
    </MarketScreen>
  );
}
