import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  MarketScreen,
  MarketLinks,
  useData,
  Button,
  Card,
  Text,
  View,
  Note,
  Field,
  Choices,
  styles,
  currency,
  amount,
  prettyDay,
  CATEGORIES,
} from '../../src/features/marketplace/ui';
export default function Mercado() {
  const router = useRouter();
  const [filters, setFilters] = useState(false),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('Todas'),
    [mode, setMode] = useState('Todos'),
    [city, setCity] = useState(''),
    [distance, setDistance] = useState(''),
    [min, setMin] = useState(''),
    [max, setMax] = useState(''),
    [date, setDate] = useState(''),
    [sort, setSort] = useState('Mais recentes'),
    [page, setPage] = useState(1);
  const { data, loading, error, load } = useData(
    '/market/posts?' + query + (query ? '&' : '') + 'page=' + page,
  );
  function apply() {
    const p = new URLSearchParams();
    if (category !== 'Todas') p.set('category', category);
    if (mode !== 'Todos') p.set('mode', mode === 'Remoto' ? 'remoto' : 'presencial');
    if (city) p.set('city', city);
    if (distance) p.set('distance', distance);
    if (min) p.set('min', String(amount(min)));
    if (max) p.set('max', String(amount(max)));
    if (date) p.set('date', date);
    p.set('sort', sort === 'Mais proximas' ? 'proximas' : 'recentes');
    setQuery(p.toString());
    setPage(1);
    setFilters(false);
  }
  return (
    <MarketScreen title="Encontrar oportunidades" subtitle="Transforme o que voce sabe fazer em dinheiro.">
      <Button label="+ Publicar oportunidade" onPress={() => router.push('/mercado/publicar')} />
      <MarketLinks />
      <Button
        label={filters ? 'Fechar filtros' : 'Filtrar oportunidades'}
        variant="ghost"
        onPress={() => setFilters(!filters)}
      />
      {filters ? (
        <Card style={styles.card}>
          <Choices
            label="Categoria"
            options={['Todas', ...CATEGORIES]}
            value={category}
            onChange={setCategory}
          />
          <Choices
            label="Atendimento"
            options={['Todos', 'Presencial', 'Remoto']}
            value={mode}
            onChange={setMode}
          />
          <Field label="Cidade" value={city} onChangeText={setCity} />
          <Field
            label="Distancia maxima (km)"
            value={distance}
            onChangeText={setDistance}
            keyboardType="numeric"
          />
          <Note>Distancias usam o ponto aproximado do seu perfil. Sem esse ponto, filtre por cidade.</Note>
          <Field label="Orcamento minimo (R$)" value={min} onChangeText={setMin} keyboardType="decimal-pad" />
          <Field label="Orcamento maximo (R$)" value={max} onChangeText={setMax} keyboardType="decimal-pad" />
          <Field
            label="Prazo ate (AAAA-MM-DD)"
            value={date}
            onChangeText={setDate}
            placeholder="2026-12-31"
          />
          <Choices
            label="Ordenar"
            options={['Mais recentes', 'Mais proximas']}
            value={sort}
            onChange={setSort}
          />
          <Button label="Aplicar filtros" onPress={apply} />
          <Button
            label="Limpar filtros"
            variant="ghost"
            onPress={() => {
              setQuery('');
              setPage(1);
              setCategory('Todas');
              setMode('Todos');
              setCity('');
              setDistance('');
              setMin('');
              setMax('');
              setDate('');
              setSort('Mais recentes');
              setFilters(false);
            }}
          />
        </Card>
      ) : null}
      {loading ? (
        <Note>Carregando oportunidades...</Note>
      ) : error ? (
        <>
          <Note error>{error}</Note>
          <Button label="Tentar novamente" onPress={() => void load()} />
        </>
      ) : !data?.posts.length ? (
        <Card>
          <Text style={styles.title}>Ainda nao ha oportunidades aqui</Text>
          <Note>
            Experimente outra cidade ou categoria. Voce tambem pode publicar seu perfil para oferecer seus
            servicos.
          </Note>
          <Button label="Publicar meu servico" onPress={() => router.push('/mercado/perfil-profissional')} />
        </Card>
      ) : (
        data.posts.map((p: any) => (
          <Card key={p.id} style={styles.card}>
            <Note>{p.category}</Note>
            <Text style={styles.title}>{p.title}</Text>
            <Note>
              {p.mode === 'remoto' ? 'Remoto' : `${p.city} · ${p.region}`}
              {p.mode !== 'remoto' && p.distance_km != null ? ` · cerca de ${p.distance_km} km` : ''}
            </Note>
            <Text style={styles.price}>
              {p.budget_from != null && p.budget_to != null
                ? `${currency(p.budget_from)} a ${currency(p.budget_to)}`
                : p.budget_to != null
                  ? `Ate ${currency(p.budget_to)}`
                  : p.budget_from != null
                    ? `A partir de ${currency(p.budget_from)}`
                    : 'Valor a combinar'}
            </Text>
            <Note>Prazo: {prettyDay(p.due_date)}</Note>
            <Button
              label="Ver oportunidade"
              onPress={() => router.push(`/mercado/oportunidade?id=${p.id}`)}
            />
          </Card>
        ))
      )}
      <View style={styles.row}>
        {page > 1 ? (
          <Button label="Pagina anterior" variant="outline" onPress={() => setPage(page - 1)} />
        ) : null}
        {data?.posts.length === 20 ? (
          <Button label="Proxima pagina" variant="outline" onPress={() => setPage(page + 1)} />
        ) : null}
      </View>
      <Button
        label="Encontrar profissionais"
        variant="ghost"
        onPress={() => router.push('/mercado/profissionais')}
      />
      <Button label="Regras e seguranca" variant="ghost" onPress={() => router.push('/regras-mercado')} />
    </MarketScreen>
  );
}
