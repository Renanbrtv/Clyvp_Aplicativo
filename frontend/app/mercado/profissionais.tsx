import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Button,
  Card,
  Text,
  styles,
  MarketScreen,
  Note,
  Field,
  useData,
  currency,
  parse,
} from '../../src/features/marketplace/ui';
export default function Professionals() {
  const [search, S] = useState(''),
    [query, Q] = useState(''),
    [page, P] = useState(1),
    r = useRouter(),
    d = useData(`/market/profiles?search=${encodeURIComponent(query)}&page=${page}`);
  return (
    <MarketScreen title="Encontrar profissionais" loading={d.loading} error={d.error} retry={d.load}>
      <Field label="Nome, habilidade ou cidade" value={search} onChangeText={S} />
      <Button
        label="Buscar profissionais"
        onPress={() => {
          P(1);
          Q(search);
        }}
      />
      {d.data?.profiles.map((p: any) => (
        <Card key={p.user_id}>
          <Text style={styles.title}>{p.name}</Text>
          <Note>
            {p.city} / {p.region} · {p.mode}
          </Note>
          <Note>{parse(p.skills).join(' · ')}</Note>
          <Note>
            {p.rating ? Number(p.rating).toFixed(1) + ' estrelas' : 'Sem avaliacoes'}
            {p.price_from != null ? ' · A partir de ' + currency(p.price_from) : ''}
          </Note>
          <Button
            label="Ver perfil"
            variant="outline"
            onPress={() => r.push(`/mercado/perfil-profissional?id=${p.user_id}` as any)}
          />
        </Card>
      ))}
      {!d.data?.profiles.length ? <Note>Nenhum profissional encontrado nesta busca.</Note> : null}
      <Button label="Pagina anterior" disabled={page === 1} variant="ghost" onPress={() => P(page - 1)} />
      <Note>Pagina {page}</Note>
      <Button
        label="Proxima pagina"
        disabled={d.data?.profiles.length < 20}
        variant="ghost"
        onPress={() => P(page + 1)}
      />
    </MarketScreen>
  );
}
