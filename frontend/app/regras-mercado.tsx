import { useRouter } from 'expo-router';
import { Screen, ScreenHeader } from '../src/shared/components';
import { Button, Card, Text, View, Note, styles } from '../src/features/marketplace/ui';
import { useThemeMode } from '../src/shared/theme';
export default function MarketRules() {
  useThemeMode();
  const r = useRouter();
  return (
    <Screen scroll>
      <ScreenHeader title="Regras do marketplace" subtitle="Versão mercado-2026-10-v2" />
      <View style={styles.body}>
        <Card>
          <Text style={styles.title}>Trabalho com respeito e informações verdadeiras</Text>
          <Note>
            Publique apenas serviços e pedidos lícitos. São proibidos golpes, assédio, discriminação, ameaças,
            nudez, conteúdo sexual, venda de armas ou drogas, exploração, violência explícita e uso de dados de terceiros sem autorização. Não prometa
            qualificações, licenças ou experiência que você não possui.
          </Note>
          <Note>
            Antes de publicar, você precisa aceitar estas regras. Anúncios, perfis e fotos passam por análise manual antes de ficarem públicos. Alterações exigem nova aprovação, sem prazo garantido. Conteúdo denunciado pode ser ocultado e
            contas podem ter a publicação suspensa após análise da equipe.
          </Note>
        </Card>
        <Card>
          <Text style={styles.title}>Combine antes de contratar</Text>
          <Note>
            O Clyvo facilita o encontro entre pessoas. Não verifica qualificações profissionais nem garante
            contratações, qualidade, renda ou pagamento. Confira as informações e os requisitos do serviço
            antes de aceitar.
          </Note>
          <Note>
            A proposta aceita cria um trabalho. Mudanças de preço e prazo dependem da confirmação da outra
            parte. A conclusão precisa ser confirmada pelas duas pessoas, permitindo uma avaliação por
            participante.
          </Note>
          <Note>
            O pagamento dos serviços é combinado fora do Clyvo. O aplicativo não cobra, recebe, custodia
            valores nem processa estornos desses trabalhos. A assinatura Pro é separada e usa a loja.
          </Note>
        </Card>
        <Card>
          <Text style={styles.title}>Dados e privacidade neste módulo</Text>
          <Note>
            Ao publicar, seu nome profissional, foto, habilidades, descrição, cidade, disponibilidade e faixa
            de preço ficam visíveis a outros usuários autenticados. Avaliações e notas vinculadas a trabalhos
            concluídos são públicas dentro do app.
          </Note>
          <Note>
            Oportunidades compartilham descrição, fotos, orçamento e localização aproximada. As coordenadas
            são arredondadas para duas casas decimais; a distância é uma estimativa em linha reta. Não informe
            endereço exato, documentos ou dados bancários em anúncios. Metadados de imagens PNG/JPEG são
            removidos no servidor.
          </Note>
          <Note>
            Propostas são visíveis ao autor e ao contratante. Conversas ficam restritas aos participantes;
            mensagens denunciadas podem ser examinadas pelos moderadores autorizados. Telefone e e-mail da
            conta não são exibidos no marketplace.
          </Note>
          <Note>
            Uma denúncia registra motivo, referência do conteúdo e identificação da conta para análise. Uma
            cópia do relato pode ser encaminhada ao suporte. Ao enviar suporte, você escolhe o texto e
            eventual imagem; a equipe recebe identificação de conta e dados básicos de versão para responder
            por e-mail.
          </Note>
          <Note>
            Os dados ficam no backend do Clyvo enquanto a conta e os registros existirem. A exclusão da conta
            remove os registros associados, inclusive conversas e trabalhos compartilhados. Um contato que a
            outra pessoa salvou no próprio CRM pode permanecer nessa conta. Mensagens já enviadas por e-mail
            ficam na caixa do suporte, fora do banco do app; solicite sua exclusão pelo contato abaixo.
          </Note>
        </Card>
        <Card>
          <Text style={styles.title}>Denunciar, bloquear e pedir ajuda</Text>
          <Note>
            Use Denunciar nas oportunidades, perfis, avaliações ou mensagens. Bloquear impede novas propostas
            e mensagens entre as contas, preservando os registros de trabalhos para consulta e encerramento.
            Você pode desfazer seus bloqueios no Perfil.
          </Note>
          <Note>
            Suporte e revisão de medidas: skybreakersstudio@gmail.com. Não envie senhas, tokens, documentos ou
            dados bancários. Não há promessa de prazo de resposta nesta versão.
          </Note>
        </Card>
        <Button label="Política de privacidade" variant="outline" onPress={() => r.push('/privacidade')} />
        <Button label="Termos de uso" variant="ghost" onPress={() => r.push('/termos')} />
        <Button label="Ajuda e suporte" variant="ghost" onPress={() => r.push('/suporte')} />
      </View>
    </Screen>
  );
}
