// Persisted dismissal / snooze for "suggestion" surfaces — the Próximo Passo
// queue, briefing actionables, casos sem fee, publicações a vincular and the
// consistency (saúde) reconciliation rows. Without this, a suggestion keeps
// "insisting" on every reload. Stored as ONE AppSetting JSON map keyed by a
// stable `chave` (e.g. "prazo:42", "semfee:7", "vinculo:13"); a snooze sets an
// `until` date that silently expires, a permanent dismiss sets `until: null`.
// SERVER ONLY.
import { addDiasISO, hojeISO } from "@/lib/lexia/agent/datas"
import { getSetting, setSetting } from "@/lib/settings"

const KEY = "sugestoes-dispensadas"
const DEFAULT_DIAS = 30

export interface DispensaEntry {
  until: string | null // ISO "YYYY-MM-DD"; null = permanente ("nunca mais")
  by: string | null
  at: string // ISO timestamp da dispensa
}
type DispensaMap = Record<string, DispensaEntry>

async function load(): Promise<DispensaMap> {
  return (await getSetting<DispensaMap>(KEY)) ?? {}
}

/** True while the entry is active: permanent, or within a still-valid snooze. */
function ativa(entry: DispensaEntry | undefined, hoje: string): boolean {
  if (!entry) return false
  if (entry.until === null) return true // permanente
  return entry.until >= hoje // soneca ainda válida (inclui o próprio dia)
}

/**
 * Dismiss a suggestion. `dias` omitted → snooze 30 days; `dias` = null or 0 →
 * permanent ("não sugerir novamente"); a positive number → snooze N days.
 */
export async function dispensar(
  chave: string,
  opts?: { dias?: number | null; by?: string | null },
): Promise<{ chave: string; until: string | null }> {
  const map = await load()
  // Prune expired snoozes here (the write path) — keeps the read path (dispensadas)
  // side-effect-free so it can't race-clobber a concurrent dismissal/restore.
  const hoje = hojeISO()
  for (const [k, v] of Object.entries(map)) if (!ativa(v, hoje)) delete map[k]
  const dias = opts?.dias
  const until = dias === null || dias === 0 ? null : addDiasISO(hoje, dias ?? DEFAULT_DIAS)
  map[chave] = { until, by: opts?.by ?? null, at: new Date().toISOString() }
  await setSetting(KEY, map)
  return { chave, until }
}

/** Undo a dismissal (restore the suggestion). */
export async function restaurar(chave: string): Promise<{ chave: string }> {
  const map = await load()
  if (chave in map) {
    delete map[chave]
    await setSetting(KEY, map)
  }
  return { chave }
}

/** Set of `chave` currently dismissed. Pure read (no write-back) — expired snoozes
 *  are simply filtered out here and pruned later by the next dispensar(). */
export async function dispensadas(): Promise<Set<string>> {
  const map = await load()
  const hoje = hojeISO()
  const out = new Set<string>()
  for (const [k, v] of Object.entries(map)) if (ativa(v, hoje)) out.add(k)
  return out
}

export async function estaDispensada(chave: string): Promise<boolean> {
  const map = await load()
  return ativa(map[chave], hojeISO())
}

export async function listarDispensadas(): Promise<(DispensaEntry & { chave: string })[]> {
  const map = await load()
  const hoje = hojeISO()
  return Object.entries(map)
    .filter(([, v]) => ativa(v, hoje))
    .map(([chave, v]) => ({ chave, ...v }))
}
