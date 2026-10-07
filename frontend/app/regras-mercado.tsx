import { useRouter } from 'expo-router';
import { Screen, ScreenHeader } from '../src/shared/components';
import { Button, Card, Text, View, Note, styles } from '../src/features/marketplace/ui';
import { useThemeMode } from '../src/shared/theme';
export default function MarketRules() {
  useThemeMode();
  const r = useRouter();
  return (
    <Screen scroll>
      <ScreenHeader title="Regras do marketplace" subtitle="Versao mercado-2026-10-v1" />
      <View style={styles.body}>
        <Card>
          <Text style={styles.title}>Trabalho com respeito e informacoes verdadeiras</Text>
          <Note>
            Publique apenas servicos e pedidos licitos. Sao proibidos golpes, assedio, discriminacao, ameacas,
            conteudo sexual, exploracao, violencia e uso de dados de terceiros sem autorizacao. Nao prometa
            qualificacoes, licencas ou experiencia que voce nao possui.
          </Note>
          <Note>
            Antes de publicar, voce precisa aceitar estas regras. Conteudo denunciado pode ser ocultado e
            contas podem ter a publicacao suspensa apos analise da equipe.
          </Note>
        </Card>
        <Card>
          <Text style={styles.title}>Combine antes de contratar</Text>
          <Note>
            O Clyvo facilita o encontro entre pessoas. Nao verifica qualificacoes profissionais nem garante
            contratacoes, qualidade, renda ou pagamento. Confira as informacoes e os requisitos do servico
            antes de aceitar.
          </Note>
          <Note>
            A proposta aceita cria um trabalho. Mudancas de preco e prazo dependem da confirmacao da outra
            parte. A conclusao precisa ser confirmada pelas duas pessoas, permitindo uma avaliacao por
            participante.
          </Note>
          <Note>
            O pagamento dos servicos e combinado fora do Clyvo. O aplicativo nao cobra, recebe, custodia
            valores nem processa estornos desses trabalhos. A assinatura Pro e separada e usa a loja.
          </Note>
        </Card>
        <Card>
          <Text style={styles.title}>Dados e privacidade neste modulo</Text>
          <Note>
            Ao publicar, seu nome profissional, foto, habilidades, descricao, cidade, disponibilidade e faixa
            de preco ficam visiveis a outros usuarios autenticados. Avaliacoes e notas vinculadas a trabalhos
            concluidos sao publicas dentro do app.
          </Note>
          <Note>
            Oportunidades compartilham descricao, fotos, orcamento e localizacao aproximada. As coordenadas
            sao arredondadas para duas casas decimais; a distancia e uma estimativa em linha reta. Nao informe
            endereco exato, documentos ou dados bancarios em anuncios. Metadados de imagens PNG/JPEG sao
            removidos no servidor.
          </Note>
          <Note>
            Propostas sao visiveis ao autor e ao contratante. Conversas ficam restritas aos participantes;
            mensagens denunciadas podem ser examinadas pelos moderadores autorizados. Telefone e e-mail da
            conta nao sao exibidos no marketplace.
          </Note>
          <Note>
            Uma denuncia registra motivo, referencia do conteudo e identificacao da conta para analise. Uma
            copia do relato pode ser encaminhada ao suporte. Ao enviar suporte, voce escolhe o texto e
            eventual imagem; a equipe recebe identificacao de conta e dados basicos de versao para responder
            por e-mail.
          </Note>
          <Note>
            Os dados ficam no backend do Clyvo enquanto a conta e os registros existirem. A exclusao da conta
            remove os registros associados, inclusive conversas e trabalhos compartilhados. Um contato que a
            outra pessoa salvou no proprio CRM pode permanecer nessa conta. Mensagens ja enviadas por e-mail
            ficam na caixa do suporte, fora do banco do app; solicite sua exclusao pelo contato abaixo.
          </Note>
        </Card>
        <Card>
          <Text style={styles.title}>Denunciar, bloquear e pedir ajuda</Text>
          <Note>
            Use Denunciar nas oportunidades, perfis, avaliacoes ou mensagens. Bloquear impede novas propostas
            e mensagens entre as contas, preservando os registros de trabalhos para consulta e encerramento.
            Voce pode desfazer seus bloqueios no Perfil.
          </Note>
          <Note>
            Suporte e revisao de medidas: skybreakersstudio@gmail.com. Nao envie senhas, tokens, documentos ou
            dados bancarios. Nao ha promessa de prazo de resposta nesta versao.
          </Note>
        </Card>
        <Button label="Politica de privacidade" variant="outline" onPress={() => r.push('/privacidade')} />
        <Button label="Termos de uso" variant="ghost" onPress={() => r.push('/termos')} />
        <Button label="Ajuda e suporte" variant="ghost" onPress={() => r.push('/suporte')} />
      </View>
    </Screen>
  );
}
