/**
 * Politica de Privacidade e Termos de Uso do Clyvo.
 *
 * Fonte unica: as telas do app, as paginas do site e os arquivos em
 * /docs saem todos daqui. A Google Play exige um endereco publico da
 * politica de privacidade - depois de publicar a versao web, use
 *   https://SEU-DOMINIO/privacidade
 *
 * ANTES DE PUBLICAR: preencha o bloco COMPANY abaixo com os seus dados
 * reais. Nome, CNPJ (ou CPF, se voce ainda nao abriu MEI) e um e-mail
 * que voce realmente leia - a LGPD obriga a existir um canal de contato.
 */

export const COMPANY = {
  /** Razao social ou seu nome completo. */
  name: 'Clyvo',
  /** CNPJ do MEI, ou "CPF nao divulgado" se voce ainda for pessoa fisica. */
  document: 'Responsavel a configurar',
  /** Cidade e estado. */
  city: 'Brasil',
  /** E-mail de contato e do encarregado de dados (LGPD, art. 41). */
  email: 'contato@clyvo.com.br',
  /** Endereco do site, sem barra no fim. */
  site: 'https://clyvo.com.br',
  retention: 'RETENCAO_A_CONFIGURAR',
} as const;

export const LEGAL_UPDATED_AT = '5 de outubro de 2026';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  slug: 'privacidade' | 'termos';
  title: string;
  subtitle: string;
  sections: LegalSection[];
}

export const privacyPolicy: LegalDocument = {
  slug: 'privacidade',
  title: 'Politica de Privacidade',
  subtitle: `Ultima atualizacao: ${LEGAL_UPDATED_AT}`,
  sections: [
    {
      heading: 'Em resumo',
      paragraphs: [
        'O Clyvo trata os dados da sua conta e do seu negocio para organizar clientes, orcamentos, vendas e lembretes.',
        'Nao vendemos, alugamos nem trocamos dados com anunciantes. Sua base de clientes e sua.',
        'Cada conta enxerga apenas os proprios dados. Nenhum outro usuario do Clyvo tem acesso aos seus clientes, oportunidades ou propostas.',
      ],
    },
    {
      heading: '1. Quem e o responsavel pelos dados',
      paragraphs: [
        `${COMPANY.name} (${COMPANY.document}), ${COMPANY.city}, e a controladora dos dados tratados no aplicativo Clyvo.`,
        `Para qualquer assunto relacionado a privacidade, incluindo o exercicio dos seus direitos, escreva para ${COMPANY.email}. Esse mesmo endereco atende o papel de encarregado pelo tratamento de dados previsto no art. 41 da LGPD.`,
      ],
    },
    {
      heading: '2. Quais dados coletamos',
      paragraphs: ['Dividimos em dois grupos, porque eles tem donos diferentes.'],
      bullets: [
        'Dados da sua conta: nome, e-mail, senha (guardada apenas como hash, nunca em texto puro), telefone e o nome do seu negocio.',
        'Dados que voce cadastra: nome, telefone, e-mail e anotacoes dos seus clientes; produtos e servicos do seu catalogo; oportunidades, propostas e valores.',
        'Dados tecnicos de sessao: data, endereco IP e identificacao do cliente HTTP para seguranca. Tambem registramos consentimento e contadores de uso da Cly e um identificador aleatorio para verificar assinaturas.',
      ],
    },
    {
      heading: '3. Dados de terceiros que voce cadastra',
      paragraphs: [
        'Quando voce cadastra um cliente, voce esta tratando dados pessoais de outra pessoa. Nesse tratamento, voce e o controlador e o Clyvo e o operador (LGPD, art. 5o, VI e VII).',
        'Na pratica, isso significa que cabe a voce ter uma base legal para guardar esses contatos - normalmente a execucao de um contrato ou o legitimo interesse da sua atividade comercial - e informar ao cliente, quando ele perguntar, que voce mantem os dados dele em uma ferramenta de vendas.',
        'Nos cuidamos da parte tecnica: guardar com seguranca, isolar de outras contas e apagar quando voce mandar.',
      ],
    },
    {
      heading: '4. Para que usamos os dados',
      bullets: [
        'Fazer o aplicativo funcionar: autenticar seu acesso e mostrar suas informacoes.',
        'Gerar propostas em PDF e mensagens prontas de WhatsApp a partir do que voce cadastrou.',
        'Calcular os numeros do seu painel: vendas do mes, taxa de conversao, clientes parados.',
        'Controlar os limites do seu plano e processar a assinatura, quando houver.',
        'Responder ao seu suporte e investigar problemas tecnicos.',
      ],
    },
    {
      heading: '5. O que nao fazemos',
      bullets: [
        'Nao vendemos, alugamos nem cedemos sua base de clientes a ninguem.',
        'Nao usamos seus dados para anuncios, seus ou de terceiros.',
        'Nao lemos suas conversas de WhatsApp. O Clyvo apenas monta o texto e abre o aplicativo; a conversa acontece fora dele e nao passa pelos nossos servidores.',
        'Nao cruzamos os dados de uma conta com os de outra.',
      ],
    },
    {
      heading: '6. Com quem compartilhamos',
      paragraphs: [
        'Somente com fornecedores necessarios para o servico existir, e apenas no minimo indispensavel:',
      ],
      bullets: [
        'Provedor de hospedagem e banco de dados, que armazena as informacoes.',
        'Resend: recebe o e-mail da sua conta e o conteudo da mensagem de recuperacao de senha.',
        'OpenAI: quando voce autoriza e pede uma geracao da Cly, recebe o texto digitado e as instrucoes da assistente. Nao anexamos automaticamente sua base de clientes. Evite incluir senhas e dados sensiveis. O Clyvo nao salva um historico desses textos; o provedor pode reter dados tecnicos conforme suas politicas. Voce pode revogar a autorizacao na tela da Cly para impedir novos envios.',
        'RevenueCat e Google Play: verificam compras e assinaturas, usando um identificador aleatorio de conta, dados de transacao e informacoes tecnicas do SDK. Nao recebem sua lista de clientes. O Clyvo nao recebe o numero do seu cartao.',
        'Fornecedores podem processar dados em outros paises. Suas politicas e as configuracoes contratadas pelo responsavel se aplicam a esse processamento.',
        'Lembretes diarios sao agendados no proprio aparelho, mediante permissao. Esta versao nao envia notificacoes remotas nem cadastra um token de push no servidor.',
        'Autoridades publicas, quando houver ordem judicial ou obrigacao legal.',
      ],
    },
    {
      heading: '7. Por quanto tempo guardamos',
      bullets: [
        'Enquanto sua conta existir, os dados ficam disponiveis para voce.',
        'Ao confirmar a exclusao com sua senha, removemos a conta e os dados associados do banco ativo. Copias de seguranca, quando existentes, seguem a politica de retencao informada pelo responsavel.',
        'Registros de compra mantidos pela Google Play e RevenueCat seguem as obrigacoes e politicas desses fornecedores. Excluir a conta no Clyvo nao cancela a assinatura na Google Play. Para pedidos relativos a registros nesses fornecedores, entre em contato pelo canal acima.',
        `${COMPANY.retention}`,
      ],
    },
    {
      heading: '8. Seus direitos',
      paragraphs: [
        `A LGPD (art. 18) garante a voce os direitos abaixo. Para exercer qualquer um deles, escreva para ${COMPANY.email}; respondemos em ate 15 dias.`,
      ],
      bullets: [
        'Confirmar que tratamos seus dados e pedir acesso a eles.',
        'Corrigir dados incompletos ou desatualizados.',
        'Pedir a exclusao dos dados tratados com base no seu consentimento.',
        'Pedir a portabilidade: uma copia dos seus dados em formato aberto.',
        'Revogar o consentimento e saber com quem compartilhamos seus dados.',
      ],
    },
    {
      heading: '9. Seguranca',
      bullets: [
        'Senhas sao guardadas como hash bcrypt. Nem nos conseguimos ler a sua.',
        'O acesso usa tokens com validade curta, renovados automaticamente e revogados ao sair.',
        'Toda consulta ao banco e filtrada pela sua conta, de forma que uma conta nunca alcance os dados de outra.',
        'O trafego entre o aplicativo e o servidor e criptografado (HTTPS).',
        'Nenhum sistema e invulneravel. Se acontecer um incidente que possa trazer risco a voce, comunicaremos voce e a ANPD conforme o art. 48 da LGPD.',
      ],
    },
    {
      heading: '10. Criancas e adolescentes',
      paragraphs: [
        'O Clyvo e uma ferramenta de trabalho e nao se destina a menores de 18 anos. Nao coletamos intencionalmente dados de criancas ou adolescentes.',
      ],
    },
    {
      heading: '11. Mudancas nesta politica',
      paragraphs: [
        'Se mudarmos algo relevante, avisaremos dentro do aplicativo antes da mudanca valer. A data no topo sempre indica a versao vigente.',
      ],
    },
    {
      heading: '12. Contato',
      paragraphs: [`${COMPANY.name} - ${COMPANY.email} - ${COMPANY.site}`],
    },
  ],
};

export const termsOfUse: LegalDocument = {
  slug: 'termos',
  title: 'Termos de Uso',
  subtitle: `Ultima atualizacao: ${LEGAL_UPDATED_AT}`,
  sections: [
    {
      heading: '1. O que e o Clyvo',
      paragraphs: [
        'O Clyvo e um aplicativo para autonomos, vendedores, pequenos comerciantes e prestadores de servico organizarem clientes, oportunidades e propostas.',
        `Ao criar uma conta voce concorda com estes Termos e com a Politica de Privacidade. Se nao concordar, nao use o aplicativo.`,
      ],
    },
    {
      heading: '2. Sua conta',
      bullets: [
        'Voce precisa ter 18 anos ou mais e fornecer informacoes verdadeiras.',
        'A senha e pessoal. Voce responde pelo que acontecer na sua conta.',
        'Se desconfiar de acesso indevido, troque a senha e avise-nos imediatamente.',
        'Uma conta pertence a uma pessoa ou negocio. Compartilhar o mesmo login com varias pessoas e desaconselhado e pode atrapalhar os seus proprios numeros.',
      ],
    },
    {
      heading: '3. Planos e assinatura',
      bullets: [
        'Free: ate 5 clientes ativos, 5 orcamentos por mes e 10 itens no catalogo. Cly: 3 geracoes por rodada, com esperas sucessivas de 2, 4 e 8 horas, limitadas a 8 horas. Depois de 7 dias sem esgotar uma rodada, a progressao volta a 2 horas.',
        'Pro: preco de referencia R$ 14,99 por mes, ate 100 clientes, 100 orcamentos por mes, 100 itens no catalogo e 50 geracoes da Cly por mes.',
        'Pro Plus: preco de referencia R$ 30,99 por mes, ate 500 clientes, 300 orcamentos por mes, 500 itens no catalogo e 150 geracoes da Cly por mes.',
        'As cotas mensais da Cly e dos orcamentos seguem o mes civil em UTC, sem acumulo. Mudar de plano nao zera o uso do mes. Falhas do provedor nao consomem geracoes; tentativas durante a espera nao prolongam o bloqueio. As demais funcoes permanecem acessiveis.',
        'Compras ficam disponiveis apenas em instalacoes Android com a integracao da loja ativa. Confira o preco, a moeda e as condicoes na tela de confirmacao da Google Play antes de pagar. A assinatura renova automaticamente ate o cancelamento.',
        'Gerencie ou cancele em Assinaturas da Google Play. Cancelar a renovacao mantem o acesso ate o fim do periodo pago, salvo reembolso ou revogacao. Excluir a conta Clyvo nao cancela a renovacao na loja. Restaurar compras exige a conta correta na loja e no Clyvo.',
        'Ao exceder o limite ou voltar ao Free, registros existentes nao sao apagados: voce pode consultar, editar e exportar seus dados. Novos cadastros respeitam a capacidade do plano.',
        'A Cly usa um provedor externo de IA. Seus textos sao sugestoes e podem conter erros; revise antes de utilizar. Ela nao envia mensagens, modifica registros nem aceita propostas por conta propria.',
      ],
    },
    {
      heading: '4. Seus dados sao seus',
      paragraphs: [
        'Os clientes, produtos e propostas que voce cadastra pertencem a voce. Nao reivindicamos propriedade sobre eles e nao os usamos para outra finalidade alem de operar o servico.',
        'Voce pode exportar seus dados ou pedir a exclusao a qualquer momento.',
      ],
    },
    {
      heading: '5. Uso responsavel',
      paragraphs: ['Ao usar o Clyvo, voce se compromete a nao:'],
      bullets: [
        'Cadastrar dados de pessoas sem ter um motivo legitimo para isso.',
        'Enviar mensagens em massa, spam ou qualquer comunicacao que viole as regras do WhatsApp.',
        'Usar o aplicativo para atividade ilegal, fraude ou golpe.',
        'Tentar burlar limites de plano, acessar dados de outras contas ou sobrecarregar o servico.',
        'Copiar, revender ou redistribuir o Clyvo como se fosse seu.',
      ],
    },
    {
      heading: '6. Mensagens de WhatsApp',
      paragraphs: [
        'O Clyvo monta o texto e abre o WhatsApp para voce revisar e enviar. Nos nao enviamos nada sozinhos, nao lemos suas conversas e nao temos vinculo com a Meta.',
        'O cumprimento das regras do WhatsApp e a forma como voce aborda cada contato sao responsabilidade sua.',
      ],
    },
    {
      heading: '7. Disponibilidade',
      paragraphs: [
        'Trabalhamos para manter o servico no ar, mas ele pode ficar indisponivel por manutencao, falha de fornecedor ou causas fora do nosso controle.',
        'Nao garantimos disponibilidade ininterrupta e nao respondemos por lucros cessantes decorrentes de indisponibilidade. Avisaremos com antecedencia quando a manutencao for programada.',
      ],
    },
    {
      heading: '8. Limitacao de responsabilidade',
      paragraphs: [
        'O Clyvo e uma ferramenta de organizacao. As decisoes comerciais, os precos que voce pratica e o conteudo das propostas sao seus.',
        'Nossa responsabilidade, quando existir, fica limitada ao valor pago por voce nos 12 meses anteriores ao fato. Nada aqui afasta direitos que o Codigo de Defesa do Consumidor garante a voce.',
      ],
    },
    {
      heading: '9. Encerramento',
      bullets: [
        `Voce pode excluir sua conta no aplicativo ou na pagina publica ${COMPANY.site}/excluir-conta, confirmando seu e-mail e senha.`,
        'Podemos suspender ou encerrar contas que descumpram estes Termos, avisando com antecedencia sempre que possivel.',
        'Se descontinuarmos o Clyvo, avisaremos com pelo menos 60 dias e disponibilizaremos a exportacao dos seus dados.',
      ],
    },
    {
      heading: '10. Mudancas nos termos',
      paragraphs: [
        'Podemos atualizar estes Termos. Mudancas relevantes serao avisadas dentro do aplicativo com pelo menos 30 dias de antecedencia. Continuar usando o Clyvo depois disso significa aceitar a nova versao.',
      ],
    },
    {
      heading: '11. Lei aplicavel',
      paragraphs: [
        'Estes Termos seguem a lei brasileira. Fica eleito o foro do domicilio do usuario para resolver qualquer controversia.',
      ],
    },
    {
      heading: '12. Contato',
      paragraphs: [`${COMPANY.name} - ${COMPANY.email} - ${COMPANY.site}`],
    },
  ],
};

export const legalDocuments = { privacidade: privacyPolicy, termos: termsOfUse } as const;
