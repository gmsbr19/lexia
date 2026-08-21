// Zod schemas do módulo de Captação. O payload do endpoint público (§4 do
// plano) é validado por `captacaoLeadSchema`; os demais são das rotas
// autenticadas (landing pages, config, fila de eventos).
import { z } from "zod"
import { idOpt } from "@/lib/validation"

// ── endpoint público POST /api/captacao/lead ──────────────────────────────────
const contatoSchema = z.object({
  nome: z.string().min(1).max(200),
  telefone: z.string().max(40).nullish(),
  email: z.string().max(200).nullish(),
})

const utmSchema = z.object({
  source: z.string().max(120).nullish(),
  medium: z.string().max(120).nullish(),
  campaign: z.string().max(200).nullish(),
  term: z.string().max(200).nullish(),
  content: z.string().max(200).nullish(),
})

const atribuicaoSchema = z.object({
  gclid: z.string().max(200).nullish(),
  wbraid: z.string().max(200).nullish(),
  gbraid: z.string().max(200).nullish(),
  utm: utmSchema.nullish(),
  matchtype: z.string().max(20).nullish(),
  device: z.string().max(20).nullish(),
  network: z.string().max(20).nullish(),
  landingPage: z.string().max(500).nullish(),
  referrer: z.string().max(500).nullish(),
  cliqueEm: z.string().max(40).nullish(), // ISO
})

const consentimentoSchema = z.object({
  aceito: z.boolean(),
  versao: z.string().max(40).nullish(),
  em: z.string().max(40).nullish(), // ISO
})

export const captacaoLeadSchema = z.object({
  contato: contatoSchema,
  triagem: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).nullish(),
  atribuicao: atribuicaoSchema.nullish(),
  consentimento: consentimentoSchema.nullish(),
  site: z.string().max(200).nullish(), // honeypot — a LP já tem esse campo
})
export type CaptacaoLeadInput = z.infer<typeof captacaoLeadSchema>

// ── endpoint interno POST /api/lead (site institucional ncm.adv.br) ───────────
// Contrato do proxy do site (app/api/lead/route.ts do repo ncm_institucional).
// Deliberadamente TOLERANTE: só `nome` é exigido — tudo que o contrato marca
// como opcional pode faltar sem virar 500. Objetos livres (`triagem`,
// `atribuicao`, `consentimento`, `cliente`) NÃO têm schema fixo: as chaves
// variam por página e por versão do site, e descartá-las destruiria a base de
// atribuição. O corpo cru é preservado inteiro em `Lead.captacaoRaw` (ver
// site-lead.ts) — este schema serve só para não explodir com lixo.
const objetoLivre = z.record(z.string(), z.unknown())

export const siteLeadSchema = z.object({
  origem: z.string().max(120).nullish(),
  tipo: z.string().max(120).nullish(),
  nome: z.string().min(1).max(200),
  telefone: z.string().max(40).nullish(),
  telefone_e164: z.string().max(40).nullish(),
  triagem: objetoLivre.nullish(),
  atribuicao: objetoLivre.nullish(),
  consentimento: objetoLivre.nullish(),
  pagina: z.string().max(500).nullish(),
  cliente: objetoLivre.nullish(),
  enviado_em: z.string().max(40).nullish(),
  // honeypot — o proxy do site já remove antes de repassar; aceito e ignorado
  // aqui só para não quebrar caso chegue (ver §"Contrato do corpo").
  site: z.string().max(200).nullish(),
})
export type SiteLeadInput = z.infer<typeof siteLeadSchema>

// ── landing pages (rotas admin) ────────────────────────────────────────────────
export const landingPageSchema = z.object({
  nome: z.string().min(1).max(200),
  dominios: z.array(z.string().min(1).max(200)).min(1).max(20),
  campanhaPadraoId: idOpt,
  areaPadrao: z.string().max(60).nullish(),
  responsavelPadraoUserId: idOpt,
  consentimentoVersao: z.string().max(40).nullish(),
})
export type LandingPageSchemaInput = z.infer<typeof landingPageSchema>

// ── fila de eventos (rota admin) ───────────────────────────────────────────────
export const conversoesLoteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  acao: z.enum(["descartar", "reativar"]),
  motivo: z.string().max(300).nullish(), // obrigatório na prática p/ "descartar" — validado no handler
})
export type ConversoesLoteInput = z.infer<typeof conversoesLoteSchema>
