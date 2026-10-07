import { env } from '../config/env';
import { AppError } from '../utils/app-error';

/** Token enviado apenas ao dono do e-mail, nunca em logs ou respostas de producao. */
export const emailService = {
  get configured() { return Boolean(env.EMAIL_API_KEY && env.EMAIL_FROM); },
  async sendPasswordReset(to: string, token: string): Promise<void> {
    if (!emailService.configured) {
      throw new AppError('Recuperacao de senha indisponivel temporariamente.', 503, 'EMAIL_UNAVAILABLE');
    }
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.EMAIL_FROM, to: [to], subject: 'Clyvo — redefinir sua senha',
          text: `Voce solicitou uma nova senha no Clyvo. Abra Recuperar senha > Tenho um codigo e cole:\n\n${token}\n\nValido por ${env.PASSWORD_RESET_EXPIRES_MINUTES} minutos. Se nao pediu, ignore este e-mail.`,
        }),
      });
      if (!response.ok) throw new Error('Email provider rejected request');
      const payload = await response.json() as { id?: string };
      if (!payload.id) throw new Error('Email provider returned invalid response');
    } catch {
      throw new AppError('Nao foi possivel enviar o e-mail. Tente novamente.', 503, 'EMAIL_UNAVAILABLE');
    }
  },
};
