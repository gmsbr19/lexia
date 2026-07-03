// Tarefas — pure date/label helpers + the quick-add natural-language parser.
// Ported from the design's tasks-data.jsx, but TODAY is the real current day
// (the prototype pinned it to a fixed date) and @/# tokens resolve against the
// active users + the DYNAMIC projetos passed in.
import type { TaskPrio, TeamMember } from "@/lib/tarefas/types"

export const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]
export const WD_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]
export const MO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
export const MONTHS_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

// "now" anchored to local noon today (avoids UTC off-by-one at day edges).
function todayNoon(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0)
}
export const tIso = (dt: Date): string =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
export const TODAY = (): string => tIso(todayNoon())
export const tRel = (n: number): string => {
  const d = todayNoon()
  d.setDate(d.getDate() + n)
  return tIso(d)
}
export const tParse = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d, 12)
}
export const tDiff = (s: string): number => Math.round((tParse(s).getTime() - todayNoon().getTime()) / 86400000)

// short scheduled-date label: Hoje / Amanhã / Ontem / qua / 18 jun
export function dataLabel(s: string | null): string | null {
  if (!s) return null
  const n = tDiff(s)
  if (n === 0) return "Hoje"
  if (n === 1) return "Amanhã"
  if (n === -1) return "Ontem"
  const d = tParse(s)
  if (n > 1 && n < 7) return WD[d.getDay()]
  return `${d.getDate()} ${MO[d.getMonth()]}`
}

export type PrazoTone = "neutro" | "vencido" | "urgente" | "proximo"
export interface PrazoInfo {
  label: string
  tone: PrazoTone
  days: number
}
// prazo label + urgency tone
export function prazoInfo(s: string | null, done?: boolean): PrazoInfo | null {
  if (!s) return null
  const n = tDiff(s)
  const d = tParse(s)
  const label = n === 0 ? "hoje" : n === 1 ? "amanhã" : n === -1 ? "ontem" : `${d.getDate()} ${MO[d.getMonth()]}`
  let tone: PrazoTone = "neutro"
  if (done) tone = "neutro"
  else if (n < 0) tone = "vencido"
  else if (n <= 1) tone = "urgente"
  else if (n <= 3) tone = "proximo"
  return { label, tone, days: n }
}

// sort: hora, then priority, then prazo
export function byTime<T extends { hora?: string | null; prio: number; prazo?: string | null }>(a: T, b: T): number {
  if ((a.hora || "99") !== (b.hora || "99")) return (a.hora || "99").localeCompare(b.hora || "99")
  if (a.prio !== b.prio) return a.prio - b.prio
  return (a.prazo || "9999").localeCompare(b.prazo || "9999")
}

// ── quick-add natural-language parser ────────────────────────────────────────
// "Protocolar recurso amanhã 14h #trabalhista @joão !alta"

// Tokens the quick-add UI highlights inline (mirror technique). Kept in sync
// with what parseQuickAdd actually consumes. NOTE: JS `\b` is ASCII-only — after
// a trailing "ã" there is no word boundary, so "amanhã" needs a lookahead.
export const QUICKADD_TOKEN_RE = /(#[\wà-ú-]+|@[\wà-ú-]+|![\wà-ú-]+|\b\d{1,2}[:h]\d{2}\b|\b\d{1,2}h\b|\bhoje\b|\bamanh[ãa](?![\wà-ú]))/gi
export const isQuickAddToken = (s: string): boolean => {
  const m = s.match(new RegExp(QUICKADD_TOKEN_RE.source, "i"))
  return !!m && m[0] === s
}

/** Accent-insensitive lowercase fold (imported data mixes spellings). */
const fold = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

export interface QuickAddResult {
  titulo: string
  projetoId: number | null
  responsavelId: number | null
  prio: TaskPrio | null
  data: string | null
  hora: string | null
  assigneeAmbiguous: boolean
}

export function parseQuickAdd(
  raw: string,
  ctx: { socios: TeamMember[]; projetos: { id: number; nome: string }[] },
): QuickAddResult {
  let text = ` ${raw} `
  const res: QuickAddResult = {
    titulo: "",
    projetoId: null,
    responsavelId: null,
    prio: null,
    data: null,
    hora: null,
    assigneeAmbiguous: false,
  }

  // priority  !urgente !alta !média !p1..p4
  const pm = text.match(/!\s*(urgente|alta|m[ée]dia|media|normal|p[1-4])/i)
  if (pm) {
    const v = pm[1].toLowerCase()
    res.prio = (v === "urgente" || v === "p1" ? 1 : v === "alta" || v === "p2" ? 2 : v === "p4" || v === "normal" ? 4 : 3) as TaskPrio
    text = text.replace(pm[0], " ")
  }
  // project  #token — accent-insensitive substring of the dynamic project name
  const projm = text.match(/#(\S+)/)
  if (projm) {
    const q = fold(projm[1])
    if (q) {
      const p = ctx.projetos.find((p) => fold(p.nome).includes(q))
      if (p) res.projetoId = p.id
    }
    text = text.replace(projm[0], " ")
  }
  // assignee @token — unique prefix of first name (or substring of full name),
  // accent-insensitive on both sides ("@joao" acha "João")
  const asm = text.match(/@(\S+)/)
  if (asm) {
    const q = fold(asm[1]).replace(/[^a-z]/g, "")
    if (q) {
      const matches = ctx.socios.filter(
        (m) => fold(m.first).startsWith(q) || fold(m.nome).includes(q),
      )
      if (matches.length === 1) res.responsavelId = matches[0].id
      else if (matches.length > 1) res.assigneeAmbiguous = true
    }
    text = text.replace(asm[0], " ")
  }
  // time  14h / 14:30 / 9h
  const tm = text.match(/\b(\d{1,2})\s*[:h]\s*(\d{2})?\b/)
  if (tm) {
    const hh = String(Math.min(23, +tm[1])).padStart(2, "0")
    const mm = (tm[2] || "00").padStart(2, "0")
    res.hora = `${hh}:${mm}`
    text = text.replace(tm[0], " ")
  }
  // date keywords — "depois de amanhã" ANTES de "amanhã" (senão o prefixo
  // "depois de" sobraria no título); `(?![\wà-ú])` no lugar do `\b` final
  // (ASCII-only) para o "ã" acentuado casar.
  const dk: [RegExp, number][] = [
    [/\bhoje\b/i, 0],
    [/\bdepois de amanh[ãa](?![\wà-ú])/i, 2],
    [/\bamanh[ãa](?![\wà-ú])/i, 1],
  ]
  for (const [re, n] of dk) {
    if (re.test(text)) {
      res.data = tRel(n)
      text = text.replace(re, " ")
      break
    }
  }
  if (!res.data) {
    const wdm = text.match(/\b(seg|ter|qua|qui|sex|s[áa]b|dom)\w*/i)
    if (wdm) {
      const key = wdm[1].toLowerCase().slice(0, 3).replace("sá", "sáb").slice(0, 3)
      const idx = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].indexOf(key)
      if (idx >= 0) {
        let n = (idx - todayNoon().getDay() + 7) % 7
        if (n === 0) n = 7
        res.data = tRel(n)
        text = text.replace(wdm[0], " ")
      }
    }
  }
  if (res.hora && !res.data) res.data = tRel(0)

  res.titulo = text.replace(/\s+/g, " ").trim()
  return res
}
