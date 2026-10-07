import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  api,
  Button,
  MarketScreen,
  Note,
  Field,
  Feedback,
  useAction,
} from '../../src/features/marketplace/ui';
export default function Report() {
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>(),
    [reason, R] = useState(''),
    [reference, S] = useState<number | null>(null),
    a = useAction(),
    r = useRouter();
  return (
    <MarketScreen title="Denunciar conteudo ou usuario">
      <Note>
        A denuncia vai para a equipe de moderacao. Explique o problema sem incluir senhas, documentos ou dados
        bancarios.
      </Note>
      {reference ? (
        <Note>Denuncia #{reference} registrada para analise.</Note>
      ) : (
        <>
          <Field label="Motivo da denuncia" multiline maxLength={1500} value={reason} onChangeText={R} />
          <Button
            label="Enviar denuncia"
            loading={a.busy}
            disabled={reason.trim().length < 10}
            onPress={() =>
              void a.run(async () => {
                const result = await api.post<{ id: number }>('/market/reports', {
                  targetType: type,
                  targetId: Number(id),
                  reason,
                });
                S(result.id);
              }, 'Denuncia registrada.')
            }
          />
        </>
      )}
      <Feedback action={a} />
      <Button label="Ajuda e suporte" variant="outline" onPress={() => r.push('/suporte')} />
    </MarketScreen>
  );
}
