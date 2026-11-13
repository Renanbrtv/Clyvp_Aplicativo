import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RulesConsent } from '../../src/features/marketplace/RulesConsent';
import { api, Button, Feedback, Field, MarketScreen, Note, useAction, useData } from '../../src/features/marketplace/ui';

export default function Convidar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const profile = useData('/market/profiles/' + encodeURIComponent(id ?? ''));
  const me = useData('/market/me');
  const action = useAction();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accepted, setAccepted] = useState(false);
  const needsRules = me.data?.preferences?.consent_version !== me.data?.rulesVersion;
  async function send() {
    const result = await api.post<{ id: number }>('/market/profiles/' + encodeURIComponent(id) + '/invites', {
      title, description, ...(accepted ? { acceptRules: true } : {}),
    });
    router.replace({ pathname: '/mercado/convite', params: { id: String(result.id) } });
  }
  return <MarketScreen title="Convidar para um projeto" loading={profile.loading || me.loading}
    error={profile.error || me.error} retry={() => { void profile.load(); void me.load(); }}>
    <Note>Para: {profile.data?.profile.name}</Note>
    <Note>Só vocês dois verão o convite. Explique o que precisa e o prazo desejado.</Note>
    <Field label="Título do projeto" placeholder="Ex.: Editar quatro vídeos para Reels" value={title} onChangeText={setTitle} maxLength={120} />
    <Field label="O que você precisa?" value={description} onChangeText={setDescription} multiline maxLength={2000} />
    {needsRules ? <RulesConsent value={accepted} onChange={setAccepted} privateInvite /> : null}
    <Feedback action={action} />
    <Button label="Enviar convite" loading={action.busy}
      disabled={title.trim().length < 5 || description.trim().length < 15 || (needsRules && !accepted)}
      onPress={() => void action.run(send)} />
  </MarketScreen>;
}
