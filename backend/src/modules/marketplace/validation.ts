import { z } from 'zod';
export const RULES_VERSION = 'mercado-2026-10-v2';
export const categories = [
  'Tecnico de informatica',
  'Manutencao de celular',
  'Instalacao de cameras',
  'Eletricista',
  'Encanador',
  'Designer',
  'Editor de video',
  'Programador',
  'Criador de sites',
  'Fotografo',
  'Professor / aulas particulares',
  'Social media',
  'Manutencao',
  'Montagem de moveis',
  'Servicos domesticos',
  'Entregas',
  'Pet sitter',
  'Outros',
] as const;
const text = (max: number, min = 0) => z.string().trim().min(min).max(max);
export const money = z.number().finite().min(0).max(9999999).multipleOf(0.01);
export const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    'Escolha uma data válida no calendário.',
  );
export const imageData = z
  .string()
  .max(700000)
  .regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/);
const location = {
  city: text(100),
  region: text(100),
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
};
const validLocation = (v: { latitude: number | null; longitude: number | null }) =>
  (v.latitude === null) === (v.longitude === null);
export const profileSchema = z
  .object({
    name: text(120, 2),
    photo: imageData.nullable(),
    ...location,
    skills: z.array(text(80, 2)).min(1).max(20),
    services: text(1500, 5),
    experience: text(1500),
    bio: text(1500, 10),
    priceFrom: money.nullable(),
    priceTo: money.nullable(),
    availability: text(300),
    radiusKm: z.number().int().min(1).max(1000),
    mode: z.enum(['presencial', 'remoto', 'ambos']),
    published: z.boolean(),
    acceptRules: z.boolean().optional(),
  })
  .strict()
  .refine(validLocation, 'Informe as duas coordenadas ou nenhuma.')
  .refine(
    (v) => v.priceFrom === null || v.priceTo === null || v.priceTo >= v.priceFrom,
    'Faixa de preco invalida',
  )
  .refine((v) => v.mode === 'remoto' || v.city.length > 0, 'Informe a cidade');
export const postSchema = z
  .object({
    title: text(120, 5),
    category: z.enum(categories),
    description: text(3000, 20),
    ...location,
    mode: z.enum(['presencial', 'remoto']),
    budgetFrom: money.nullable(),
    budgetTo: money.nullable(),
    dueDate: day.nullable(),
    photos: z.array(imageData).max(2),
    acceptRules: z.boolean().optional(),
  })
  .strict()
  .refine(validLocation, 'Informe as duas coordenadas ou nenhuma.')
  .refine((v) => v.mode === 'remoto' || v.city.length > 0, { message: 'Informe a cidade.', path: ['city'] })
  .refine(
    (v) => v.budgetFrom === null || v.budgetTo === null || v.budgetTo >= v.budgetFrom,
    'Orcamento invalido',
  )
  .refine((v) => !v.dueDate || v.dueDate >= new Date().toISOString().slice(0, 10), 'Escolha uma data futura');
export const proposalSchema = z
  .object({ amount: money.positive(), dueDate: day, message: text(2000, 10), experience: text(1500) })
  .strict()
  .refine((v) => v.dueDate >= new Date().toISOString().slice(0, 10), 'Escolha uma data futura');
export const preferencesSchema = z
  .object({
    intent: z.enum([
      'encontrar_clientes',
      'tenho_clientes',
      'oferecer_servicos',
      'renda_extra',
      'organizar_negocio',
    ]),
    acceptRules: z.boolean().optional(),
  })
  .strict();
export const reportSchema = z
  .object({
    targetType: z.enum(['post', 'user', 'message', 'review']),
    targetId: z.number().int().positive(),
    reason: text(1500, 10),
  })
  .strict();
export const goalSchema = z
  .object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), amount: money.positive() })
  .strict();
export const termsSchema = z.object({ amount: money.positive(), dueDate: day }).strict();
export type ProfileInput = z.infer<typeof profileSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type ProposalInput = z.infer<typeof proposalSchema>;
