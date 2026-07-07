// Preferências de notificação — camada Prisma sobre User.notifPrefs. SERVER ONLY.
import { prisma } from "@/lib/db"
import { type NotifPrefs, parsePrefs } from "./preferencias-core"

export {
  permiteApp,
  permiteEmail,
  parsePrefs,
  querRelatorioDiario,
  horaRelatorio,
  deveEnviarRelatorio,
} from "./preferencias-core"
export type { NotifPrefs } from "./preferencias-core"

export async function getPrefs(email: string): Promise<NotifPrefs> {
  const u = await prisma.user.findUnique({ where: { email }, select: { notifPrefs: true } })
  return parsePrefs(u?.notifPrefs)
}

export async function setPrefs(email: string, prefs: NotifPrefs): Promise<NotifPrefs> {
  await prisma.user.update({ where: { email }, data: { notifPrefs: JSON.stringify(prefs ?? {}) } })
  return prefs
}
