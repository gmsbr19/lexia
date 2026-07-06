// LexIA · Chat — dados puros dos comandos "/" (Fase 7). Extraído de
// SlashCommands.tsx (que importa LexiaKit → .css.ts) para ficar testável em
// vitest puro sem o plugin do vanilla-extract — mesmo padrão de motion-data.ts.
import type { CrmIconName } from "@/components/crm/crm-icons"

export interface Comando {
  id: string
  icon: CrmIconName
  label: string
  desc: string
  template: string
}

export const COMANDOS: Comando[] = [
  { id: "minutar", icon: "fileText", label: "Minutar", desc: "Abrir editor de documento", template: "Minute um contrato de honorários para " },
  { id: "buscar", icon: "search", label: "Buscar", desc: "Clientes, processos…", template: "Busque " },
  { id: "resumir", icon: "list", label: "Resumir", desc: "Documento ou conversa", template: "Resuma " },
  { id: "lancar", icon: "banknote", label: "Lançar", desc: "Entrada ou saída", template: "Lance um " },
  { id: "agendar", icon: "calendarClock", label: "Agendar", desc: "Evento ou prazo", template: "Agende " },
]

export function filtrarComandos(query: string): Comando[] {
  const q = query.trim().toLowerCase()
  if (!q) return COMANDOS
  return COMANDOS.filter((c) => c.id.includes(q) || c.label.toLowerCase().includes(q))
}
