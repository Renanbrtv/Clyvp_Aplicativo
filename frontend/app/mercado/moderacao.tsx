import { useState } from 'react';
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
  Confirm,
  Feedback,
  useAction,
  useData,
  parse,
} from '../../src/features/marketplace/ui';
export default function Moderation() {
  const d = useData('/market/moderation'),
    a = useAction(d.load),
    [detail, D] = useState<any>(null),
    [note, N] = useState('');
  return (
    <MarketScreen
      title="Moderacao"
      subtitle="Acesso restrito aos responsaveis autorizados."
      loading={d.loading}
      error={d.error}
      retry={d.load}
    >
      <Feedback action={a} />
      {detail ? (
        <Card>
          <Text style={styles.title}>Denuncia #{detail.report.id}</Text>
          <Note>{detail.report.reason}</Note>
          {detail.content ? (
            Object.entries(detail.content)
              .filter(([k]) => !['photos', 'photo'].includes(k))
              .map(([k, v]) => (
                <Note key={k}>
                  {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
                </Note>
              ))
          ) : (
            <Note>Conteudo indisponivel ou perfil nao publicado.</Note>
          )}
          {parse(detail.content?.photos, []).map((uri: string, i: number) => (
            <Image key={i} source={{ uri }} style={styles.image} accessibilityLabel="Imagem denunciada" />
          ))}
          {detail.content?.photo ? (
            <Image
              source={{ uri: detail.content.photo }}
              style={styles.image}
              accessibilityLabel="Foto de perfil denunciada"
            />
          ) : null}
          {detail.report.status === 'aberta' ? (
            <>
              <Field label="Motivo da decisao" value={note} onChangeText={N} multiline />
              <Confirm
                label={
                  detail.report.target_type === 'user'
                    ? 'Suspender publicacao desta conta'
                    : 'Ocultar conteudo'
                }
                description="Aplicar esta medida e registrar a decisao na denuncia?"
                disabled={a.busy || note.trim().length < 5}
                onConfirm={() =>
                  void a.run(async () => {
                    await api.post(`/market/moderation/${detail.report.id}/resolve`, {
                      action: 'ocultar',
                      note,
                    });
                    D(null);
                    N('');
                  })
                }
              />
              <Button
                label="Arquivar denuncia sem ocultar"
                disabled={a.busy || note.trim().length < 5}
                variant="outline"
                onPress={() =>
                  void a.run(async () => {
                    await api.post(`/market/moderation/${detail.report.id}/resolve`, {
                      action: 'arquivar',
                      note,
                    });
                    D(null);
                    N('');
                  })
                }
              />
            </>
          ) : (
            <Note>{detail.report.resolution}</Note>
          )}
        </Card>
      ) : null}
      {d.data?.reports.map((v: any) => (
        <Card key={v.id}>
          <Note>
            #{v.id} · {v.target_type} #{v.target_id} · {v.status}
          </Note>
          <Note>{v.reason}</Note>
          <Button
            label="Analisar denuncia"
            variant="outline"
            disabled={a.busy}
            onPress={() =>
              void a.run(async () => {
                D(await api.get(`/market/moderation/${v.id}`));
                N('');
              }, 'Conteudo carregado.')
            }
          />
        </Card>
      ))}
      <Text style={styles.title}>Contas suspensas</Text>
      {d.data?.suspensions.map((v: any) => (
        <Card key={v.user_id}>
          <Note>
            {v.name} · {v.reason}
          </Note>
          <Confirm
            label="Restaurar acesso"
            description="Retirar a suspensao de publicacao desta conta?"
            disabled={a.busy}
            onConfirm={() => void a.run(() => api.post(`/market/moderation/users/${v.user_id}/restore`, {}))}
          />
        </Card>
      ))}
    </MarketScreen>
  );
}
