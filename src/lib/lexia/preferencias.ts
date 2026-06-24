// Acesso às preferências da LexIA por usuário (User.lexiaPrefs JSON). Mesmo
// padrão de src/lib/notificacoes/preferencias.ts. SERVER ONLY.
import { prisma } from "@/lib/db"
import { parseLexiaPrefs, resolveLexiaPrefs, type LexiaPrefs, type LexiaPrefsResolved } from "./preferencias-core"

/** Preferências CRUAS armazenadas (parcial; {} quando não definidas). Degrada
 *  para {} se a coluna ainda não foi migrada (Windows lock) — o agente segue com
 *  os defaults em vez de quebrar todo turno. */
export async function getLexiaPrefsRaw(email: string): Promise<LexiaPrefs> {
  try {
    const u = await prisma.user.findUnique({ where: { email }, select: { lexiaPrefs: true } })
    return parseLexiaPrefs(u?.lexiaPrefs)
  } catch {
    return {}
  }
}

/** Preferências EFETIVAS (defaults aplicados) — para o agente e a UI. */
export async function getLexiaPrefs(email: string): Promise<LexiaPrefsResolved> {
  return resolveLexiaPrefs(await getLexiaPrefsRaw(email))
}

/** Substitui o blob de preferências (a UI envia o objeto completo). */
export async function setLexiaPrefs(email: string, prefs: LexiaPrefs): Promise<LexiaPrefsResolved> {
  await prisma.user.update({ where: { email }, data: { lexiaPrefs: JSON.stringify(prefs ?? {}) } })
  return resolveLexiaPrefs(prefs)
}
