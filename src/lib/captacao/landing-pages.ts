// CRUD de LandingPage + emissão/validação da chave de API que autentica o
// endpoint público de captação. Mesmo padrão de hash de src/lib/users/convite.ts
// (ConviteAcesso): a chave em claro é gerada, devolvida UMA vez ao admin, e só o
// sha256 é persistido — nunca dá para recuperar a chave depois, só rotacionar.
// SERVER ONLY.
import { createHash, randomBytes } from "node:crypto"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"

/** sha256 hex de uma chave bruta (puro/testável). */
export function hashChave(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

/** Chave aleatória de alta entropia, prefixada p/ ser reconhecível em logs/UI
 *  ("lp_" + 24 bytes url-safe). O prefixo mostrado na lista (§5.2 do plano) é
 *  só os 10 primeiros caracteres — nunca a chave inteira. */
export function gerarChave(): string {
  return `lp_${randomBytes(24).toString("base64url")}`
}

/** Os primeiros caracteres da chave, só p/ identificar a linha na lista —
 *  nunca autentica sozinho (a autenticação real é sempre pelo hash inteiro). */
export function chavePrefixoDe(raw: string): string {
  return raw.slice(0, 10)
}

export interface LandingPageInput {
  nome: string
  dominios: string[] // domínios autorizados (apex/www); persistidos ';'-joined
  campanhaPadraoId?: number | null
  areaPadrao?: string | null
  responsavelPadraoUserId?: number | null
  consentimentoVersao?: string | null
}

export interface LandingPageRow {
  id: number
  nome: string
  dominios: string[]
  chavePrefixo: string
  campanhaPadraoId: number | null
  campanhaPadraoNome: string | null
  areaPadrao: string | null
  responsavelPadraoUserId: number | null
  responsavelPadraoNome: string | null
  consentimentoVersao: string | null
  ativo: boolean
  revogadaEm: string | null
  createdAt: string
}

function toRow(lp: {
  id: number
  nome: string
  dominios: string
  chavePrefixo: string
  campanhaPadraoId: number | null
  campanhaPadrao: { nome: string } | null
  areaPadrao: string | null
  responsavelPadraoUserId: number | null
  responsavelPadrao: { nome: string } | null
  consentimentoVersao: string | null
  ativo: boolean
  revogadaEm: Date | null
  createdAt: Date
}): LandingPageRow {
  return {
    id: lp.id,
    nome: lp.nome,
    dominios: lp.dominios.split(";").map((d) => d.trim()).filter(Boolean),
    chavePrefixo: lp.chavePrefixo,
    campanhaPadraoId: lp.campanhaPadraoId,
    campanhaPadraoNome: lp.campanhaPadrao?.nome ?? null,
    areaPadrao: lp.areaPadrao,
    responsavelPadraoUserId: lp.responsavelPadraoUserId,
    responsavelPadraoNome: lp.responsavelPadrao?.nome ?? null,
    consentimentoVersao: lp.consentimentoVersao,
    ativo: lp.ativo,
    revogadaEm: lp.revogadaEm?.toISOString() ?? null,
    createdAt: lp.createdAt.toISOString(),
  }
}

const INCLUDE = {
  campanhaPadrao: { select: { nome: true } },
  responsavelPadrao: { select: { nome: true } },
} as const

export async function listarLandingPages(): Promise<LandingPageRow[]> {
  const rows = await prisma.landingPage.findMany({ include: INCLUDE, orderBy: { createdAt: "desc" } })
  return rows.map(toRow)
}

export interface LandingPageCriada {
  row: LandingPageRow
  chave: string // em claro — mostrada UMA vez só, nunca mais recuperável
}

export async function criarLandingPage(input: LandingPageInput): Promise<LandingPageCriada> {
  const nome = input.nome.trim()
  if (!nome) throw new UserError("Nome é obrigatório")
  const dominios = input.dominios.map((d) => d.trim().toLowerCase()).filter(Boolean)
  if (!dominios.length) throw new UserError("Informe ao menos um domínio autorizado")
  const chave = gerarChave()
  const created = await prisma.landingPage.create({
    data: {
      nome,
      dominios: dominios.join(";"),
      chaveHash: hashChave(chave),
      chavePrefixo: chavePrefixoDe(chave),
      campanhaPadraoId: input.campanhaPadraoId ?? null,
      areaPadrao: input.areaPadrao?.trim() || null,
      responsavelPadraoUserId: input.responsavelPadraoUserId ?? null,
      consentimentoVersao: input.consentimentoVersao?.trim() || null,
    },
    include: INCLUDE,
  })
  return { row: toRow(created), chave }
}

export async function atualizarLandingPage(id: number, input: LandingPageInput): Promise<LandingPageRow> {
  const nome = input.nome.trim()
  if (!nome) throw new UserError("Nome é obrigatório")
  const dominios = input.dominios.map((d) => d.trim().toLowerCase()).filter(Boolean)
  if (!dominios.length) throw new UserError("Informe ao menos um domínio autorizado")
  const updated = await prisma.landingPage.update({
    where: { id },
    data: {
      nome,
      dominios: dominios.join(";"),
      campanhaPadraoId: input.campanhaPadraoId ?? null,
      areaPadrao: input.areaPadrao?.trim() || null,
      responsavelPadraoUserId: input.responsavelPadraoUserId ?? null,
      consentimentoVersao: input.consentimentoVersao?.trim() || null,
    },
    include: INCLUDE,
  })
  return toRow(updated)
}

/** Revoga (soft) — a LP para de aceitar submits; a linha e o histórico ficam. */
export async function revogarLandingPage(id: number): Promise<{ id: number }> {
  await prisma.landingPage.update({ where: { id }, data: { ativo: false, revogadaEm: new Date() } })
  return { id }
}

export async function reativarLandingPage(id: number): Promise<{ id: number }> {
  await prisma.landingPage.update({ where: { id }, data: { ativo: true, revogadaEm: null } })
  return { id }
}

/** Gera uma chave NOVA para uma LP existente — a antiga para de autenticar
 *  imediatamente (uma LP comprometida não obriga a trocar as outras). */
export async function rotacionarChave(id: number): Promise<LandingPageCriada> {
  const chave = gerarChave()
  const updated = await prisma.landingPage.update({
    where: { id },
    data: { chaveHash: hashChave(chave), chavePrefixo: chavePrefixoDe(chave) },
    include: INCLUDE,
  })
  return { row: toRow(updated), chave }
}

export interface LandingPageResolvida {
  id: number
  nome: string
  dominios: string[]
  campanhaPadraoId: number | null
  areaPadrao: string | null
  responsavelPadraoUserId: number | null
  consentimentoVersao: string | null
}

/** Resolve a LP a partir da chave em claro (header `X-Lexia-Lp-Key`) — busca
 *  pelo hash (índice único; mesmo padrão de ConviteAcesso.tokenHash em
 *  src/lib/users/convite.ts). null quando a chave é desconhecida OU a LP foi
 *  revogada/desativada — o chamador não distingue os dois casos na resposta. */
export async function resolverLandingPagePorChave(chaveEmClaro: string): Promise<LandingPageResolvida | null> {
  if (!chaveEmClaro) return null
  const lp = await prisma.landingPage.findUnique({ where: { chaveHash: hashChave(chaveEmClaro) } })
  if (!lp || !lp.ativo) return null
  return {
    id: lp.id,
    nome: lp.nome,
    dominios: lp.dominios.split(";").map((d) => d.trim()).filter(Boolean),
    campanhaPadraoId: lp.campanhaPadraoId,
    areaPadrao: lp.areaPadrao,
    responsavelPadraoUserId: lp.responsavelPadraoUserId,
    consentimentoVersao: lp.consentimentoVersao,
  }
}

/** O domínio do `Origin` da requisição está entre os autorizados da LP?
 *  Compara host-only (ignora protocolo/porta) — puro/testável. */
export function origemAutorizada(dominios: string[], origin: string | null): boolean {
  if (!origin) return false
  let host: string
  try {
    host = new URL(origin).host.toLowerCase()
  } catch {
    return false
  }
  const hostSemPorta = host.split(":")[0]
  return dominios.some((d) => {
    const dd = d.toLowerCase().replace(/^https?:\/\//, "").split(":")[0]
    return dd === hostSemPorta || dd === host
  })
}
