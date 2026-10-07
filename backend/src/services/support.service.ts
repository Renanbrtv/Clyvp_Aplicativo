import { createHash } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env';
import { emailService } from './email.service';
import { cleanImage } from '../modules/marketplace/images';
import { AppError } from '../utils/app-error';

export const SUPPORT_EMAIL = 'skybreakersstudio@gmail.com';
export const SUPPORT_CATEGORIES = {
  aplicativo: 'Problema no aplicativo',
  cadastro: 'Problema com cadastro',
  oportunidade: 'Problema com oportunidade',
  proposta: 'Problema com proposta',
  denuncia: 'Denunciar conteudo/usuario',
  login: 'Acesso ou senha',
  assinatura: 'Assinatura ou pagamento',
  clientes: 'Clientes e catalogo',
  propostas: 'Orcamentos e PDF',
  cly: 'Assistente Cly',
  notificacoes: 'Notificacoes',
  erro: 'Erro ou travamento',
  sugestao: 'Sugestao de melhoria',
  outro: 'Outro problema',
} as const;
export const supportSchema = z
  .object({
    category: z.enum([
      'aplicativo',
      'cadastro',
      'oportunidade',
      'proposta',
      'denuncia',
      'login',
      'assinatura',
      'clientes',
      'propostas',
      'cly',
      'notificacoes',
      'erro',
      'sugestao',
      'outro',
    ]),
    subject: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(/^[^\r\n]+$/)
      .default('Pedido de ajuda'),
    createdAt: z.string().datetime().optional(),
    image: z.string().max(350000).optional(),
    message: z.string().trim().min(10, 'Descreva o problema com pelo menos 10 caracteres.').max(2000),
    appVersion: z
      .string()
      .max(30)
      .regex(/^[\w.+-]+$/),
    platform: z.enum(['android', 'ios', 'web', 'windows', 'macos']),
    requestId: z.string().regex(/^[a-zA-Z0-9-]{10,80}$/),
  })
  .strict();
export type SupportInput = z.infer<typeof supportSchema>;
export const supportService = {
  async send(user: { id: number; name: string; email: string }, input: SupportInput) {
    if (!emailService.configured)
      throw new AppError(
        'Envio pelo app indisponivel. Use a opcao Abrir meu e-mail.',
        503,
        'SUPPORT_UNAVAILABLE',
      );
    const image = input.image ? cleanImage(input.image) : null;
    const prefix =
      input.category === 'sugestao'
        ? 'SUGESTÃO CLYVO'
        : input.category === 'erro'
          ? 'BUG'
          : ['login', 'cadastro'].includes(input.category)
            ? 'CONTA'
            : 'SUPORTE';
    const reference =
      'CLY-' +
      createHash('sha256').update(`${user.id}:${input.requestId}`).digest('hex').slice(0, 12).toUpperCase();
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Bearer ${env.EMAIL_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `support/${user.id}/${input.requestId}`,
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [SUPPORT_EMAIL],
          reply_to: user.email,
          subject: `[${prefix}] ${input.subject} — ${reference}`,
          ...(image
            ? {
                attachments: [
                  {
                    filename: image.startsWith('data:image/png') ? 'captura.png' : 'captura.jpg',
                    content: image.split(',')[1],
                  },
                ],
              }
            : {}),
          text: `Pedido de suporte ${reference}\nCategoria: ${SUPPORT_CATEGORIES[input.category]}\nAssunto: ${input.subject}\nData/hora informada: ${input.createdAt ?? 'Nao informada'}\nNome: ${user.name}\nE-mail da conta: ${user.email}\nConta: ${user.id}\nAplicativo: ${input.appVersion} (${input.platform})\n\nRelato do usuario:\n${input.message}\n\nResponda a este e-mail para falar com o usuario. O relato acima e conteudo enviado pelo usuario.`,
        }),
      });
      if (!response.ok) throw new Error('Provider rejected support message');
      const payload = (await response.json()) as { id?: string };
      if (!payload.id) throw new Error('Invalid provider response');
      return { reference };
    } catch {
      throw new AppError(
        'Nao foi possivel confirmar o envio. Tente novamente ou use Abrir meu e-mail.',
        503,
        'SUPPORT_UNAVAILABLE',
      );
    }
  },
};
