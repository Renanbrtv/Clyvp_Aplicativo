/** No real requests are sent: provider contracts and error handling only. */
import assert from 'node:assert/strict';
process.env.EMAIL_API_KEY = 'test-email-key';
process.env.EMAIL_FROM = 'Clyvo <test@example.com>';
process.env.AI_PROVIDER = 'openai';
process.env.AI_API_KEY = 'test-ai-key';
import { emailService } from '../services/email.service';
import { callProvider } from '../services/cly-provider';
import { env } from '../config/env';
async function main() {
  // Import initialization may precede assignments; inject only synthetic test values.
  Object.assign(env, { EMAIL_API_KEY: 'test-email-key', EMAIL_FROM: 'test@example.com', AI_PROVIDER: 'openai', AI_API_KEY: 'test-ai-key' });
  const originalFetch = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = (async (url: any, options: any) => {
      calls++;
      if (String(url).includes('resend')) {
        const payload = JSON.parse(options.body);
        assert.deepEqual(payload.to, ['user@example.com']);
        assert.ok(payload.text.includes('test-reset-code'));
        assert.ok(options.signal);
        assert.equal(options.headers.Authorization, 'Bearer test-email-key');
        return new Response(JSON.stringify({ id: 'synthetic-message-id' }), { status: 200 });
      }
      const payload = JSON.parse(options.body);
      assert.equal(payload.store, false);
      assert.equal(options.headers.Authorization, 'Bearer test-ai-key');
      assert.ok(payload.max_output_tokens <= 800);
      return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: 'Descricao revisada' }] }] }), { status: 200 });
    }) as typeof fetch;
    await emailService.sendPasswordReset('user@example.com', 'test-reset-code');
    const answer = await callProvider('Descricao original');
    assert.equal(answer, 'Descricao revisada');
    assert.equal(calls, 2);
    globalThis.fetch = (async () => new Response('error', { status: 429 })) as typeof fetch;
    await assert.rejects(emailService.sendPasswordReset('user@example.com', 'code'), { code: 'EMAIL_UNAVAILABLE' });
    await assert.rejects(callProvider('Descricao'), { code: 'AI_UNAVAILABLE' });
    globalThis.fetch = (async () => new Response('{}', { status: 200 })) as typeof fetch;
    await assert.rejects(emailService.sendPasswordReset('user@example.com', 'code'), { code: 'EMAIL_UNAVAILABLE' });
    await assert.rejects(callProvider('Descricao'), { code: 'AI_UNAVAILABLE' });
    console.log('Provedores: contratos e falhas verificados com respostas simuladas; nenhuma entrega real foi testada.');
  } finally { globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
