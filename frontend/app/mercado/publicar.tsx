import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  api,
  MarketScreen,
  Field,
  Choices,
  Picture,
  Note,
  Button,
  Card,
  useAction,
  Feedback,
  CATEGORIES,
  coordinate,
  amount,
} from '../../src/features/marketplace/ui';
export default function Publicar() {
  const router = useRouter(),
    action = useAction();
  const [f, setF] = useState({
      title: '',
      category: 'Outros',
      description: '',
      city: '',
      region: '',
      latitude: '',
      longitude: '',
      mode: 'remoto',
      budgetFrom: '',
      budgetTo: '',
      dueDate: '',
    }),
    [photos, setPhotos] = useState<(string | null)[]>([null, null]);
  const set = (key: string, value: string) => setF((v) => ({ ...v, [key]: value }));
  return (
    <MarketScreen title="Publicar oportunidade" subtitle="Descreva um trabalho para receber propostas.">
      <Button
        label="Regras e objetivo do marketplace"
        variant="ghost"
        onPress={() => router.push('/mercado/comecar')}
      />
      <Field
        label="O que voce precisa?"
        value={f.title}
        onChangeText={(v) => set('title', v)}
        maxLength={120}
      />
      <Choices
        label="Categoria"
        options={CATEGORIES}
        value={f.category}
        onChange={(v) => set('category', v)}
      />
      <Field
        label="Descricao do servico"
        value={f.description}
        onChangeText={(v) => set('description', v)}
        multiline
        maxLength={3000}
      />
      <Choices
        label="Atendimento"
        options={['remoto', 'presencial']}
        value={f.mode}
        onChange={(v) => set('mode', v)}
      />
      <Field label="Cidade" value={f.city} onChangeText={(v) => set('city', v)} />
      <Field label="Bairro / regiao aproximada" value={f.region} onChangeText={(v) => set('region', v)} />
      <Note>
        Nao coloque endereco exato, telefone ou documentos na descricao. Combine detalhes na conversa privada
        depois de aceitar uma proposta.
      </Note>
      <Field
        label="Latitude aproximada (opcional)"
        value={f.latitude}
        onChangeText={(v) => set('latitude', v)}
      />
      <Field
        label="Longitude aproximada (opcional)"
        value={f.longitude}
        onChangeText={(v) => set('longitude', v)}
      />
      <Field
        label="Data desejada (AAAA-MM-DD, opcional)"
        value={f.dueDate}
        onChangeText={(v) => set('dueDate', v)}
        placeholder="2026-12-31"
      />
      <Field
        label="Orcamento inicial (R$, opcional)"
        value={f.budgetFrom}
        onChangeText={(v) => set('budgetFrom', v)}
        keyboardType="decimal-pad"
        placeholder="100,00"
      />
      <Field
        label="Orcamento maximo (R$, opcional)"
        value={f.budgetTo}
        onChangeText={(v) => set('budgetTo', v)}
        keyboardType="decimal-pad"
      />
      {photos.map((photo, i) => (
        <Card key={i}>
          <Picture
            value={photo}
            label={`Adicionar foto ${i + 1} (opcional)`}
            onChange={(v) => setPhotos((old) => old.map((x, n) => (n === i ? v : x)))}
          />
        </Card>
      ))}
      <Note>
        Seu nome profissional, anuncio e fotos ficarao visiveis no marketplace. Voce escolhe entre as
        propostas recebidas. Publicar nao garante interessados.
      </Note>
      <Feedback action={action} />
      <Button
        label="Publicar oportunidade"
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            const result = await api.post<{ id: number }>('/market/posts', {
              ...f,
              latitude: coordinate(f.latitude),
              longitude: coordinate(f.longitude),
              budgetFrom: amount(f.budgetFrom),
              budgetTo: amount(f.budgetTo),
              dueDate: f.dueDate || null,
              photos: photos.filter(Boolean),
            });
            router.replace(`/mercado/oportunidade?id=${result.id}`);
          })
        }
      />
    </MarketScreen>
  );
}
