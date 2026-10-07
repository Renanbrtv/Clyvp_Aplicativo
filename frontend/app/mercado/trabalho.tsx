import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/features/auth/auth-context';
import {
  api,
  Button,
  Card,
  Text,
  styles,
  MarketScreen,
  Note,
  Field,
  Feedback,
  Confirm,
  Choices,
  useAction,
  currency,
  prettyDay,
  amount,
} from '../../src/features/marketplace/ui';
export default function Work() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    r = useRouter(),
    { user } = useAuth();
  const [data, D] = useState<any>(null),
    [error, E] = useState(''),
    [messages, MS] = useState<any[]>([]),
    [more, MO] = useState(false),
    [message, M] = useState(''),
    [price, P] = useState(''),
    [due, DU] = useState(''),
    [stars, S] = useState('5'),
    [comment, C] = useState('');
  const cursor = useRef(0),
    valid = useRef(true);
  const load = useCallback(
    async (reset = false) => {
      try {
        const result = await api.get<any>(`/market/works/${id}?after=${reset ? 0 : cursor.current}`);
        if (!valid.current) return;
        D(result);
        E('');
        if (reset) MS(result.messages);
        else
          MS((old) =>
            [...old, ...result.messages].filter((v, i, all) => all.findIndex((x) => x.id === v.id) === i),
          );
        if (result.messages.length) cursor.current = result.messages[result.messages.length - 1].id;
        MO(result.messages.length === 100);
      } catch (e) {
        if (valid.current) E(e instanceof Error ? e.message : 'Nao foi possivel carregar.');
      }
    },
    [id],
  );
  useFocusEffect(
    useCallback(() => {
      valid.current = true;
      cursor.current = 0;
      void load(true);
      const timer = setInterval(() => void load(false), 8000);
      return () => {
        valid.current = false;
        clearInterval(timer);
      };
    }, [load]),
  );
  const a = useAction(() => load(false)),
    w = data?.work,
    provider = w?.professional_id === user?.id,
    other = provider ? w?.customer_id : w?.professional_id;
  return (
    <MarketScreen
      title="Trabalho e conversa"
      loading={!data && !error}
      error={!data ? error : undefined}
      retry={() => void load(true)}
    >
      {w ? (
        <>
          <Card>
            <Text style={styles.title}>{w.title}</Text>
            <Text style={styles.price}>{currency(w.amount)}</Text>
            <Note>
              {prettyDay(w.due_date)} · {w.status}
            </Note>
            {data.people.map((p: any) => (
              <Note key={p.id}>
                {p.id === w.professional_id ? 'Profissional' : 'Cliente'}: {p.name}
              </Note>
            ))}
            <Note>
              O Clyvo nao cobra nem intermedeia o pagamento deste servico. Combine pagamento e detalhes com a
              outra pessoa.
            </Note>
          </Card>
          <Feedback action={a} />
          {error ? <Note error>{error}</Note> : null}
          {w.pending_terms ? (
            <Card>
              <Text style={styles.title}>Alteracao proposta</Text>
              <Note>
                {currency(w.pending_terms.amount)} para {prettyDay(w.pending_terms.dueDate)}
              </Note>
              {w.pending_terms.proposerId !== user?.id ? (
                <Confirm
                  label="Aceitar novos termos"
                  description="Confirmar este valor e esta data como o novo combinado?"
                  disabled={a.busy || data.blocked}
                  onConfirm={() => void a.run(() => api.post(`/market/works/${id}/terms/accept`, {}))}
                />
              ) : (
                <Note>Aguardando confirmacao da outra pessoa.</Note>
              )}
              <Button
                label="Descartar alteracao"
                variant="ghost"
                disabled={a.busy}
                onPress={() => void a.run(() => api.post(`/market/works/${id}/terms/discard`, {}))}
              />
            </Card>
          ) : null}
          <Text style={styles.title}>Conversa privada</Text>
          <Note>
            Visivel para as duas partes. Uma mensagem denunciada pode ser analisada pela moderacao.
            Atualizacao a cada 8 segundos enquanto esta tela esta aberta.
          </Note>
          {!messages.length ? <Note>Comece a conversa para combinar os detalhes.</Note> : null}
          {messages.map((m: any) => (
            <Card key={m.id}>
              <Text style={styles.label}>
                {m.sender_id === user?.id
                  ? 'Voce'
                  : (data.people.find((p: any) => p.id === m.sender_id)?.name ?? 'Participante')}
              </Text>
              <Note>{m.message}</Note>
              <Note>{new Date(m.created_at).toLocaleString('pt-BR')}</Note>
              {m.sender_id !== user?.id && !m.hidden ? (
                <Button
                  label="Denunciar mensagem"
                  variant="ghost"
                  onPress={() => r.push(`/mercado/denunciar?type=message&id=${m.id}` as any)}
                />
              ) : null}
            </Card>
          ))}
          {more ? (
            <Button label="Carregar mais mensagens" variant="outline" onPress={() => void load(false)} />
          ) : null}
          {data.blocked ? (
            <Note>Uma das contas bloqueou a outra. O envio de mensagens esta desativado.</Note>
          ) : w.status !== 'cancelado' ? (
            <>
              <Field label="Escrever mensagem" value={message} onChangeText={M} multiline maxLength={2000} />
              <Button
                label="Enviar mensagem"
                disabled={!message.trim()}
                loading={a.busy}
                onPress={() =>
                  void a.run(async () => {
                    await api.post(`/market/works/${id}/messages`, { message });
                    M('');
                  }, 'Mensagem enviada.')
                }
              />
            </>
          ) : null}
          {w.status === 'andamento' ? (
            <>
              <Card>
                <Text style={styles.title}>Data e valor combinado</Text>
                <Field label="Novo valor (R$)" keyboardType="decimal-pad" value={price} onChangeText={P} />
                <Field label="Nova data (AAAA-MM-DD)" value={due} onChangeText={DU} />
                <Button
                  label="Propor alteracao"
                  disabled={a.busy || data.blocked || Boolean(w.customer_done || w.professional_done)}
                  onPress={() =>
                    void a.run(
                      () => api.post(`/market/works/${id}/terms`, { amount: amount(price), dueDate: due }),
                      'Alteracao enviada para confirmacao.',
                    )
                  }
                />
              </Card>
              <Note>
                Conclusao confirmada pelo cliente: {w.customer_done ? 'Sim' : 'Ainda nao'} · pelo
                profissional: {w.professional_done ? 'Sim' : 'Ainda nao'}
              </Note>
              {!(provider ? w.professional_done : w.customer_done) ? (
                <Confirm
                  label="Confirmar trabalho concluido"
                  description="Voce confirma que o servico foi concluido? O trabalho sera finalizado quando as duas partes confirmarem."
                  disabled={a.busy}
                  onConfirm={() => void a.run(() => api.post(`/market/works/${id}/complete`, {}))}
                />
              ) : null}
              <Confirm
                label="Cancelar trabalho"
                description="Cancelar o trabalho e encerrar esta conversa? Isso nao processa estornos ou cancela pagamentos feitos fora do aplicativo."
                disabled={a.busy}
                onConfirm={() => void a.run(() => api.post(`/market/works/${id}/cancel`, {}))}
              />
            </>
          ) : null}
          {provider ? (
            <Card>
              <Text style={styles.title}>Organizar no meu Clyvo</Text>
              {w.provider_client_id ? (
                <Button
                  label="Abrir cliente salvo"
                  variant="outline"
                  onPress={() => r.push(`/cliente/${w.provider_client_id}` as any)}
                />
              ) : (
                <Button
                  label="Salvar contato como cliente"
                  disabled={a.busy}
                  onPress={() =>
                    void a.run(
                      () => api.post(`/market/works/${id}/import`, {}),
                      'Cliente e oportunidade salvos no seu funil.',
                    )
                  }
                />
              )}
              <Note>
                Salva nome e trabalho aceito no seu CRM, respeitando o limite do plano. Telefone e e-mail nao
                sao compartilhados automaticamente.
              </Note>
              {w.status === 'concluido' ? (
                w.received_at ? (
                  <Note>Recebimento registrado em {prettyDay(w.received_at)}.</Note>
                ) : (
                  <Confirm
                    label="Registrar valor recebido"
                    description={`Voce recebeu ${currency(w.amount)} por este trabalho? A confirmacao adiciona o valor ao historico de ganhos; nao realiza uma cobranca.`}
                    disabled={a.busy}
                    onConfirm={() => void a.run(() => api.post(`/market/works/${id}/received`, {}))}
                  />
                )
              ) : null}
            </Card>
          ) : null}
          {w.status === 'concluido' ? (
            <Card>
              <Text style={styles.title}>Avaliar experiencia</Text>
              {data.myReview ? (
                <Note>Voce avaliou este trabalho com {data.myReview.stars} estrelas.</Note>
              ) : (
                <>
                  <Choices label="Estrelas" options={['1', '2', '3', '4', '5']} value={stars} onChange={S} />
                  <Field
                    label="Como foi sua experiencia? (opcional)"
                    multiline
                    maxLength={1000}
                    value={comment}
                    onChangeText={C}
                  />
                  <Button
                    label="Publicar avaliacao"
                    loading={a.busy}
                    onPress={() =>
                      void a.run(() =>
                        api.post(`/market/works/${id}/reviews`, { stars: Number(stars), comment }),
                      )
                    }
                  />
                  <Note>A avaliacao e publica e vinculada a este trabalho.</Note>
                </>
              )}
            </Card>
          ) : null}
          <Button
            label="Denunciar participante"
            variant="ghost"
            onPress={() => r.push(`/mercado/denunciar?type=user&id=${other}` as any)}
          />
          <Confirm
            label="Bloquear participante"
            description="Impedir novas mensagens e propostas entre voces? Os registros deste trabalho continuam acessiveis."
            disabled={a.busy}
            onConfirm={() => void a.run(() => api.post('/market/blocks', { targetId: other, enabled: true }))}
          />
        </>
      ) : null}
    </MarketScreen>
  );
}
