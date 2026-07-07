// Construção PURA das mensagens de notificação de tarefas (sem Prisma/env).
// A `mensagem` é o único carregador de "quem/quando": ela alimenta tanto o
// in-app (Notificacao.mensagem) quanto o e-mail de evento (mesmo texto no
// título). Enriquecê-la aqui melhora os dois canais de uma vez.
import { hojeISO, toISODate } from "@/lib/processos/datas"

const TZ = "America/Sao_Paulo"

/** "DD/MM" a partir de um Date (dia São Paulo). */
function ddmm(d: Date): string {
  const [, m, dd] = toISODate(d).split("-") // YYYY-MM-DD
  return `${dd}/${m}`
}

/** "HH:MM" — relógio de parede São Paulo. */
function hhmm(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

/** Nova tarefa / (re)atribuição — quem delegou + prazo quando houver. */
export function msgTarefaAtribuida(p: {
  atorNome?: string | null
  titulo: string
  prazo?: Date | null
}): string {
  const base = p.atorNome
    ? `${p.atorNome} delegou uma tarefa para você: "${p.titulo}"`
    : `Nova tarefa para você: "${p.titulo}"`
  return p.prazo ? `${base} · vence ${ddmm(p.prazo)}` : base
}

/** Conclusão — quem concluiu + quando (hoje às HH:MM ou DD/MM às HH:MM). */
export function msgTarefaConcluida(p: {
  atorNome?: string | null
  titulo: string
  concluidoEm?: Date | null
  /** "hoje" (YYYY-MM-DD) p/ testes determinísticos; default = agora em SP. */
  hoje?: string
}): string {
  const base = p.atorNome
    ? `${p.atorNome} concluiu a tarefa: "${p.titulo}"`
    : `Tarefa concluída: "${p.titulo}"`
  if (!p.concluidoEm) return base
  const hoje = p.hoje ?? hojeISO()
  const quando =
    toISODate(p.concluidoEm) === hoje
      ? `hoje às ${hhmm(p.concluidoEm)}`
      : `${ddmm(p.concluidoEm)} às ${hhmm(p.concluidoEm)}`
  return `${base} · ${quando}`
}
