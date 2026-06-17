// Convite de acesso — token de uso único para o usuário definir a própria senha.
// SERVER ONLY. O token bruto é enviado por e-mail / copiado pelo admin; só o
// sha256 é persistido (ConviteAcesso.tokenHash). Um convite ativo por usuário:
// reemitir invalida o anterior. As partes puras (hashToken/gerarToken/
// conviteExpirado) são testáveis sem banco.
import { createHash, randomBytes } from "node:crypto"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { baseUrl } from "@/lib/notificacoes/email/mailer"
import { enviarConvite } from "./convite-email"
import { hashSenha } from "./mutations"

const VALIDADE_DIAS_PADRAO = 7

/** sha256 hex de um token bruto (puro/testável). */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

/** Token aleatório de alta entropia, url-safe (32 bytes → base64url). */
export function gerarToken(): string {
  return randomBytes(32).toString("base64url")
}

/** O convite já expirou? (puro/testável) */
export function conviteExpirado(expiraEm: Date, agora: Date = new Date()): boolean {
  return expiraEm.getTime() < agora.getTime()
}

export interface ConviteCriado {
  rawToken: string
  expiraEm: Date
}

/** Emite um novo convite para o usuário, invalidando convites anteriores. */
export async function criarConvite(userId: number, dias: number = VALIDADE_DIAS_PADRAO): Promise<ConviteCriado> {
  const rawToken = gerarToken()
  const tokenHash = hashToken(rawToken)
  const expiraEm = new Date(Date.now() + dias * 24 * 60 * 60 * 1000)
  await prisma.$transaction([
    prisma.conviteAcesso.deleteMany({ where: { userId } }),
    prisma.conviteAcesso.create({ data: { userId, tokenHash, expiraEm } }),
  ])
  return { rawToken, expiraEm }
}

/** Monta o link absoluto da página de ativação. `origem` é o fallback (ex.: a
 *  origem do request) quando APP_BASE_URL/AUTH_URL não estão configurados. */
export function linkConvite(rawToken: string, origem?: string | null): string | null {
  const base = baseUrl() ?? origem ?? null
  if (!base) return null
  return `${base.replace(/\/$/, "")}/definir-senha/${rawToken}`
}

export interface ConviteEmitido {
  conviteLink: string | null
  emailEnviado: boolean
}

/**
 * Emite (ou reemite) o convite de um usuário e tenta enviar o e-mail. Usado
 * tanto na criação quanto no "reenviar convite". `emailEnviado=false` (sem
 * SMTP) sinaliza ao admin que precisa copiar o `conviteLink` manualmente.
 */
export async function emitirConvite(userId: number, origem?: string | null): Promise<ConviteEmitido> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, nome: true } })
  if (!user) throw new UserError("Usuário não encontrado")
  const { rawToken } = await criarConvite(userId)
  const conviteLink = linkConvite(rawToken, origem)
  const emailEnviado = await enviarConvite(user.email, user.nome, conviteLink)
  return { conviteLink, emailEnviado }
}

export interface ConviteValido {
  userId: number
  nome: string
  email: string
}

/** Valida o token: existe, não usado e não expirado. Retorna o dono ou null. */
export async function validarConvite(rawToken: string): Promise<ConviteValido | null> {
  if (!rawToken) return null
  const convite = await prisma.conviteAcesso.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: { select: { id: true, nome: true, email: true } } },
  })
  if (!convite || convite.usadoEm || conviteExpirado(convite.expiraEm)) return null
  return { userId: convite.user.id, nome: convite.user.nome, email: convite.user.email }
}

export interface DefinirSenhaInput {
  senha: string
  nome?: string
}

/**
 * Define a senha pelo token (uso único). Valida a senha (lança UserError se
 * fraca, deixando o token reutilizável), reivindica o convite de forma atômica
 * (updateMany com `usadoEm: null` evita corrida), e então ativa a conta +
 * grava a senha/nome. Retorna o e-mail para redirecionar ao login.
 */
export async function definirSenhaPorToken(rawToken: string, input: DefinirSenhaInput): Promise<{ email: string }> {
  const convite = await prisma.conviteAcesso.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: { select: { id: true, email: true } } },
  })
  if (!convite || convite.usadoEm || conviteExpirado(convite.expiraEm)) {
    throw new UserError("Link inválido ou expirado")
  }

  const passwordHash = await hashSenha(input.senha) // valida min. 8 antes de reivindicar
  const nome = typeof input.nome === "string" && input.nome.trim() ? input.nome.trim() : undefined

  // Reivindica o token; se outra requisição já o usou, count = 0 → rejeita.
  const claim = await prisma.conviteAcesso.updateMany({
    where: { id: convite.id, usadoEm: null },
    data: { usadoEm: new Date() },
  })
  if (claim.count === 0) throw new UserError("Link inválido ou expirado")

  await prisma.user.update({
    where: { id: convite.userId },
    data: { passwordHash, ativo: true, ...(nome ? { nome } : {}) },
  })
  return { email: convite.user.email }
}
