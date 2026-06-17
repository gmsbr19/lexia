"use client"

// Ícone, tom (cor semântica) e formatação de tempo de uma notificação.
// Compartilhado pelo sino, pelos toasts e pela página /notificações. Segue os
// design tokens do projeto (dourado reservado p/ a LexIA). Puro — sem hooks.
import type { CrmIconName } from "@/components/crm/crm-icons"
import { type Modulo, MODULO_LABEL, type Prioridade } from "@/lib/notificacoes/types"

const POR_TIPO: Record<string, CrmIconName> = {
  prazo: "flag",
  "prazo-proposto": "sparkles",
  publicacao: "inbox",
  compromisso: "calendar",
  tarefa: "check",
  lembrete: "clock",
  lexia: "sparkles",
  documento: "fileText",
  lead: "megaphone",
  captura: "alertTriangle",
}

const POR_MODULO: Record<Modulo, CrmIconName> = {
  tarefas: "listChecks",
  agenda: "calendar",
  processos: "scale",
  comercial: "megaphone",
  documentos: "fileText",
  ia: "sparkles",
  sistema: "alertTriangle",
}

export function iconeNotificacao(modulo: Modulo | null, tipo: string): CrmIconName {
  return POR_TIPO[tipo] ?? (modulo ? POR_MODULO[modulo] : "bell")
}

/** Rótulo curto do módulo (fallback "LexIA" quando sem módulo). */
export function rotuloModulo(modulo: Modulo | null): string {
  return modulo ? MODULO_LABEL[modulo] : "LexIA"
}

// Tom semântico → cor do ícone + preenchimento do tile. Dourado é assinatura da
// IA; vermelho/âmbar pela prioridade; o resto é neutro (sem inventar sucesso).
export type Tom = "crit" | "warn" | "ai" | "neutral"

export function tomNotificacao(n: { modulo: Modulo | null; tipo: string; prioridade: Prioridade }): Tom {
  if (n.modulo === "ia" || n.tipo === "lexia") return "ai"
  if (n.prioridade === "critica") return "crit"
  if (n.prioridade === "alta") return "warn"
  return "neutral"
}

export function coresTom(t: Tom): { fg: string; bg: string } {
  switch (t) {
    case "crit":
      return { fg: "var(--crit)", bg: "var(--crit-soft)" }
    case "warn":
      return { fg: "var(--warn)", bg: "var(--warn-soft)" }
    case "ai":
      return { fg: "var(--ai)", bg: "var(--ai-soft)" }
    default:
      return { fg: "var(--text-muted)", bg: "var(--bg-sunken)" }
  }
}

/** Tempo relativo curto: "agora", "há 3 min", "há 2 h", "ontem", "há 4 d". */
export function tempoRelativo(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ""
  const min = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (min < 1) return "agora"
  if (min < 60) return `há ${min} min`
  if (min < 1440) return `há ${Math.floor(min / 60)} h`
  if (min < 2880) return "ontem"
  return `há ${Math.floor(min / 1440)} d`
}

/** Período p/ agrupar na página — por dia de calendário local. */
export function bucketTempo(iso: string): "Hoje" | "Ontem" | "Anteriores" {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return "Anteriores"
  const now = new Date()
  const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (t >= inicioHoje) return "Hoje"
  if (t >= inicioHoje - 86_400_000) return "Ontem"
  return "Anteriores"
}
