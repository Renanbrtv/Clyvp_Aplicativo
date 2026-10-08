import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/features/auth/auth-context';
import { categoryLabel } from '../../src/features/marketplace/ui';
import { RulesConsent } from '../../src/features/marketplace/RulesConsent';
import { moderationLabel } from '../../src/features/marketplace/PostCard';
import {
  api,
  MarketScreen,
  useData,
  useAction,
  Feedback,
  Field,
  Choices,
  Picture,
  Note,
  Text,
  Image,
  Button,
  Card,
  View,
  styles,
  CATEGORIES,
  moneyInput,
  amount,
  coordinate,
  parse,
  currency,
} from '../../src/features/marketplace/ui';
const blank = {
  name: '',
  photo: null as string | null,
  city: '',
  region: '',
  latitude: '',
  longitude: '',
  skills: [] as string[],
  services: '',
  experience: '',
  bio: '',
  priceFrom: '',
  priceTo: '',
  availability: '',
  radiusKm: '30',
  mode: 'ambos',
  published: false,
};
export default function PerfilProfissional() {
  const { id } = useLocalSearchParams<{ id?: string }>(),
    { user } = useAuth(),
    router = useRouter();
  const own = !id || Number(id) === user?.id;
  const { data, loading, error, load } = useData(own ? '/market/me' : `/market/profiles/${id}`);
  const action = useAction(load),
    [accepted, setAccepted] = useState(false),
    [form, setForm] = useState(blank),
    [custom, setCustom] = useState('');
  const set = (key: string, value: any) => setForm((v) => ({ ...v, [key]: value }));
  useEffect(() => {
    if (!own || !data) return;
    const p = data.profile;
    if (p)
      setForm({
        name: p.name,
        photo: p.photo,
        city: p.city,
        region: p.region,
        latitude: p.latitude == null ? '' : String(p.latitude),
        longitude: p.longitude == null ? '' : String(p.longitude),
        skills: parse(p.skills),
        services: p.services,
        experience: p.experience,
        bio: p.bio,
        priceFrom: moneyInput(p.price_from),
        priceTo: moneyInput(p.price_to),
        availability: p.availability,
        radiusKm: String(p.radius_km),
        mode: p.mode,
        published: Boolean(p.published),
      });
    else set('name', user?.name ?? '');
  }, [data, own]);
  async function save() {
    if (form.published && !accepted) throw new Error('Leia e aceite as regras abaixo antes de publicar.');
    await api.post('/market/profile', {
      ...form,
      acceptRules: accepted,
      latitude: coordinate(form.latitude),
      longitude: coordinate(form.longitude),
      priceFrom: amount(form.priceFrom),
      priceTo: amount(form.priceTo),
      radiusKm: Number(form.radiusKm),
    });
  }
  return (
    <MarketScreen
      title={own ? 'Meu Perfil Profissional' : 'Perfil profissional'}
      loading={loading}
      error={error}
      retry={() => void load()}
    >
      {own ? (
        <>
          {data?.stats ? (
            <Card>
              <Text style={styles.title}>Sua reputação</Text>
              <Note>
                {data.stats.rating
                  ? Number(data.stats.rating).toFixed(1) + ' de 5 estrelas'
                  : 'Ainda sem avaliações'}{' '}
                · {data.stats.reviews} avaliações · {data.stats.completed} serviços concluídos
              </Note>
            </Card>
          ) : null}
          <Note>Mostre o que você sabe fazer. Seu perfil e sua foto ficam visíveis após aprovação. Cada alteração passa por nova análise.</Note>
          {data?.profile?.published ? <Note>{moderationLabel(data.profile.moderation?.state)} {data.profile.moderation?.note ? '· '+data.profile.moderation.note : ''}</Note> : null}
          <Field
            label="Nome profissional"
            value={form.name}
            onChangeText={(v) => set('name', v)}
            maxLength={120}
          />
          <Picture value={form.photo} onChange={(v) => set('photo', v)} />
          <Field label="Cidade" value={form.city} onChangeText={(v) => set('city', v)} />
          <Field
            label="Região / bairro (sem endereço exato)"
            value={form.region}
            onChangeText={(v) => set('region', v)}
          />
          <Choices
            label="Habilidades"
            options={[...new Set([...CATEGORIES, ...form.skills])]}
            value={form.skills}
            multi
            onChange={(v) => set('skills', v)}
          />
          <Field label="Habilidade personalizada" value={custom} onChangeText={setCustom} maxLength={80} />
          <Button
            label="Adicionar habilidade"
            variant="outline"
            disabled={custom.trim().length < 2 || form.skills.length >= 20}
            onPress={() => {
              set('skills', [...new Set([...form.skills, custom.trim()])]);
              setCustom('');
            }}
          />
          <Field
            label="Serviços que ofereço"
            value={form.services}
            onChangeText={(v) => set('services', v)}
            multiline
            maxLength={1500}
          />
          <Field
            label="Minha experiência"
            value={form.experience}
            onChangeText={(v) => set('experience', v)}
            multiline
            maxLength={1500}
          />
          <Field
            label="Descrição profissional"
            value={form.bio}
            onChangeText={(v) => set('bio', v)}
            multiline
            maxLength={1500}
          />
          <Choices
            label="Atendimento"
            options={['presencial', 'remoto', 'ambos']}
            value={form.mode}
            onChange={(v) => set('mode', v)}
          />
          <Field
            label="Preço inicial (R$, opcional)"
            value={form.priceFrom}
            onChangeText={(v) => set('priceFrom', v)}
            keyboardType="decimal-pad"
            placeholder="100,00"
          />
          <Field
            label="Preço máximo (R$, opcional)"
            value={form.priceTo}
            onChangeText={(v) => set('priceTo', v)}
            keyboardType="decimal-pad"
          />
          <Field
            label="Disponibilidade"
            value={form.availability}
            onChangeText={(v) => set('availability', v)}
            placeholder="Dias de semana, depois das 18h"
          />
          <Field
            label="Distância máxima de atendimento (km)"
            value={form.radiusKm}
            onChangeText={(v) => set('radiusKm', v)}
            keyboardType="numeric"
          />
          <Choices
            label="Visibilidade"
            options={['Rascunho privado', 'Enviar para publicação']}
            value={form.published ? 'Enviar para publicação' : 'Rascunho privado'}
            onChange={(v) => set('published', v === 'Enviar para publicação')}
          />
          {form.published ? <RulesConsent value={accepted} onChange={setAccepted} /> : null}
          <Feedback action={action} />
          <Button
            label="Salvar perfil profissional"
            loading={action.busy}
            onPress={() => void action.run(save, form.published ? 'Perfil enviado para análise. Acompanhe o status nesta tela.' : 'Rascunho salvo.')}
          />
        </>
      ) : data ? (
        <>
          <Card style={styles.card}>
            {data.profile.photo ? (
              <Image
                source={{ uri: data.profile.photo }}
                style={{ width: 100, height: 100, borderRadius: 50 }}
              />
            ) : null}
            <Text style={styles.title}>{data.profile.name}</Text>
            <Note>
              {data.profile.city} · {data.profile.mode}
            </Note>
            <Note>
              {data.stats.rating ? `${Number(data.stats.rating).toFixed(1)} de 5 estrelas` : 'Ainda sem nota'}{' '}
              · {data.stats.reviews} avaliações · {data.stats.completed} serviços concluídos
            </Note>
            <Note>{data.profile.bio}</Note>
            <Note>Habilidades: {data.profile.skills.map(categoryLabel).join(', ')}</Note>
            <Note>Serviços: {data.profile.services}</Note>
            <Note>Experiência: {data.profile.experience || 'Não informada'}</Note>
            <Note>Disponibilidade: {data.profile.availability || 'A combinar'}</Note>
            <Note>Raio de atendimento: {data.profile.radius_km} km</Note>
            <Note>
              Preço inicial:{' '}
              {data.profile.price_from != null ? currency(data.profile.price_from) : 'A combinar'}
            </Note>
          </Card>
          <Button label="Publicar um pedido de serviço" onPress={() => router.push('/mercado/publicar')} />
          <Note>A conexão e a conversa são liberadas quando uma proposta é aceita.</Note>
          {data.reviews.map((r: any) => (
            <Card key={r.id} style={styles.card}>
              <Text style={styles.label}>
                {r.stars}/5 · {r.author_name}
              </Text>
              <Note>{r.comment || 'Sem comentário.'}</Note>
              <Button
                label="Denunciar avaliação"
                variant="ghost"
                onPress={() => router.push(`/mercado/denunciar?type=review&id=${r.id}`)}
              />
            </Card>
          ))}
          <Button
            label="Denunciar este perfil"
            variant="outline"
            onPress={() => router.push(`/mercado/denunciar?type=user&id=${id}`)}
          />
          <Button
            label="Bloquear este usuário"
            variant="ghost"
            onPress={() =>
              void action.run(async () => {
                await api.post('/market/blocks', { targetId: Number(id), enabled: true });
                router.replace('/mercado');
              }, 'Usuário bloqueado.')
            }
          />
          <Feedback action={action} />
        </>
      ) : null}
    </MarketScreen>
  );
}
