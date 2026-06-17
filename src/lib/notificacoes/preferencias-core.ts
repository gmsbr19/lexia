// Lógica PURA das preferências de notificação (sem Prisma) — testável isolada,
// mesmo padrão de src/lib/clientes/cobranca-core.ts.
import type { Modulo, Prioridade } from "./types"
import { prioridadeRank } from "./types"

export interface NotifPrefs {
  /** canal in-app (toast/sino/histórico) por módulo — default LIGADO */
  app?: Partial<Record<Modulo, boolean>>
  /** canal e-mail por módulo — default DESLIGADO (opt-in) */
  email?: Partial<Record<Modulo, boolean>>
  /** permissão p/ notificações nativas do navegador (extra) */
  navegador?: boolean
  /** só manda e-mail a partir desta severidade (default 'normal' = tudo) */
  emailMinPrioridade?: Prioridade
}

export function parsePrefs(raw: string | null | undefined): NotifPrefs {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === "object" ? (v as NotifPrefs) : {}
  } catch {
    return {}
  }
}

/** Canal in-app: default LIGADO (só desliga se explicitamente false). */
export function permiteApp(prefs: NotifPrefs, modulo: Modulo | null | undefined): boolean {
  if (!modulo) return true
  return prefs.app?.[modulo] !== false
}

/** Canal e-mail: default DESLIGADO; precisa de opt-in E atingir o limiar de prioridade. */
export function permiteEmail(prefs: NotifPrefs, modulo: Modulo | null | undefined, prioridade: Prioridade): boolean {
  if (!modulo) return false
  if (prefs.email?.[modulo] !== true) return false
  const min = prefs.emailMinPrioridade ?? "normal"
  return prioridadeRank(prioridade) >= prioridadeRank(min)
}
