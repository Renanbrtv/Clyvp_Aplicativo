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
  'Já tenho clientes': 'tenho_clientes',
  'Quero oferecer meus serviços': 'oferecer_servicos',
  'Quero conseguir uma renda extra': 'renda_extra',
  'Quero organizar meu negócio': 'organizar_negocio',
};
export default function Comecar() {
  const router = useRouter(),
    action = useAction();
  const [choice, setChoice] = useState('Quero encontrar clientes'),
    [accepted, setAccepted] = useState<string[]>([]);
  return (
    <MarketScreen title="Seu proximo passo" subtitle="Você não precisa ter empresa ou CNPJ para começar.">
      <Choices
        label="O que você quer fazer com o Clyvo?"
        options={Object.keys(choices)}
        value={choice}
        onChange={setChoice}
      />
      <Card>
        <Note>
          O marketplace conecta pessoas. Publicações e perfis profissionais públicos podem ser vistos por outros usuários. Propostas e conversas sao privadas. Não há promessa de renda nem intermediação de pagamentos pelo Clyvo.
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
              choice === 'Quero organizar meu negócio' || choice === 'Já tenho clientes'
                ? '/(tabs)'
                : '/mercado',
            );
          })
        }
      />
      <Note>
        Você pode explorar sem aceitar as regras. Para publicar, enviar propostas e conversar, será necessário aceitá-las.
      </Note>
    </MarketScreen>
  );
}
