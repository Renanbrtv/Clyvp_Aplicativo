/** Isolated server with a simulated mail provider. Never sends real email. */
import assert from 'node:assert/strict';
import { createApp } from '../app';
import { env } from '../config/env';
import { closePool } from '../config/database';
import { supportService, supportSchema, type SupportInput } from '../services/support.service';
const originalFetch = globalThis.fetch;
async function main() {
  if (env.isProduction || !/test/i.test(env.DB_NAME)) throw new Error('Use banco separado de teste.');
  Object.assign(env, {
    EMAIL_API_KEY: 'synthetic-support-key',
    EMAIL_FROM: 'test@example.com',
    REVENUECAT_SECRET_KEY: '',
  });
  const messages: any[] = [];
  let providerFailure = false,
    checks = 0;
  globalThis.fetch = (async (url: any, options: any) => {
    if (String(url) === 'https://api.resend.com/emails') {
      messages.push({ body: JSON.parse(options.body), key: options.headers['Idempotency-Key'] });
      return new Response(providerFailure ? 'failure' : JSON.stringify({ id: 'simulated-support-mail' }), {
        status: providerFailure ? 503 : 200,
      });
    }
    return originalFetch(url, options);
  }) as typeof fetch;
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  const email = `support.${Date.now()}@test.invalid`,
    password = 'SupportTest@2026';
  const req = async (method: string, path: string, body?: unknown, token?: string) => {
    const res = await originalFetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: (await res.json()) as any };
  };
  function check(value: unknown, message: string) {
    assert.ok(value, message);
    checks++;
    console.log('OK ' + message);
  }
  try {
    const registered = await req('POST', '/auth/register', { name: 'Teste Suporte', email, password });
    assert.equal(registered.status, 201);
    const token = registered.body.data.tokens.accessToken,
      user = registered.body.data.user;
    const input: SupportInput = {
      subject: 'Assinatura nao aparece',
      createdAt: new Date().toISOString(),
      category: 'assinatura',
      message: 'Minha assinatura nao aparece no aplicativo.',
      appVersion: '1.0.0',
      platform: 'android',
      requestId: 'request-test-123456',
    };
    check((await req('GET', '/support')).body.data.configured, 'Disponibilidade consultavel antes do login');
    check((await req('POST', '/support', input)).status === 401, 'Envio direto exige autenticacao');
    check(
      (await req('POST', '/support', { ...input, category: 'invalida' }, token)).status === 422,
      'Categoria invalida rejeitada',
    );
    check(
      (await req('POST', '/support', { ...input, to: 'attacker@example.com' }, token)).status === 422,
      'Cliente nao pode definir destinatario',
    );
    check(messages.length === 0, 'Requisicoes invalidas nao enviam e-mail');
    const sent = await req('POST', '/support', input, token);
    check(
      sent.status === 200 && /^CLY-/.test(sent.body.data.reference),
      'Retorna referencia somente apos aceite do provedor',
    );
    check(messages[0].body.to[0] === 'skybreakersstudio@gmail.com', 'Destino e o Gmail autorizado');
    check(messages[0].body.reply_to === email, 'Resposta vai ao e-mail autenticado do usuario');
    check(
      messages[0].body.text.includes(input.message) && messages[0].body.subject.includes('Assinatura'),
      'Categoria e relato incluidos',
    );
    const retry = await req('POST', '/support', input, token);
    check(
      retry.body.data.reference === sent.body.data.reference && messages[0].key === messages[1].key,
      'Retentativa usa a mesma chave de deduplicacao',
    );
    providerFailure = true;
    check(
      (await req('POST', '/support', { ...input, requestId: 'request-error-123456' }, token)).status === 503,
      'Falha do provedor nao exibe sucesso',
    );
    const before = messages.length;
    check(
      (await req('POST', '/support', input, token)).status === 429 && messages.length === before,
      'Limite de envio bloqueia chamadas extras',
    );
    providerFailure = false;
    for (const [category, prefix] of [
      ['sugestao', '[SUGESTÃO CLYVO]'],
      ['erro', '[BUG]'],
      ['login', '[CONTA]'],
      ['aplicativo', '[SUPORTE]'],
    ] as const) {
      await supportService.send(user, { ...input, category, requestId: 'prefix-test-' + category });
      check(messages[messages.length - 1].body.subject.startsWith(prefix), 'Prefixo correto: ' + category);
    }
    check(
      !supportSchema.safeParse({ ...input, subject: 'Assunto\r\nBcc: outro@example.com' }).success,
      'Assunto rejeita quebra de cabecalho',
    );
    await supportService.send(user, {
      ...input,
      requestId: 'image-test-123456',
      image:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8T8AAAAASUVORK5CYII=',
    });
    check(
      messages[messages.length - 1].body.attachments[0].filename === 'captura.png',
      'Imagem opcional enviada como anexo escolhido',
    );
    check(messages[0].body.text.includes(input.createdAt!), 'Data e hora constam no pedido');
    Object.assign(env, { EMAIL_API_KEY: '' });
    await assert.rejects(() => supportService.send(user, input), { code: 'SUPPORT_UNAVAILABLE' });
    checks++;
    console.log(`SUPORTE: ${checks} verificacoes aprovadas; nenhum e-mail real enviado.`);
  } finally {
    await req('POST', '/auth/delete-account', { email, password });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    globalThis.fetch = originalFetch;
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closePool());
