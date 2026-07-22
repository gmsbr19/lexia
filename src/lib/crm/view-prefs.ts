// Saved-view preferences — camada Prisma sobre User.crmViewPrefs. SERVER ONLY.
import { prisma } from "@/lib/db"
import { type CrmViewPrefs, parseViewPrefs } from "./view-prefs-core"

export { parseViewPrefs }
export type { CrmViewPrefs, GridId } from "./view-prefs-core"

export async function getViewPrefs(email: string): Promise<CrmViewPrefs> {
  const u = await prisma.user.findUnique({ where: { email }, select: { crmViewPrefs: true } })
  return parseViewPrefs(u?.crmViewPrefs)
}

/** Full-object replacement — same convention as notificacoes/preferencias.ts
 *  setPrefs (the client GETs the whole blob, mutates only its own gridId key
 *  locally, PATCHes the whole object back). */
export async function setViewPrefs(email: string, prefs: CrmViewPrefs): Promise<CrmViewPrefs> {
  await prisma.user.update({ where: { email }, data: { crmViewPrefs: JSON.stringify(prefs ?? {}) } })
  return prefs
}
