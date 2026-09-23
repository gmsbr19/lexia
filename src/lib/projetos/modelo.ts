// Modelos de projeto — núcleo PURO (sem Prisma). O assistente (cliente) usa para
// a prévia e o servidor (POST /api/projetos/de-modelo) usa para gerar de verdade:
// 1 tarefa por grupo × passo, prazo = prazo do grupo − diasAntes, e as ligações do
// modelo DENTRO de cada grupo. Passos com anteriores nascem "aguardando".
import { addDays, compareISO } from "@/lib/datas/util"
import type { PassoModelo, PapelModelo } from "@/lib/tarefas/types"

export interface GrupoWizard {
  nome: string
  prazo: string // "YYYY-MM-DD"
}

export interface ModeloBase {
  palavraGrupo: string
  sufixoGrupo: string
  papeis: PapelModelo[]
  passos: PassoModelo[]
}

const pad2 = (n: number) => String(n).padStart(2, "0")

/** Nome pré-gerado do grupo i (0-based): "Protocolo 01 · 1º RI Taubaté". */
export function nomeGrupo(m: Pick<ModeloBase, "palavraGrupo" | "sufixoGrupo">, i: number): string {
  return `${m.palavraGrupo} ${pad2(i + 1)}${m.sufixoGrupo}`
}

/** Grupos iniciais do assistente: prazos a cada 2 semanas a partir de hoje + 21 dias. */
export function gruposPadrao(m: ModeloBase, n: number, hoje: string): GrupoWizard[] {
  return Array.from({ length: n }, (_, i) => ({ nome: nomeGrupo(m, i), prazo: addDays(hoje, 21 + i * 14) }))
}

/** Aumenta/diminui a quantidade (1–12) preservando os grupos já editados. */
export function ajustarGrupos(atual: GrupoWizard[], n: number, m: ModeloBase, hoje: string): GrupoWizard[] {
  const alvo = Math.max(1, Math.min(12, n))
  if (alvo <= atual.length) return atual.slice(0, alvo)
  return [...atual, ...gruposPadrao(m, alvo, hoje).slice(atual.length)]
}

export interface TarefaGerada {
  chave: string // chave local única: "<índice do grupo>:<chave do passo>"
  grupo: string
  titulo: string
  responsavelId: number | null
  prazo: string
  prazoFatal: boolean
  status: "todo" | "wait"
  anteriores: string[] // chaves locais
  checklist: string[]
}

/** Só as anteriores que existem no modelo (defensivo contra JSON editado à mão). */
function anterioresValidas(passos: PassoModelo[]): Map<string, string[]> {
  const chaves = new Set(passos.map((p) => p.chave))
  return new Map(passos.map((p) => [p.chave, p.anteriores.filter((a) => a !== p.chave && chaves.has(a))]))
}

export function instanciarModelo(
  m: ModeloBase,
  grupos: GrupoWizard[],
  responsaveis: Record<string, number | null>,
): TarefaGerada[] {
  const antes = anterioresValidas(m.passos)
  const out: TarefaGerada[] = []
  grupos.forEach((g, gi) => {
    for (const p of m.passos) {
      const ants = antes.get(p.chave) ?? []
      out.push({
        chave: `${gi}:${p.chave}`,
        grupo: g.nome.trim(),
        titulo: p.titulo,
        responsavelId: p.papelId ? (responsaveis[p.papelId] ?? null) : null,
        prazo: addDays(g.prazo, -Math.max(0, p.diasAntes)),
        prazoFatal: p.prazoFatal,
        status: ants.length ? "wait" : "todo",
        anteriores: ants.map((a) => `${gi}:${a}`),
        checklist: p.checklist.filter((c) => c.trim()),
      })
    }
  })
  return out
}

export interface ResumoModelo {
  grupos: number
  tarefas: number
  ligacoes: number
  prazoMin: string | null
  prazoMax: string | null
}
export function resumoModelo(m: ModeloBase, grupos: GrupoWizard[]): ResumoModelo {
  const geradas = instanciarModelo(m, grupos, {})
  const prazos = geradas.map((t) => t.prazo).sort(compareISO)
  return {
    grupos: grupos.length,
    tarefas: geradas.length,
    ligacoes: geradas.reduce((n, t) => n + t.anteriores.length, 0),
    prazoMin: prazos[0] ?? null,
    prazoMax: prazos[prazos.length - 1] ?? null,
  }
}

/** Texto do prazo relativo de um passo: "no prazo do grupo" / "1 dia antes" / "N dias antes". */
export function textoDiasAntes(n: number): string {
  if (n <= 0) return "no prazo do grupo"
  return n === 1 ? "1 dia antes" : `${n} dias antes`
}

/** O editor não aceita passos que esperariam uns pelos outros. Devolve a chave de um passo em ciclo, ou null. */
export function cicloNoModelo(passos: PassoModelo[]): string | null {
  const antes = anterioresValidas(passos)
  const estado = new Map<string, 1 | 2>() // 1 = visitando, 2 = ok
  const visita = (k: string): boolean => {
    const s = estado.get(k)
    if (s === 2) return false
    if (s === 1) return true
    estado.set(k, 1)
    for (const a of antes.get(k) ?? []) if (visita(a)) return true
    estado.set(k, 2)
    return false
  }
  for (const p of passos) if (visita(p.chave)) return p.chave
  return null
}
