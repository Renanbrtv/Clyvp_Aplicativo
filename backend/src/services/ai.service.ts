import { billingService } from './billing.service';
import { clientRepository } from '../repositories/client.repository';
import { AppError } from '../utils/app-error';
import { whatsappService, type MessageKind } from './whatsapp.service';
import { clyQuota } from './cly-quota.service';
import { generateClyLocal } from './cly-local';

export const aiService = {
 get status() { return { configured: true, provider: 'Cly Local', features: { gerarProposta: true, criarMensagem: true, melhorarDescricao: true } }; },
 async generate(userId: number, action: 'mensagem' | 'descricao' | 'proposta' | 'conversa', text: string) {
   await billingService.sync(userId);
   const lease = await clyQuota.reserve(userId);
   let success = false;
   try {
     const suggestion = generateClyLocal(action === 'conversa' ? 'mensagem' : action, text);
     success = true;
     return { suggestion, source: 'template', reviewRequired: true };
   } finally { await clyQuota.finish(userId, lease.token, lease.plan, success); }
 },
 async generateProposal(userId: number, prompt: string, clientId?: number | null) {
   if (clientId) {
     const client = await clientRepository.findById(userId, clientId);
     if (!client) throw AppError.notFound('Cliente nao encontrado.');
     // Do not automatically attach personal records: send only explicitly entered text.
   }
   return aiService.generate(userId, 'proposta', prompt);
 },
 async improveText(userId: number, text: string) {
   const result = await aiService.generate(userId, 'descricao', text);
   return { original: text, improved: result.suggestion };
 },
 async generateMessage(userId: number, kind: MessageKind, context: { clientId?: number | null; extra?: string | null }) {
   const client = context.clientId ? await clientRepository.findById(userId, context.clientId) : null;
   if (context.clientId && !client) throw AppError.notFound('Cliente nao encontrado.');
   const message = await whatsappService.build(userId, kind, { clientName: client?.name ?? 'cliente' });
   return { message, source: 'template' as const, link: whatsappService.link(client?.whatsapp ?? client?.phone ?? null, message) };
 }
};
