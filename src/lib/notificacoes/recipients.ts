// Resolução de destinatários das notificações. SERVER ONLY.
import { prisma } from "@/lib/db"
import { getSetting } from "@/lib/settings"

interface NotifGestorCfg {
  ativo?: boolean
  emails?: string[]
}

/**
 * Gestores (sócios/admin) que recebem CÓPIA de eventos sensíveis (prazos,
 * conversões, contratos). Configurável em AppSetting "notif-gestor"
 * { ativo, emails[] }; sem config, o padrão são os sócios/admin ativos.
 * Mesma regra usada pelo cron (gerarNotificacoes) — fonte única aqui.
 */
export async function gestorEmails(): Promise<string[]> {
  const cfg = await getSetting<NotifGestorCfg>("notif-gestor")
  if (cfg && cfg.ativo === false) return []
  if (cfg?.emails?.length) return cfg.emails.filter(Boolean)
  const socios = await prisma.user.findMany({
    where: { role: { in: ["socio", "admin"] }, ativo: true },
    select: { email: true },
  })
  return socios.map((u) => u.email)
}

/** E-mail de um usuário por id (responsável → destinatário), ou null. */
export async function emailDoUsuario(userId: number | null | undefined): Promise<string | null> {
  if (!userId) return null
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  return u?.email ?? null
}

/** Id de um usuário ativo por e-mail (p/ gravar Tarefa.criadoPorId a partir da sessão). */
export async function userIdPorEmail(email: string | null | undefined): Promise<number | null> {
  if (!email) return null
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  return u?.id ?? null
}
