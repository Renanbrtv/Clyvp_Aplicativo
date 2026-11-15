/**
 * Política de Privacidade e Termos de Uso do Clyvo.
 *
 * Conteúdo utilizado pelas telas de documentos legais.
 *
 * Antes da publicação:
 * - Configurar o endereço público das páginas.
 * - Informar os prazos reais de retenção de logs e backups.
 * - Conferir se as práticas descritas correspondem à implementação.
 */

export const COMPANY = {
  /** Nome do responsável. */
  name: 'Renan Cardoso Messias',

  /** Não publicar o CPF neste arquivo. */
  document: 'CPF não divulgado',

  /** Cidade e estado. */
  city: 'Aparecida de Goiânia - GO',

  /** Contato para suporte e privacidade. */
  email: 'skybreakersstudio@gmail.com',

  /** Preencher com o endereço público real, sem barra no final. */
  site: '',

  /** Manter pendente até conferir os prazos efetivamente utilizados. */
  retention: 'Atualmente, não mantemos cópias de segurança do banco de dados configuradas pelo responsável. Os logs técnicos ficam disponíveis para consulta no Railway por 7 dias no plano atual. Esse período de consulta não representa uma garantia de exclusão definitiva pelo fornecedor.',
} as const;

export const LEGAL_UPDATED_AT = '10 de outubro de 2026';

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
  title: 'Política de Privacidade',
  subtitle: `Última atualização: ${LEGAL_UPDATED_AT}`,
  sections: [
    {
      heading: 'Em resumo',
      paragraphs: [
        'O Clyvo trata os dados da sua conta e do seu negócio para organizar clientes, orçamentos, vendas e lembretes.',
        'Não vendemos, alugamos nem trocamos dados com anunciantes. Sua base de clientes é sua.',
        'Os dados privados de clientes e da organização do seu negócio não são publicados no marketplace. Ao publicar um anúncio ou uma oportunidade no marketplace, as informações dessa publicação ficam visíveis a outros usuários, conforme as regras de publicação e moderação.',
      ],
    },
    {
      heading: '1. Quem é o responsável pelos dados',
      paragraphs: [
        `${COMPANY.name} (${COMPANY.document}), de ${COMPANY.city}, é o responsável pelo Clyvo e pelo tratamento dos dados da conta descrito nesta política.`,
        `Para assuntos relacionados à privacidade, incluindo solicitações sobre seus dados pessoais, escreva para ${COMPANY.email}.`,
      ],
    },
    {
      heading: '2. Quais dados coletamos',
      paragraphs: [
        'Tratamos dados da sua conta e informações que você cadastra ao utilizar o aplicativo.',
      ],
      bullets: [
        'Dados da sua conta: nome, e-mail, senha (guardada apenas como hash, nunca em texto puro), telefone e nome do seu negócio.',
        'Dados que você cadastra: nome, telefone, e-mail e anotações dos seus clientes; produtos e serviços do seu catálogo; oportunidades, propostas e valores.',
        'Dados do marketplace: informações e imagens que você inclui nas publicações, propostas enviadas e registros necessários para acompanhar publicações, visualizações e moderação.',
        'Dados técnicos de sessão: data, endereço IP e identificação do cliente HTTP para segurança. Também registramos consentimento e contadores de uso da Cly e um identificador aleatório para verificar assinaturas.',
      ],
    },
    {
      heading: '3. Dados de terceiros que você cadastra',
      paragraphs: [
        'Quando você cadastra informações de um cliente, está tratando dados pessoais de outra pessoa. Cabe a você ter uma finalidade legítima e uma base legal adequada para esse tratamento.',
        'Informe aos seus clientes como utiliza os dados deles e cadastre somente as informações necessárias para sua atividade.',
        'O Clyvo fornece os recursos técnicos para armazenar e organizar esses registros, controlar o acesso e atender às solicitações de exclusão conforme as funcionalidades disponíveis.',
      ],
    },
    {
      heading: '4. Para que usamos os dados',
      bullets: [
        'Fazer o aplicativo funcionar: autenticar seu acesso e mostrar suas informações.',
        'Gerar propostas em PDF e mensagens prontas de WhatsApp a partir do que você cadastrou.',
        'Calcular os números do seu painel: vendas do mês, taxa de conversão e clientes sem contato recente.',
        'Controlar os limites do seu plano e processar a assinatura, quando houver.',
        'Exibir publicações do marketplace, permitir o acompanhamento de propostas e realizar a moderação.',
        'Responder às suas solicitações de suporte e investigar problemas técnicos.',
      ],
    },
    {
      heading: '5. O que não fazemos',
      bullets: [
        'Não vendemos, alugamos nem cedemos sua base de clientes a anunciantes.',
        'Não usamos seus dados privados para publicidade.',
        'Não lemos suas conversas de WhatsApp. O Clyvo apenas monta o texto e abre o aplicativo; a conversa acontece fora dele e não passa pelos nossos servidores.',
        'Não disponibilizamos seus registros privados a outras contas. As informações que você escolhe publicar no marketplace seguem as regras de visibilidade dessa funcionalidade.',
      ],
    },
    {
      heading: '6. Com quem compartilhamos',
      paragraphs: [
        'Compartilhamos as informações necessárias com fornecedores utilizados para operar o serviço. No marketplace, as informações incluídas nas publicações também podem ser vistas por outros usuários.',
      ],
      bullets: [
        'Provedor de hospedagem e banco de dados: armazena as informações necessárias ao funcionamento do aplicativo.',
        'Resend: recebe o e-mail da sua conta e o conteúdo da mensagem de recuperação de senha.',
        'OpenAI: quando você autoriza e pede uma geração da Cly, recebe o texto digitado e as instruções da assistente. Não anexamos automaticamente sua base de clientes. Evite incluir senhas e dados sensíveis. O Clyvo não salva um histórico desses textos; o provedor pode reter dados conforme suas políticas e as configurações contratadas. Você pode revogar a autorização na tela da Cly para impedir novos envios.',
        'RevenueCat e Google Play: verificam compras e assinaturas usando um identificador aleatório de conta, dados de transação e informações técnicas do SDK. Não recebem sua lista de clientes. O Clyvo não recebe o número do seu cartão.',
        'Outros usuários do marketplace: podem visualizar as informações que você inclui em publicações disponibilizadas nessa área. Evite publicar dados pessoais que não deseja compartilhar.',
        'Fornecedores podem processar dados em outros países. Suas políticas e as configurações contratadas pelo responsável se aplicam a esse processamento.',
        'Lembretes diários são agendados no próprio aparelho, mediante permissão. Esta versão não envia notificações remotas nem cadastra um token de push no servidor.',
        'Autoridades públicas, quando houver ordem judicial ou obrigação legal.',
      ],
    },
    {
      heading: '7. Por quanto tempo guardamos',
      bullets: [
        'Enquanto sua conta existir, seus dados ficam disponíveis para você conforme as funcionalidades do aplicativo.',
        'Quando você solicita a exclusão da conta, removemos o registro da conta e os dados relacionados vinculados por regras de exclusão em cascata no banco de dados.',
        'Determinados registros de moderação, incluindo decisões e justificativas relacionadas a publicações, podem permanecer armazenados após a exclusão da conta para fins de segurança, auditoria e prevenção de abusos. Os dados de identificação do moderador são desvinculados quando sua conta é excluída.',
        'Os registros de compra mantidos pela Google Play e pelo RevenueCat seguem as políticas e obrigações desses fornecedores. Excluir sua conta no Clyvo não cancela automaticamente sua assinatura na Google Play.',
        `${COMPANY.retention}`,
      ],
    },
    {
      heading: '8. Seus direitos',
      paragraphs: [
        `Para solicitar informações ou exercer seus direitos sobre dados pessoais, escreva para ${COMPANY.email}. Atenderemos às solicitações conforme os prazos e as condições previstos na legislação aplicável.`,
      ],
      bullets: [
        'Confirmar que tratamos seus dados e pedir acesso a eles.',
        'Corrigir dados incompletos ou desatualizados.',
        'Pedir a exclusão dos dados tratados com base no seu consentimento, observadas as hipóteses de conservação aplicáveis.',
        'Pedir a portabilidade dos dados, conforme as regras aplicáveis.',
        'Revogar o consentimento e saber com quem compartilhamos seus dados.',
      ],
    },
    {
      heading: '9. Segurança',
      bullets: [
        'Senhas são guardadas como hash bcrypt. Não conseguimos ler sua senha original.',
        'O acesso usa tokens com validade curta, renovados automaticamente e revogados ao sair.',
        'O acesso aos registros privados deve respeitar a conta autenticada. Publicações do marketplace seguem regras próprias de visibilidade e autorização.',
        'O tráfego entre o aplicativo e o servidor utiliza criptografia HTTPS.',
        'Nenhum sistema é invulnerável. Incidentes de segurança serão tratados e comunicados conforme as obrigações aplicáveis.',
      ],
    },
    {
      heading: '10. Crianças e adolescentes',
      paragraphs: [
        'O Clyvo é uma ferramenta de trabalho e não se destina a menores de 18 anos. Não coletamos intencionalmente dados de crianças ou adolescentes.',
      ],
    },
    {
      heading: '11. Mudanças nesta política',
      paragraphs: [
        'Se mudarmos algo relevante, avisaremos dentro do aplicativo antes de a mudança entrar em vigor. A data no topo indica a versão vigente.',
      ],
    },
    {
      heading: '12. Contato',
      paragraphs: [
        `${COMPANY.name} — ${COMPANY.city} — ${COMPANY.email}`,
        ...(COMPANY.site ? [`Página pública: ${COMPANY.site}`] : []),
      ],
    },
  ],
};

export const termsOfUse: LegalDocument = {
  slug: 'termos',
  title: 'Termos de Uso',
  subtitle: `Última atualização: ${LEGAL_UPDATED_AT}`,
  sections: [
    {
      heading: '1. O que é o Clyvo',
      paragraphs: [
        'O Clyvo é um aplicativo para profissionais autônomos, vendedores, pequenos comerciantes e prestadores de serviços organizarem clientes, oportunidades e propostas.',
        'O marketplace permite publicar oportunidades e acompanhar interações relacionadas às publicações, conforme as funcionalidades disponíveis.',
        'Ao criar uma conta, você concorda com estes Termos e com a Política de Privacidade. Se não concordar, não utilize o aplicativo.',
      ],
    },
    {
      heading: '2. Sua conta',
      bullets: [
        'Você precisa ter 18 anos ou mais e fornecer informações verdadeiras.',
        'A senha é pessoal. Mantenha suas credenciais em segurança.',
        'Se desconfiar de acesso indevido, troque a senha e avise-nos imediatamente.',
        'Uma conta pertence a uma pessoa ou negócio. Compartilhar o mesmo login com várias pessoas é desaconselhado e pode prejudicar a segurança e a organização dos seus registros.',
      ],
    },
    {
      heading: '3. Planos e assinatura',
      bullets: [
        'Free: até 5 clientes ativos, 5 orçamentos por mês e 10 itens no catálogo. Cly: 3 gerações por rodada, com esperas sucessivas de 2, 4 e 8 horas, limitadas a 8 horas. Depois de 7 dias sem esgotar uma rodada, a progressão volta a 2 horas.',
        'Pro: preço de referência de R$ 14,99 por mês, até 100 clientes, 100 orçamentos por mês, 100 itens no catálogo e 50 gerações da Cly por mês.',
        'Pro Plus: preço de referência de R$ 30,99 por mês, até 500 clientes, 300 orçamentos por mês, 500 itens no catálogo e 150 gerações da Cly por mês.',
        'As cotas mensais da Cly e dos orçamentos seguem o mês civil em UTC, sem acúmulo. Mudar de plano não zera o uso do mês. Falhas do provedor não consomem gerações; tentativas durante a espera não prolongam o bloqueio. As demais funções permanecem acessíveis.',
        'Compras ficam disponíveis apenas em instalações Android com a integração da loja ativa. Confira o preço, a moeda e as condições na tela de confirmação da Google Play antes de pagar. A assinatura renova automaticamente até o cancelamento.',
        'Gerencie ou cancele sua assinatura na seção Assinaturas da Google Play. Cancelar a renovação mantém o acesso até o fim do período pago, salvo reembolso ou revogação. Excluir a conta Clyvo não cancela a renovação na loja. Restaurar compras exige a conta correta na loja e no Clyvo.',
        'Ao exceder o limite ou voltar ao Free, os registros existentes não são apagados: você pode consultar, editar e exportar seus dados. Novos cadastros respeitam a capacidade do plano.',
        'A Cly usa um provedor externo de IA. Seus textos são sugestões e podem conter erros; revise antes de utilizar. Ela não envia mensagens, modifica registros nem aceita propostas por conta própria.',
      ],
    },
    {
      heading: '4. Seus dados são seus',
      paragraphs: [
        'Os clientes, produtos e propostas que você cadastra pertencem a você. Não reivindicamos propriedade sobre eles e não os usamos para outra finalidade além de operar o serviço.',
        'Você pode solicitar a exportação dos seus dados ou a exclusão da sua conta a qualquer momento.',
        'Ao publicar conteúdo no marketplace, você autoriza sua exibição dentro dessa funcionalidade e sua análise para moderação. Isso não transfere a propriedade do conteúdo ao Clyvo.',
      ],
    },
    {
      heading: '5. Uso responsável',
      paragraphs: [
        'Ao usar o Clyvo, você se compromete a não:',
      ],
      bullets: [
        'Cadastrar dados de pessoas sem ter um motivo legítimo para isso.',
        'Enviar mensagens em massa, spam ou qualquer comunicação que viole as regras do WhatsApp.',
        'Usar o aplicativo para atividade ilegal, fraude ou golpe.',
        'Publicar conteúdo sexual explícito, nudez sexualizada ou exploração sexual.',
        'Anunciar armas, munições, explosivos, drogas ilícitas ou outros produtos e serviços proibidos pelas regras do marketplace.',
        'Publicar ameaças, incitação à violência, discriminação ou conteúdo que viole direitos de outras pessoas.',
        'Divulgar dados pessoais de terceiros sem autorização ou outra base adequada.',
        'Tentar burlar limites de plano, acessar dados privados de outras contas ou sobrecarregar o serviço.',
        'Copiar, revender ou redistribuir o Clyvo como se fosse seu.',
      ],
    },
    {
      heading: '6. Mensagens de WhatsApp',
      paragraphs: [
        'O Clyvo monta o texto e abre o WhatsApp para você revisar e enviar. Não enviamos mensagens automaticamente, não lemos suas conversas e não temos vínculo com a Meta.',
        'O cumprimento das regras do WhatsApp e a forma como você aborda cada contato são de sua responsabilidade.',
      ],
    },
    {
      heading: '7. Disponibilidade',
      paragraphs: [
        'Trabalhamos para manter o serviço disponível, mas podem ocorrer interrupções por manutenção, falha de fornecedor ou causas fora do nosso controle.',
        'Não garantimos disponibilidade ininterrupta. Quando possível, avisaremos com antecedência sobre manutenções programadas.',
      ],
    },
    {
      heading: '8. Limitação de responsabilidade',
      paragraphs: [
        'O Clyvo é uma ferramenta de organização. As decisões comerciais, os preços que você pratica e o conteúdo das suas propostas são de sua responsabilidade.',
        'Textos sugeridos pela Cly precisam de revisão. Confirme informações, valores e condições antes de utilizá-los.',
        'Nada nestes Termos exclui direitos ou afasta responsabilidades que não possam ser limitadas pela legislação aplicável.',
      ],
    },
    {
      heading: '9. Encerramento',
      bullets: [
        'Você pode excluir sua conta pelo aplicativo, confirmando sua identidade conforme as instruções apresentadas.',
        ...(COMPANY.site
          ? [
              `Você também pode acessar a página pública ${COMPANY.site}/excluir-conta para seguir as instruções de exclusão.`,
            ]
          : [
              `Para obter ajuda com a exclusão da conta, entre em contato pelo e-mail ${COMPANY.email}. Nunca envie sua senha por e-mail.`,
            ]),
        'Podemos suspender ou encerrar contas que descumpram estes Termos, avisando com antecedência sempre que possível.',
        'Se descontinuarmos o Clyvo, avisaremos com pelo menos 60 dias de antecedência e disponibilizaremos a exportação dos seus dados.',
        'Excluir sua conta no Clyvo não cancela automaticamente uma assinatura ativa na Google Play.',
      ],
    },
    {
      heading: '10. Mudanças nos termos',
      paragraphs: [
        'Podemos atualizar estes Termos. Mudanças relevantes serão avisadas dentro do aplicativo com pelo menos 30 dias de antecedência. A comunicação indicará quando a nova versão entrará em vigor e se alguma ação sua será necessária.',
      ],
    },
    {
      heading: '11. Lei aplicável',
      paragraphs: [
        'Estes Termos seguem a legislação brasileira, respeitados os direitos e as regras de competência aplicáveis ao usuário.',
      ],
    },
    {
      heading: '12. Contato',
      paragraphs: [
        `${COMPANY.name} — ${COMPANY.city} — ${COMPANY.email}`,
        ...(COMPANY.site ? [`Página pública: ${COMPANY.site}`] : []),
      ],
    },
  ],
};

export const legalDocuments = {
  privacidade: privacyPolicy,
  termos: termsOfUse,
} as const;
