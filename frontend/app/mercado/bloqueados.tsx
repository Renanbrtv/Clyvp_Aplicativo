import {
  api,
  Button,
  Card,
  MarketScreen,
  Note,
  Feedback,
  useAction,
  useData,
} from '../../src/features/marketplace/ui';
export default function Blocked() {
  const d = useData('/market/blocks'),
    a = useAction(d.load);
  return (
    <MarketScreen title="Usuarios bloqueados" loading={d.loading} error={d.error} retry={d.load}>
      <Feedback action={a} />
      {!d.data?.blocks.length ? <Note>Voce nao bloqueou ninguem.</Note> : null}
      {d.data?.blocks.map((b: any) => (
        <Card key={b.target_id}>
          <Note>{b.name}</Note>
          <Button
            label="Desbloquear"
            disabled={a.busy}
            variant="outline"
            onPress={() =>
              void a.run(() => api.post('/market/blocks', { targetId: b.target_id, enabled: false }))
            }
          />
        </Card>
      ))}
    </MarketScreen>
  );
}
