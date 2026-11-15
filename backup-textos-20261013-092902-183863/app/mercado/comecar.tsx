import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  api,
  MarketScreen,
  Choices,
  Note,
  Button,
  Card,
  useAction,
  Feedback,
} from '../../src/features/marketplace/ui';
const choices: Record<string, string> = {
  'Quero encontrar clientes': 'encontrar_clientes',
  'Ja tenho clientes': 'tenho_clientes',
  'Quero oferecer meus servicos': 'oferecer_servicos',
  'Quero conseguir uma renda extra': 'renda_extra',
  'Quero organizar meu negocio': 'organizar_negocio',
};
export default function Comecar() {
  const router = useRouter(),
    action = useAction();
  const [choice, setChoice] = useState('Quero encontrar clientes'),
    [accepted, setAccepted] = useState<string[]>([]);
  return (
    <MarketScreen title="Seu proximo passo" subtitle="Voce nao precisa ter empresa ou CNPJ para comecar.">
      <Choices
        label="O que voce quer fazer com o Clyvo?"
        options={Object.keys(choices)}
        value={choice}
        onChange={setChoice}
      />
      <Card>
        <Note>
          O marketplace conecta pessoas. Publicacoes e perfis profissionais visiveis podem ser vistos por
          outros usuarios. Propostas e conversas sao privadas. Nao ha promessa de renda nem pagamento
          intermediado pelo Clyvo.
        </Note>
        <Button
          label="Ler regras, privacidade e seguranca"
          variant="ghost"
          onPress={() => router.push('/regras-mercado')}
        />
        <Choices
          label="Antes de publicar"
          options={['Li e aceito as regras do marketplace']}
          multi
          value={accepted}
          onChange={setAccepted}
        />
      </Card>
      <Feedback action={action} />
      <Button
        label="Salvar minha escolha"
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            await api.post('/market/preferences', {
              intent: choices[choice],
              acceptRules: accepted.length > 0,
            });
            router.replace(
              choice === 'Quero organizar meu negocio' || choice === 'Ja tenho clientes'
                ? '/(tabs)'
                : '/mercado',
            );
          })
        }
      />
      <Note>
        Voce pode explorar sem aceitar as regras. Para publicar, enviar propostas e conversar sera necessario
        aceita-las.
      </Note>
    </MarketScreen>
  );
}
