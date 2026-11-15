/**
 * Teste ponta a ponta da Etapa 1.
 *
 *   Terminal 1:  npm run dev
 *   Terminal 2:  npm run test:api
 *
 * Exercita o fluxo completo de autenticacao contra a API real
 * (que grava no MySQL de verdade) e verifica, entre outras coisas,
 * o isolamento de dados entre usuarios.
 *
 * Nao precisa de biblioteca de teste: usa o fetch nativo do Node 18+.
 */
import { env } from '../config/env';

const BASE_URL = env.SMOKE_TEST_BASE_URL.replace(/\/$/, '');
const API = `${BASE_URL}${env.API_PREFIX}`;

let passed = 0;
let failed = 0;

interface ApiResponse<T = any> {
  status: number;
  body: T;
}

async function request<T = any>(
  method: string,
  path: string,
  options: { body?: unknown; token?: string } = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { status: response.status, body };
}

function check(description: string, condition: boolean, extra?: unknown): void {
  if (condition) {
    passed += 1;
    console.log(`  \x1b[32mOK\x1b[0m   ${description}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFALHA\x1b[0m ${description}`);
    if (extra !== undefined) {
      console.log('        resposta:', JSON.stringify(extra));
    }
  }
}

function section(title: string): void {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

async function main(): Promise<void> {
  console.log('\n===========================================');
  console.log(' Clyvo - smoke test da Etapa 1');
  console.log(` API: ${API}`);
  console.log('===========================================');

  const unique = Date.now();
  const testEmail = `teste.${unique}@clyvo.app`;
  const testPassword = 'Clyvo@2025';
  const newPassword = 'NovaSenha@2026';

  /* ------------------------------------------------ */
  section('1. Health check');
  const health = await request('GET', '/health');
  check('GET /health responde 200', health.status === 200, health.body);
  check('Banco de dados acessivel', health.body?.data?.database === 'ok', health.body?.data);

  if (health.body?.data?.database !== 'ok') {
    console.log('\nBanco indisponivel. Ligue o WAMP e rode "npm run db:migrate" antes dos testes.\n');
    process.exit(1);
  }

  /* ------------------------------------------------ */
  section('2. Cadastro');
  const register = await request('POST', '/auth/register', {
    body: {
      name: 'Usuario de Teste',
      email: testEmail,
      password: testPassword,
      passwordConfirmation: testPassword,
      phone: '(11) 98888-7777',
      companyName: 'Empresa de Teste',
    },
  });
  check('POST /auth/register responde 201', register.status === 201, register.body);
  check('Retorna access token', typeof register.body?.data?.tokens?.accessToken === 'string');
  check('Retorna refresh token', typeof register.body?.data?.tokens?.refreshToken === 'string');
  check('Nao expoe o hash da senha', !JSON.stringify(register.body).includes('password_hash'));
  check(
    'Telefone salvo somente com digitos',
    register.body?.data?.user?.phone === '11988887777',
    register.body?.data?.user?.phone,
  );

  const accessToken: string = register.body?.data?.tokens?.accessToken;
  const userId: number = register.body?.data?.user?.id;

  section('3. Validacoes de cadastro');
  const duplicated = await request('POST', '/auth/register', {
    body: { name: 'Outro', email: testEmail, password: testPassword },
  });
  check('E-mail duplicado e recusado com 409', duplicated.status === 409, duplicated.body);

  const weakPassword = await request('POST', '/auth/register', {
    body: { name: 'Fraco', email: `fraco.${unique}@clyvo.app`, password: 'abcdefgh' },
  });
  check('Senha sem numero e recusada com 422', weakPassword.status === 422, weakPassword.body);

  const invalidEmail = await request('POST', '/auth/register', {
    body: { name: 'Invalido', email: 'nao-e-email', password: testPassword },
  });
  check('E-mail invalido e recusado com 422', invalidEmail.status === 422, invalidEmail.body);

  /* ------------------------------------------------ */
  section('4. Rotas protegidas');
  const noToken = await request('GET', '/auth/me');
  check('GET /auth/me sem token responde 401', noToken.status === 401, noToken.body);

  const badToken = await request('GET', '/auth/me', { token: 'token-invalido' });
  check('GET /auth/me com token invalido responde 401', badToken.status === 401, badToken.body);

  const me = await request('GET', '/auth/me', { token: accessToken });
  check('GET /auth/me com token valido responde 200', me.status === 200, me.body);
  check('Retorna o usuario correto', me.body?.data?.user?.email === testEmail);
  check('Empresa criada automaticamente', me.body?.data?.company !== null);
  check('Preferencias criadas automaticamente', me.body?.data?.settings !== null);
  check(
    'Assinatura Free criada automaticamente',
    me.body?.data?.subscription?.plan?.code === 'free',
    me.body?.data?.subscription,
  );

  /* ------------------------------------------------ */
  section('5. Login');
  const wrongPassword = await request('POST', '/auth/login', {
    body: { email: testEmail, password: 'senha-errada-123' },
  });
  check('Senha incorreta responde 401', wrongPassword.status === 401, wrongPassword.body);

  const unknownEmail = await request('POST', '/auth/login', {
    body: { email: `inexistente.${unique}@clyvo.app`, password: testPassword },
  });
  check('E-mail inexistente responde 401', unknownEmail.status === 401);
  check(
    'Mensagem nao revela se o e-mail existe',
    wrongPassword.body?.error?.message === unknownEmail.body?.error?.message,
  );

  const login = await request('POST', '/auth/login', {
    body: { email: testEmail, password: testPassword },
  });
  check('Login valido responde 200', login.status === 200, login.body);
  check('Login retorna novos tokens', typeof login.body?.data?.tokens?.accessToken === 'string');

  const loginAccessToken: string = login.body?.data?.tokens?.accessToken;
  const loginRefreshToken: string = login.body?.data?.tokens?.refreshToken;

  /* ------------------------------------------------ */
  section('6. Onboarding');
  const onboarding = await request('POST', '/auth/onboarding', {
    token: loginAccessToken,
    body: { sellsType: 'servicos_e_produtos', mainGoal: 'aumentar_vendas' },
  });
  check('POST /auth/onboarding responde 200', onboarding.status === 200, onboarding.body);
  check(
    'Onboarding marcado como concluido',
    onboarding.body?.data?.user?.onboardingCompleted === true,
  );

  const invalidOnboarding = await request('POST', '/auth/onboarding', {
    token: loginAccessToken,
    body: { sellsType: 'qualquer_coisa', mainGoal: 'aumentar_vendas' },
  });
  check('Valor invalido no onboarding responde 422', invalidOnboarding.status === 422);

  /* ------------------------------------------------ */
  section('7. Perfil, empresa e preferencias');
  const updateProfile = await request('PATCH', '/users/me', {
    token: loginAccessToken,
    body: { name: 'Usuario de Teste Atualizado' },
  });
  check('PATCH /users/me responde 200', updateProfile.status === 200, updateProfile.body);
  check(
    'Nome atualizado',
    updateProfile.body?.data?.user?.name === 'Usuario de Teste Atualizado',
  );

  const updateCompany = await request('PATCH', '/companies/me', {
    token: loginAccessToken,
    body: { tradeName: 'Clyvo Tech', document: '12.345.678/0001-90', state: 'sp' },
  });
  check('PATCH /companies/me responde 200', updateCompany.status === 200, updateCompany.body);
  check(
    'CNPJ salvo somente com digitos',
    updateCompany.body?.data?.company?.document === '12345678000190',
    updateCompany.body?.data?.company?.document,
  );
  check('Estado normalizado para maiusculo', updateCompany.body?.data?.company?.address?.state === 'SP');

  const updateSettings = await request('PATCH', '/users/me/settings', {
    token: loginAccessToken,
    body: { followUpDays: 5, theme: 'escuro' },
  });
  check('PATCH /users/me/settings responde 200', updateSettings.status === 200, updateSettings.body);
  check('Preferencia salva', updateSettings.body?.data?.settings?.followUpDays === 5);

  const unknownField = await request('PATCH', '/users/me', {
    token: loginAccessToken,
    body: { campoQueNaoExiste: 'x' },
  });
  check('Campo desconhecido e recusado com 422', unknownField.status === 422, unknownField.body);

  /* ------------------------------------------------ */
  section('8. Planos e assinatura');
  const plans = await request('GET', '/subscriptions/plans');
  check('GET /subscriptions/plans responde 200', plans.status === 200, plans.body);
  check('Os 3 planos estao cadastrados', plans.body?.data?.plans?.length === 3, plans.body?.data?.plans);

  const proPlan = (plans.body?.data?.plans ?? []).find((item: any) => item.code === 'pro');
  check('Pro custa R$ 14,99', proPlan?.price === 14.99, proPlan?.price);
  check('Sem oferta de fundador', proPlan?.founder?.price === null, proPlan?.founder);
  check('Preco Pro consistente', proPlan?.effectivePrice === 14.99, proPlan?.effectivePrice);
  check('Sem vagas artificiais', proPlan?.founder?.available === false, proPlan?.founder);

  const maxPlan = (plans.body?.data?.plans ?? []).find((item: any) => item.code === 'pro_max');
  check('Pro Plus custa R$ 30,99', maxPlan?.price === 30.99, maxPlan?.price);

  const subscription = await request('GET', '/subscriptions/me', { token: loginAccessToken });
  check('GET /subscriptions/me responde 200', subscription.status === 200, subscription.body);
  check(
    'Limite do plano Free e de 5 clientes',
    subscription.body?.data?.subscription?.plan?.limits?.maxClients === 5,
    subscription.body?.data?.subscription?.plan?.limits,
  );
  check(
    'Limite de 5 propostas por mes no Free',
    subscription.body?.data?.subscription?.plan?.limits?.maxQuotesPerMonth === 5,
  );
  check('Uso do plano vem junto', subscription.body?.data?.subscription?.usage?.clientes !== undefined);

  const upgrade = await request('POST', '/subscriptions/upgrade', {
    token: loginAccessToken,
    body: { planCode: 'pro' },
  });
  check('POST /subscriptions/upgrade responde 200', upgrade.status === 200, upgrade.body);
  check('Upgrade avisa que a cobranca nao esta ligada', upgrade.body?.data?.checkoutReady === false);
  check('Preco do upgrade correto', upgrade.body?.data?.priceToday === 14.99, upgrade.body?.data);

  /* ------------------------------------------------ */
  section('9. Refresh token e rotacao');
  const refreshed = await request('POST', '/auth/refresh', {
    body: { refreshToken: loginRefreshToken },
  });
  check('POST /auth/refresh responde 200', refreshed.status === 200, refreshed.body);
  check('Refresh devolve um novo access token', typeof refreshed.body?.data?.tokens?.accessToken === 'string');
  check(
    'Novo refresh token e diferente do anterior',
    refreshed.body?.data?.tokens?.refreshToken !== loginRefreshToken,
  );

  const reusedRefresh = await request('POST', '/auth/refresh', {
    body: { refreshToken: loginRefreshToken },
  });
  check('Refresh token antigo nao funciona novamente (401)', reusedRefresh.status === 401, reusedRefresh.body);

  const rotatedRefreshToken: string = refreshed.body?.data?.tokens?.refreshToken;
  const rotatedAccessToken: string = refreshed.body?.data?.tokens?.accessToken;

  /* ------------------------------------------------ */
  section('10. Isolamento entre usuarios');
  const otherEmail = `outro.${unique}@clyvo.app`;
  const otherUser = await request('POST', '/auth/register', {
    body: { name: 'Outro Usuario', email: otherEmail, password: testPassword },
  });
  check('Segunda conta criada', otherUser.status === 201, otherUser.body);

  const otherToken: string = otherUser.body?.data?.tokens?.accessToken;
  const otherMe = await request('GET', '/auth/me', { token: otherToken });
  check(
    'Cada token devolve apenas a propria conta',
    otherMe.body?.data?.user?.email === otherEmail && otherMe.body?.data?.user?.id !== userId,
    { esperado: otherEmail, recebido: otherMe.body?.data?.user?.email },
  );
  check(
    'Empresas sao diferentes entre as contas',
    otherMe.body?.data?.company?.id !== me.body?.data?.company?.id,
  );

  /* ------------------------------------------------ */
  section('11. Fluxo principal: cliente -> oportunidade -> proposta -> venda');

  const noAuthClients = await request('GET', '/clients');
  check('GET /clients sem token responde 401', noAuthClients.status === 401);

  const newClient = await request('POST', '/clients', {
    token: rotatedAccessToken,
    body: { name: 'Cliente de Teste', whatsapp: '(62) 99999-1234', city: 'Goiania', state: 'go' },
  });
  check('POST /clients cria o cliente', newClient.status === 201, newClient.body);
  check(
    'Telefone e UF normalizados',
    newClient.body?.data?.client?.whatsapp === '62999991234' &&
      newClient.body?.data?.client?.address?.state === 'GO',
    newClient.body?.data?.client,
  );

  const createdClientId: number = newClient.body?.data?.client?.id;

  const clientList = await request('GET', '/clients?search=Cliente de Teste', { token: rotatedAccessToken });
  check('Busca por nome encontra o cliente', clientList.body?.data?.clients?.length >= 1, clientList.body);

  const service = await request('POST', '/services', {
    token: rotatedAccessToken,
    body: { name: 'Instalacao de camera', price: 250, warrantyDays: 90 },
  });
  check('POST /services cria o servico', service.status === 201, service.body);
  const serviceId: number = service.body?.data?.service?.id;

  const opportunity = await request('POST', '/opportunities', {
    token: rotatedAccessToken,
    body: { clientId: createdClientId, title: 'Instalacao de 3 cameras', totalAmount: 750 },
  });
  check('POST /opportunities cria a oportunidade', opportunity.status === 201, opportunity.body);
  check(
    'Oportunidade nasce em "novo contato"',
    opportunity.body?.data?.opportunity?.status === 'novo_contato',
  );
  const opportunityId: number = opportunity.body?.data?.opportunity?.id;

  const quote = await request('POST', '/quotes', {
    token: rotatedAccessToken,
    body: {
      clientId: createdClientId,
      opportunityId,
      type: 'proposta',
      discountAmount: 50,
      deliveryTime: '2 dias',
      warranty: '90 dias',
      items: [
        { itemType: 'servico', serviceId, description: 'Instalacao de camera', quantity: 3, unitPrice: 250 },
      ],
    },
  });
  check('POST /quotes cria a proposta', quote.status === 201, quote.body);
  check('Subtotal calculado (3 x 250 = 750)', quote.body?.data?.quote?.subtotal === 750, quote.body?.data?.quote);
  check('Total com desconto (750 - 50 = 700)', quote.body?.data?.quote?.total === 700);
  check('Numero sequencial gerado', typeof quote.body?.data?.quote?.code === 'string');

  const quoteId: number = quote.body?.data?.quote?.id;

  const whatsapp = await request('GET', `/quotes/${quoteId}/whatsapp`, { token: rotatedAccessToken });
  check('Mensagem de WhatsApp montada', whatsapp.status === 200 && typeof whatsapp.body?.data?.message === 'string');
  check(
    'Mensagem cita o total da proposta',
    String(whatsapp.body?.data?.message ?? '').includes('700'),
    whatsapp.body?.data?.message,
  );
  check('Link wa.me gerado', String(whatsapp.body?.data?.link ?? '').startsWith('https://wa.me/55'));

  const sendQuote = await request('POST', `/quotes/${quoteId}/status`, {
    token: rotatedAccessToken,
    body: { status: 'enviado' },
  });
  check('Proposta marcada como enviada', sendQuote.status === 200, sendQuote.body);

  const afterSend = await request('GET', `/opportunities/${opportunityId}`, { token: rotatedAccessToken });
  check(
    'Oportunidade acompanhou para "proposta enviada"',
    afterSend.body?.data?.opportunity?.status === 'proposta_enviada',
    afterSend.body?.data?.opportunity?.status,
  );

  const agenda = await request('GET', '/follow-ups/agenda', { token: rotatedAccessToken });
  check('Follow-up criado junto com o envio', agenda.body?.data?.counts?.pendentes >= 1, agenda.body?.data?.counts);

  const acceptQuote = await request('POST', `/quotes/${quoteId}/status`, {
    token: rotatedAccessToken,
    body: { status: 'aceito' },
  });
  check('Proposta aceita', acceptQuote.status === 200, acceptQuote.body);

  const afterAccept = await request('GET', `/opportunities/${opportunityId}`, { token: rotatedAccessToken });
  check(
    'Oportunidade fechou automaticamente',
    afterAccept.body?.data?.opportunity?.status === 'fechado',
    afterAccept.body?.data?.opportunity?.status,
  );

  const sales = await request('GET', '/sales', { token: rotatedAccessToken });
  check('Venda registrada automaticamente', sales.body?.data?.sales?.length >= 1, sales.body?.data);
  check('Valor da venda igual ao da proposta', sales.body?.data?.sales?.[0]?.amount === 700);

  const clientAfter = await request('GET', `/clients/${createdClientId}`, { token: rotatedAccessToken });
  check(
    'Total comprado do cliente atualizado',
    clientAfter.body?.data?.client?.totalPurchased === 700,
    clientAfter.body?.data?.client?.totalPurchased,
  );

  const dashboardAfter = await request('GET', '/dashboard', { token: rotatedAccessToken });
  check('Dashboard soma a venda do mes', dashboardAfter.body?.data?.sales?.total >= 700, dashboardAfter.body?.data?.sales);

  const results = await request('GET', '/stats', { token: rotatedAccessToken });
  check('GET /stats responde 200', results.status === 200, results.body);
  check('Ticket medio calculado', results.body?.data?.sales?.averageTicket > 0, results.body?.data?.sales);
  check('Taxa de conversao calculada', typeof results.body?.data?.conversion?.rate === 'number');

  /* ------------------------------------------------ */
  section('11b. Limites do plano Free e isolamento');

  const usage = await request('GET', '/stats/uso-do-plano', { token: rotatedAccessToken });
  check('GET /stats/uso-do-plano responde 200', usage.status === 200, usage.body);
  check('Limite de 5 clientes no Free', usage.body?.data?.usage?.clientes?.limit === 5, usage.body?.data?.usage);
  check('Limite de 5 propostas no Free', usage.body?.data?.usage?.propostas?.limit === 5);

  // O limite que realmente segura o Free e o de propostas: ja criamos 1.
  for (let i = 0; i < 4; i += 1) {
    await request('POST', '/quotes', {
      token: rotatedAccessToken,
      body: {
        clientId: createdClientId,
        type: 'orcamento',
        items: [{ itemType: 'avulso', description: `Item ${i}`, quantity: 1, unitPrice: 100 }],
      },
    });
  }

  const overLimit = await request('POST', '/quotes', {
    token: rotatedAccessToken,
    body: {
      clientId: createdClientId,
      type: 'orcamento',
      items: [{ itemType: 'avulso', description: 'Passa do limite', quantity: 1, unitPrice: 100 }],
    },
  });
  check('Proposta acima do limite recusada com 402', overLimit.status === 402, overLimit.body);
  check('Codigo PLAN_LIMIT_REACHED', overLimit.body?.error?.code === 'PLAN_LIMIT_REACHED');
  check(
    'Mensagem informa o limite do plano',
    String(overLimit.body?.error?.message ?? '').includes('plano'),
    overLimit.body?.error?.message,
  );

  const otherUserClients = await request('GET', '/clients', { token: otherToken });
  check(
    'A outra conta nao enxerga os clientes desta',
    (otherUserClients.body?.data?.clients ?? []).every(
      (item: any) => item.name !== 'Cliente de Teste',
    ),
    otherUserClients.body?.data?.clients?.length,
  );

  const crossAccess = await request('GET', `/clients/${createdClientId}`, { token: otherToken });
  check('Acessar cliente de outra conta responde 404', crossAccess.status === 404, crossAccess.body);

  const crossQuote = await request('GET', `/quotes/${quoteId}`, { token: otherToken });
  check('Acessar proposta de outra conta responde 404', crossQuote.status === 404);

  const aiStatus = await request('GET', '/ai/status', { token: rotatedAccessToken });
  check('GET /ai/status responde 200', aiStatus.status === 200, aiStatus.body);
  check('Mensagem por template funciona sem IA', aiStatus.body?.data?.features?.criarMensagem === true);

  /* ------------------------------------------------ */
  section('12. Troca de senha');
  const wrongCurrent = await request('POST', '/auth/change-password', {
    token: rotatedAccessToken,
    body: { currentPassword: 'errada123', newPassword: newPassword },
  });
  check('Senha atual incorreta responde 401', wrongCurrent.status === 401, wrongCurrent.body);

  const changePassword = await request('POST', '/auth/change-password', {
    token: rotatedAccessToken,
    body: {
      currentPassword: testPassword,
      newPassword,
      newPasswordConfirmation: newPassword,
    },
  });
  check('POST /auth/change-password responde 200', changePassword.status === 200, changePassword.body);

  const oldPasswordLogin = await request('POST', '/auth/login', {
    body: { email: testEmail, password: testPassword },
  });
  check('Senha antiga deixa de funcionar (401)', oldPasswordLogin.status === 401);

  const newPasswordLogin = await request('POST', '/auth/login', {
    body: { email: testEmail, password: newPassword },
  });
  check('Login com a nova senha funciona', newPasswordLogin.status === 200, newPasswordLogin.body);

  const refreshAfterChange = await request('POST', '/auth/refresh', {
    body: { refreshToken: rotatedRefreshToken },
  });
  check(
    'Sessoes antigas foram revogadas apos trocar a senha',
    refreshAfterChange.status === 401,
    refreshAfterChange.body,
  );

  /* ------------------------------------------------ */
  section('13. Recuperacao de senha');
  const forgot = await request('POST', '/auth/forgot-password', { body: { email: testEmail } });
  check('POST /auth/forgot-password responde 200', forgot.status === 200, forgot.body);

  const forgotUnknown = await request('POST', '/auth/forgot-password', {
    body: { email: `naoexiste.${unique}@clyvo.app` },
  });
  check(
    'Resposta identica para e-mail inexistente',
    forgotUnknown.status === 200 && forgotUnknown.body?.message === forgot.body?.message,
  );

  const resetToken: string | undefined = forgot.body?.data?.devToken;
  if (resetToken) {
    const invalidReset = await request('POST', '/auth/reset-password', {
      body: { token: 'x'.repeat(40), newPassword: testPassword },
    });
    check('Token de recuperacao invalido responde 400', invalidReset.status === 400, invalidReset.body);

    const reset = await request('POST', '/auth/reset-password', {
      body: { token: resetToken, newPassword: testPassword, newPasswordConfirmation: testPassword },
    });
    check('POST /auth/reset-password responde 200', reset.status === 200, reset.body);

    const loginAfterReset = await request('POST', '/auth/login', {
      body: { email: testEmail, password: testPassword },
    });
    check('Login com a senha redefinida funciona', loginAfterReset.status === 200);

    const reusedResetToken = await request('POST', '/auth/reset-password', {
      body: { token: resetToken, newPassword: newPassword },
    });
    check('Token de recuperacao nao pode ser reutilizado', reusedResetToken.status === 400);
  } else {
    console.log('  (devToken nao retornado - NODE_ENV=production; etapa ignorada)');
  }

  /* ------------------------------------------------ */
  section('14. Logout');
  // A senha atual depende de a etapa de recuperacao ter rodado.
  let finalLogin = await request('POST', '/auth/login', {
    body: { email: testEmail, password: testPassword },
  });
  if (finalLogin.status !== 200) {
    finalLogin = await request('POST', '/auth/login', {
      body: { email: testEmail, password: newPassword },
    });
  }
  check('Login final realizado', finalLogin.status === 200, finalLogin.body);

  const finalAccess: string = finalLogin.body?.data?.tokens?.accessToken;
  const finalRefresh: string = finalLogin.body?.data?.tokens?.refreshToken;

  const logout = await request('POST', '/auth/logout', {
    token: finalAccess,
    body: { refreshToken: finalRefresh },
  });
  check('POST /auth/logout responde 200', logout.status === 200, logout.body);

  const refreshAfterLogout = await request('POST', '/auth/refresh', {
    body: { refreshToken: finalRefresh },
  });
  check('Refresh apos logout responde 401', refreshAfterLogout.status === 401, refreshAfterLogout.body);

  /* ------------------------------------------------ */
  section('15. Rota inexistente');
  const notFound = await request('GET', '/rota-que-nao-existe');
  check('Rota desconhecida responde 404', notFound.status === 404, notFound.body);

  /* ------------------------------------------------ */
  console.log('\n===========================================');
  console.log(` Testes aprovados: ${passed}`);
  console.log(` Testes falhos:    ${failed}`);
  console.log('===========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\nErro ao executar o smoke test:');
  console.error(error instanceof Error ? error.message : error);
  console.error('\nO servidor esta rodando? Execute "npm run dev" em outro terminal.\n');
  process.exit(1);
});
