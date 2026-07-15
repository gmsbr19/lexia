// Lógica PURA das preferências de notificação (sem Prisma) — testável isolada,
// mesmo padrão de src/lib/clientes/cobranca-core.ts.
import type { Modulo, Prioridade } from "./types"
import { prioridadeRank } from "./types"

export interface NotifPrefs {
  /** canal in-app (toast/sino/histórico) por módulo — default LIGADO */
  app?: Partial<Record<Modulo, boolean>>
  /** canal e-mail por módulo — default LIGADO (opt-out) */
  email?: Partial<Record<Modulo, boolean>>
  /** permissão p/ notificações nativas do navegador (extra) */
  navegador?: boolean
  /** só manda e-mail a partir desta severidade (default 'normal' = tudo) */
  emailMinPrioridade?: Prioridade
  /** relatório diário de tarefas por e-mail — default LIGADO (opt-out) */
  relatorioDiario?: boolean
  /** horário do relatório diário, "HH:MM" — default "08:00" (casa por hora) */
  relatorioHora?: string
  /**
   * Cópia de supervisão ao sócio quando OUTRA pessoa conclui uma tarefa que ele
   * não criou — default LIGADO (opt-out). Só vale quando a regra do escritório
   * (AppSetting `notificacoes.tarefaConcluidaGestores`) está ligada; desligar o
   * módulo `tarefas` em `app`/`email` continua mandando em tudo.
   */
  tarefasConclusaoEquipe?: boolean
}

/** Conclusões de tarefas da equipe: default LIGADO (só desliga se explicitamente false). */
export function querConclusoesEquipe(prefs: NotifPrefs): boolean {
  return prefs.tarefasConclusaoEquipe !== false
}

/** Relatório diário: default LIGADO (só desliga se explicitamente false). */
export function querRelatorioDiario(prefs: NotifPrefs): boolean {
  return prefs.relatorioDiario !== false
}

/** Hora configurada do relatório (0–23); default 8h. Ignora os minutos. */
export function horaRelatorio(prefs: NotifPrefs): number {
  const raw = prefs.relatorioHora ?? "08:00"
  const h = Number.parseInt(raw.slice(0, 2), 10)
  return Number.isInteger(h) && h >= 0 && h <= 23 ? h : 8
}

/** Deve enviar o relatório agora? (opt-in ligado E a hora configurada casa). */
export function deveEnviarRelatorio(prefs: NotifPrefs, horaAtual: number): boolean {
  return querRelatorioDiario(prefs) && horaRelatorio(prefs) === horaAtual
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

/** Canal e-mail: default LIGADO (só desliga se explicitamente false); precisa atingir o limiar de prioridade. */
export function permiteEmail(prefs: NotifPrefs, modulo: Modulo | null | undefined, prioridade: Prioridade): boolean {
  if (!modulo) return false
  if (prefs.email?.[modulo] === false) return false
  const min = prefs.emailMinPrioridade ?? "normal"
  return prioridadeRank(prioridade) >= prioridadeRank(min)
}
