import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Carrega e valida as variaveis de ambiente.
 *
 * A aplicacao NAO inicia se alguma variavel obrigatoria estiver ausente
 * ou invalida - falhar cedo evita erros silenciosos em producao.
 */
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/** Le "true"/"1" como verdadeiro. O default vem antes do transform de proposito:
 *  assim o valor padrao e validado como texto, igual ao que vem do .env. */
const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .default('false')
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  API_PREFIX: z.string().startsWith('/').default('/api'),
  CORS_ORIGIN: z.string().default('*'),

  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1).default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().regex(/^[a-zA-Z0-9_]+$/, 'DB_NAME deve conter apenas letras, numeros e sublinhado').default('clyvo'),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().max(100).default(10),
  DB_TIMEZONE: z.string().default('Z'),
  // Bancos gerenciados (Railway, Aiven, PlanetScale...) exigem TLS.
  // No WAMP local deixe "false".
  DB_SSL: booleanFromString,

  JWT_ACCESS_SECRET: z
    .string({ required_error: 'JWT_ACCESS_SECRET e obrigatorio (veja o .env.example)' })
    .min(32, 'JWT_ACCESS_SECRET precisa ter no minimo 32 caracteres'),
  JWT_REFRESH_SECRET: z
    .string({ required_error: 'JWT_REFRESH_SECRET e obrigatorio (veja o .env.example)' })
    .min(32, 'JWT_REFRESH_SECRET precisa ter no minimo 32 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  JWT_ISSUER: z.string().default('clyvo-api'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  SEED_USER_EMAIL: z.string().email().default('renan@clyvo.app'),
  SEED_USER_PASSWORD: z.string().min(8).default('Clyvo@2025'),
  SMOKE_TEST_BASE_URL: z.string().url().default('http://127.0.0.1:3333'),

  REVENUECAT_SECRET_KEY: z.string().default(''),
  BILLING_ALLOW_SANDBOX: booleanFromString,
  EMAIL_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().default(''),
  AI_MODEL: z.string().default('gpt-4.1-mini'),
  AI_PROVIDER: z.enum(['', 'openai']).default(''),
  AI_API_KEY: z.string().optional().default(''),
  PAYMENT_PROVIDER: z.string().optional().default(''),
  PAYMENT_API_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  // eslint-disable-next-line no-console
  console.error(
    `\n[Clyvo] Falha ao carregar as variaveis de ambiente:\n${issues}\n\n` +
      'Copie o arquivo ".env.example" para ".env" e preencha os valores.\n',
  );
  process.exit(1);
}

const raw = parsed.data;

if (raw.JWT_ACCESS_SECRET === raw.JWT_REFRESH_SECRET) {
  // eslint-disable-next-line no-console
  console.error(
    '\n[Clyvo] JWT_ACCESS_SECRET e JWT_REFRESH_SECRET precisam ser diferentes.\n',
  );
  process.exit(1);
}

/**
 * Travas de producao.
 *
 * Um erro de configuracao em producao costuma ser silencioso e caro:
 * a API sobe, parece funcionar, e fica aberta. Preferimos nao subir.
 */
if (raw.NODE_ENV === 'production') {
  const problems: string[] = [];

  if (raw.CORS_ORIGIN === '*') {
    problems.push(
      'CORS_ORIGIN nao pode ser "*" em producao. Liste os enderecos do seu site, ' +
        'separados por virgula (ex.: https://app.clyvo.com.br).',
    );
  }

  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    if (raw[key].includes('troque-este')) {
      problems.push(
        `${key} ainda esta com o valor de exemplo. Gere um segredo real com: ` +
          'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
      );
    }
  }

  if (raw.DB_PASSWORD.length === 0) {
    problems.push('DB_PASSWORD esta vazio. Em producao o banco precisa de senha.');
  }

  if (raw.SEED_USER_PASSWORD === 'Clyvo@2025') {
    problems.push('SEED_USER_PASSWORD ainda e a senha de exemplo. Troque antes de publicar.');
  }

  if (!raw.EMAIL_API_KEY || !raw.EMAIL_FROM) {
    problems.push('Configure EMAIL_API_KEY e EMAIL_FROM (dominio verificado no Resend) para recuperacao de senha.');
  }

  if (problems.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `\n[Clyvo] A API nao subiu porque a configuracao de producao esta insegura:\n` +
        problems.map((problem) => `  - ${problem}`).join('\n') +
        '\n\nVeja o arquivo ".env.production.example".\n',
    );
    process.exit(1);
  }
}

export const env = {
  ...raw,
  isDevelopment: raw.NODE_ENV === 'development',
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  corsOrigins:
    raw.CORS_ORIGIN === '*'
      ? ('*' as const)
      : raw.CORS_ORIGIN.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
} as const;

export type Env = typeof env;
export { booleanFromString };
