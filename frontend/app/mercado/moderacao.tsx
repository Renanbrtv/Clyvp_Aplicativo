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
    [pending, setPending] = useState<any>(null),
    [note, N] = useState('');
  return (
    <MarketScreen
      title="Moderação"
      subtitle="Acesso restrito aos responsáveis autorizados."
      loading={d.loading}
      error={d.error}
      retry={d.load}
    >
      <Feedback action={a} />
      <Text style={styles.title}>Aguardando aprovação</Text>
      <Note>Confira o texto e todas as fotos antes de aprovar. Conteúdo sexual, armas, drogas, golpes e violência explícita não são permitidos.</Note>
      {pending ? <Card>
        <Text style={styles.title}>{pending.content?.title ?? pending.content?.name}</Text>
        {Object.entries(pending.content ?? {}).filter(([k]) => ['description','city','region','services','experience','bio','skills','availability','category','mode','budget_from','budget_to','due_date'].includes(k)).map(([k,v]) => <Note key={k}>{k}: {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</Note>)}
        {parse(pending.content?.photos, []).map((uri:string,i:number) => <Image key={i} source={{uri}} style={styles.image} accessibilityLabel={'Foto para análise '+(i+1)} />)}
        {pending.content?.photo ? <Image source={{uri:pending.content.photo}} style={styles.image} accessibilityLabel="Foto do perfil para análise" /> : null}
        <Field label="Mensagem para o autor (mínimo 5 caracteres)" value={note} onChangeText={N} maxLength={450} multiline />
        {(['approved','rejected'] as const).map(decision => <Confirm key={decision}
          label={decision === 'approved' ? 'Aprovar publicação' : 'Rejeitar publicação'}
          description={decision === 'approved' ? 'Confirmar que o texto e todas as fotos seguem as regras e liberar a publicação?' : 'Impedir a publicação e enviar este motivo ao autor?'}
          disabled={a.busy || note.trim().length < 5}
          onConfirm={() => void a.run(async () => {
            await api.post('/market/moderation/content/'+pending.type+'/'+pending.id, {revision:pending.review.revision,action:decision,note});
            setPending(null); N('');
          }, 'Decisão registrada.')}
        />)}
      </Card> : null}
      {!d.data?.queue?.length ? <Note>Nenhuma publicação aguardando análise.</Note> : null}
      {d.data?.queue?.map((v:any) => <Card key={v.target_type+v.target_id}>
        <Text style={styles.label}>{v.title}</Text>
        <Note>{v.target_type === 'post' ? 'Oportunidade' : 'Perfil profissional'} · revisão {v.revision}</Note>
        <Button label="Analisar publicação" variant="outline" disabled={a.busy} onPress={() => void a.run(async () => {
          setPending(await api.get('/market/moderation/content/'+v.target_type+'/'+v.target_id));D(null);N('');
        }, 'Conteúdo carregado para análise.')} />
      </Card>)}
      <Text style={styles.title}>Denúncias</Text>
      {detail ? (
        <Card>
          <Text style={styles.title}>Denúncia #{detail.report.id}</Text>
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
            <Note>Conteúdo indisponível ou perfil não publicado.</Note>
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
              <Field label="Motivo da decisão" value={note} onChangeText={N} multiline />
              <Confirm
                label={
                  detail.report.target_type === 'user'
                    ? 'Suspender publicação desta conta'
                    : 'Ocultar conteúdo'
                }
                description="Aplicar esta medida e registrar a decisão na denúncia?"
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
                label="Arquivar denúncia sem ocultar"
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
            label="Analisar denúncia"
            variant="outline"
            disabled={a.busy}
            onPress={() =>
              void a.run(async () => {
                D(await api.get(`/market/moderation/${v.id}`));
                setPending(null);
                N('');
              }, 'Conteúdo carregado.')
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
            description="Retirar a suspensão de publicação desta conta?"
            disabled={a.busy}
            onConfirm={() => void a.run(() => api.post(`/market/moderation/users/${v.user_id}/restore`, {}))}
          />
        </Card>
      ))}
    </MarketScreen>
  );
}
