// Tarefas — registro de ações para "Desfazer". SERVER ONLY.
//
// Toda mutação do módulo roda numa transação com um `RegistroAcao`: ANTES de
// alterar qualquer coisa, a mutação pede para guardar o estado anterior das
// tarefas/ligações/projetos que vai tocar e anota o que CRIOU (tarefas, projetos,
// histórico, comentários, anexos). O snapshot é gravado em TarefaAcao e o
// POST /api/tarefas/acoes/[id]/desfazer restaura tudo em cascata — inclusive
// efeitos encadeados (concluir → reabre e volta as liberadas para "aguardando";
// criar projeto por modelo → apaga projeto, tarefas e ligações).
//
// Regras: só quem fez desfaz; vale por JANELA_MS; cada ação desfaz uma vez.
// Notificações já enviadas não são "desenviadas".
import { randomUUID } from "node:crypto"
import type { Prisma, PrismaClient, Tarefa } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"

export const JANELA_MS = 10 * 60 * 1000

type Tx = Prisma.TransactionClient | PrismaClient

// Campos restauráveis (tudo menos id/createdAt/updatedAt).
const CAMPOS_TAREFA = [
  "astreaId",
  "titulo",
  "status",
  "done",
  "prazo",
  "prazoFatal",
  "grupo",
  "aguardandoTexto",
  "notes",
  "checklist",
  "recur",
  "origem",
  "geradoPorApp",
  "responsavelId",
  "criadoPorId",
  "casoId",
  "processoId",
  "clienteId",
  "leadId",
  "projetoId",
  "recorrenteDeId",
  "concluidoEm",
] as const
const DATAS_TAREFA = new Set(["prazo", "concluidoEm", "createdAt"])

const CAMPOS_PROJETO = [
  "nomeCurto",
  "nome",
  "descricao",
  "cor",
  "area",
  "prazo",
  "responsavelId",
  "casoId",
  "clienteId",
  "modeloOrigemId",
  "arquivadoEm",
  "excluidoEm",
] as const
const DATAS_PROJETO = new Set(["prazo", "arquivadoEm", "excluidoEm"])

const CAMPOS_MODELO = ["nome", "area", "palavraGrupo", "sufixoGrupo", "papeis", "ordem", "excluidoEm"] as const
const CAMPOS_PASSO = ["chave", "titulo", "papelId", "diasAntes", "prazoFatal", "anteriores", "checklist", "ordem"] as const

type Json = Record<string, unknown>

interface RemovidaSnap {
  tarefa: Json // inclui id + createdAt
  comentarios: Json[]
  historico: Json[]
  anexos: Json[]
}

export interface Snapshot {
  tarefas: Json[] // estado ANTERIOR (update ao desfazer)
  ligacoesDe: number[] // ids cujas ligações (nos dois sentidos) são restauradas
  ligacoes: { anteriorId: number; seguinteId: number }[]
  criadas: number[]
  removidas: RemovidaSnap[]
  historico: number[]
  comentarios: number[]
  anexos: number[]
  projetos: Json[]
  projetosCriados: number[]
  anexosRemovidos: Json[] // restaurados com o mesmo id
  comentariosExcluidos: number[] // soft-delete desfeito
  comentariosEditados: { id: number; conteudo: string; editadoEm: string | null }[]
  modelos: { modelo: Json; passos: Json[] }[] // modelo + passos ANTES da alteração
  modelosCriados: number[]
}

const vazio = (): Snapshot => ({
  tarefas: [],
  ligacoesDe: [],
  ligacoes: [],
  criadas: [],
  removidas: [],
  historico: [],
  comentarios: [],
  anexos: [],
  projetos: [],
  projetosCriados: [],
  anexosRemovidos: [],
  comentariosExcluidos: [],
  comentariosEditados: [],
  modelos: [],
  modelosCriados: [],
})

function serializar(row: Record<string, unknown>): Json {
  const out: Json = {}
  for (const [k, v] of Object.entries(row)) out[k] = v instanceof Date ? v.toISOString() : v
  return out
}

function reviver(obj: Json, datas: Set<string>): Json {
  const out: Json = {}
  for (const [k, v] of Object.entries(obj)) out[k] = datas.has(k) && typeof v === "string" ? new Date(v) : v
  return out
}

function pick(obj: Json, campos: readonly string[]): Json {
  const out: Json = {}
  for (const c of campos) if (c in obj) out[c] = obj[c]
  return out
}

export class RegistroAcao {
  private snap = vazio()
  private tarefasGuardadas = new Set<number>()
  private ligacoesGuardadas = new Set<number>()
  private projetosGuardados = new Set<number>()

  constructor(
    private tx: Tx,
    private autorId: number | null,
  ) {}

  /** Guarda o estado atual (ANTES da alteração) das tarefas. Idempotente por id. */
  async guardarTarefas(ids: number[]): Promise<void> {
    const novos = [...new Set(ids)].filter((id) => !this.tarefasGuardadas.has(id) && !this.snap.criadas.includes(id))
    if (!novos.length) return
    const rows = await this.tx.tarefa.findMany({ where: { id: { in: novos } } })
    for (const r of rows) {
      this.tarefasGuardadas.add(r.id)
      this.snap.tarefas.push(serializar({ id: r.id, ...pick(r as unknown as Json, CAMPOS_TAREFA) }))
    }
  }

  /** Guarda as ligações (nos dois sentidos) das tarefas — antes de ligar/desligar. */
  async guardarLigacoes(ids: number[]): Promise<void> {
    const novos = [...new Set(ids)].filter((id) => !this.ligacoesGuardadas.has(id))
    if (!novos.length) return
    const rows = await this.tx.tarefaLigacao.findMany({
      where: { OR: [{ anteriorId: { in: novos } }, { seguinteId: { in: novos } }] },
      select: { anteriorId: true, seguinteId: true },
    })
    for (const id of novos) {
      this.ligacoesGuardadas.add(id)
      this.snap.ligacoesDe.push(id)
    }
    const chave = (l: { anteriorId: number; seguinteId: number }) => `${l.anteriorId}>${l.seguinteId}`
    const ja = new Set(this.snap.ligacoes.map(chave))
    for (const l of rows) if (!ja.has(chave(l))) this.snap.ligacoes.push(l)
  }

  async guardarProjeto(id: number): Promise<void> {
    if (this.projetosGuardados.has(id) || this.snap.projetosCriados.includes(id)) return
    const p = await this.tx.projeto.findUnique({ where: { id } })
    if (!p) return
    this.projetosGuardados.add(id)
    this.snap.projetos.push(serializar({ id: p.id, ...pick(p as unknown as Json, CAMPOS_PROJETO) }))
  }

  /** Guarda uma tarefa que vai ser EXCLUÍDA, com tudo que pendura nela. */
  async guardarRemocao(id: number): Promise<void> {
    await this.guardarLigacoes([id])
    const [t, comentarios, historico, anexos] = await Promise.all([
      this.tx.tarefa.findUnique({ where: { id } }),
      this.tx.tarefaComentario.findMany({ where: { tarefaId: id } }),
      this.tx.tarefaHistorico.findMany({ where: { tarefaId: id } }),
      this.tx.tarefaAnexo.findMany({ where: { tarefaId: id } }),
    ])
    if (!t) return
    this.snap.removidas.push({
      tarefa: serializar(t as unknown as Json),
      comentarios: comentarios.map((c) => serializar(c as unknown as Json)),
      historico: historico.map((h) => serializar(h as unknown as Json)),
      anexos: anexos.map((a) => serializar(a as unknown as Json)),
    })
  }

  /** Guarda um modelo de projeto (com os passos) antes de editá-lo/excluí-lo. */
  async guardarModelo(id: number): Promise<void> {
    if (this.snap.modelos.some((m) => m.modelo.id === id) || this.snap.modelosCriados.includes(id)) return
    const m = await this.tx.projetoModelo.findUnique({ where: { id }, include: { passos: { orderBy: { ordem: "asc" } } } })
    if (!m) return
    this.snap.modelos.push({
      modelo: serializar({ id: m.id, ...pick(m as unknown as Json, CAMPOS_MODELO) }),
      passos: m.passos.map((p) => pick(p as unknown as Json, CAMPOS_PASSO)),
    })
  }
  modeloCriado(id: number): void {
    this.snap.modelosCriados.push(id)
  }

  criada(id: number): void {
    this.snap.criadas.push(id)
  }
  projetoCriado(id: number): void {
    this.snap.projetosCriados.push(id)
  }
  historico(ids: number[]): void {
    this.snap.historico.push(...ids)
  }
  comentario(id: number): void {
    this.snap.comentarios.push(id)
  }
  anexo(id: number): void {
    this.snap.anexos.push(id)
  }
  async guardarAnexoRemovido(id: number): Promise<void> {
    const a = await this.tx.tarefaAnexo.findUnique({ where: { id } })
    if (a) this.snap.anexosRemovidos.push(serializar(a as unknown as Json))
  }
  comentarioExcluido(id: number): void {
    this.snap.comentariosExcluidos.push(id)
  }
  comentarioEditado(c: { id: number; conteudo: string; editadoEm: Date | null }): void {
    this.snap.comentariosEditados.push({ id: c.id, conteudo: c.conteudo, editadoEm: c.editadoEm?.toISOString() ?? null })
  }

  /** Grava o registro e devolve o id da ação (para o botão "Desfazer"). */
  async salvar(descricao: string): Promise<string> {
    const id = randomUUID()
    await this.tx.tarefaAcao.create({
      data: { id, autorId: this.autorId, descricao: descricao.slice(0, 300), snapshot: JSON.stringify(this.snap) },
    })
    return id
  }
}

/** Restaura o estado anterior de uma ação. Lança UserError se não for possível. */
export async function desfazerAcao(id: string, autorId: number | null): Promise<{ descricao: string }> {
  const acao = await prisma.tarefaAcao.findUnique({ where: { id } })
  if (!acao) throw new UserError("Nada para desfazer")
  if (acao.desfeitaEm) throw new UserError("Essa ação já foi desfeita")
  if (acao.autorId != null && acao.autorId !== autorId) throw new UserError("Só quem fez a ação pode desfazê-la")
  if (Date.now() - acao.createdAt.getTime() > JANELA_MS) throw new UserError("Não é mais possível desfazer")

  const s = { ...vazio(), ...(JSON.parse(acao.snapshot) as Partial<Snapshot>) }

  await prisma.$transaction(async (tx) => {
    // 1) o que a ação criou some (cascata leva ligações/histórico/comentários/anexos)
    if (s.criadas.length) await tx.tarefa.deleteMany({ where: { id: { in: s.criadas } } })
    if (s.projetosCriados.length) {
      // Tarefas acrescentadas ao projeto DEPOIS da ação (por outra ação) ficam "Sem
      // projeto": ligações só existem dentro de um projeto, então as delas caem, e
      // quem só aguardava por ligação volta para "a fazer".
      const orfas = (
        await tx.tarefa.findMany({ where: { projetoId: { in: s.projetosCriados } }, select: { id: true } })
      ).map((t) => t.id)
      if (orfas.length) {
        await tx.tarefaLigacao.deleteMany({ where: { OR: [{ anteriorId: { in: orfas } }, { seguinteId: { in: orfas } }] } })
        await tx.tarefa.updateMany({ where: { id: { in: orfas }, status: "wait", aguardandoTexto: null }, data: { status: "todo" } })
        await tx.tarefa.updateMany({ where: { id: { in: orfas } }, data: { projetoId: null, grupo: null } })
      }
      await tx.projeto.deleteMany({ where: { id: { in: s.projetosCriados } } })
    }
    // 2) projetos voltam ao estado anterior (antes das tarefas, por causa das FKs)
    for (const p of s.projetos) {
      const { id: pid, ...rest } = reviver(p, DATAS_PROJETO)
      await tx.projeto.updateMany({ where: { id: pid as number }, data: rest as Prisma.ProjetoUpdateManyMutationInput })
    }
    // 2b) modelos: os criados saem da lista (soft); os alterados voltam com os passos
    if (s.modelosCriados.length) {
      await tx.projetoModelo.updateMany({ where: { id: { in: s.modelosCriados } }, data: { excluidoEm: new Date() } })
    }
    for (const { modelo, passos } of s.modelos) {
      const { id: mid, ...rest } = reviver(modelo, new Set(["excluidoEm"]))
      await tx.projetoModelo.updateMany({ where: { id: mid as number }, data: rest as Prisma.ProjetoModeloUpdateManyMutationInput })
      await tx.projetoModeloPasso.deleteMany({ where: { modeloId: mid as number } })
      if (passos.length) {
        await tx.projetoModeloPasso.createMany({
          data: passos.map((p) => ({ ...p, modeloId: mid as number })) as unknown as Prisma.ProjetoModeloPassoCreateManyInput[],
        })
      }
    }
    // 3) tarefas excluídas voltam com o mesmo id e tudo que pendurava nelas
    for (const r of s.removidas) {
      const t = reviver(r.tarefa, DATAS_TAREFA) as unknown as Tarefa
      const existe = await tx.tarefa.findUnique({ where: { id: t.id }, select: { id: true } })
      if (existe) continue
      await tx.tarefa.create({ data: t as unknown as Prisma.TarefaUncheckedCreateInput })
      if (r.comentarios.length) {
        await tx.tarefaComentario.createMany({
          data: r.comentarios.map((c) => reviver(c, new Set(["createdAt", "updatedAt", "editadoEm", "excluidoEm"]))) as unknown as Prisma.TarefaComentarioCreateManyInput[],
          skipDuplicates: true,
        })
      }
      if (r.historico.length) {
        await tx.tarefaHistorico.createMany({
          data: r.historico.map((h) => reviver(h, new Set(["createdAt"]))) as unknown as Prisma.TarefaHistoricoCreateManyInput[],
          skipDuplicates: true,
        })
      }
      if (r.anexos.length) {
        await tx.tarefaAnexo.createMany({
          data: r.anexos.map((a) => reviver(a, new Set(["createdAt"]))) as unknown as Prisma.TarefaAnexoCreateManyInput[],
          skipDuplicates: true,
        })
      }
    }
    // 4) tarefas alteradas voltam ao estado anterior
    for (const t of s.tarefas) {
      const { id: tid, ...rest } = reviver(t, DATAS_TAREFA)
      await tx.tarefa.updateMany({ where: { id: tid as number }, data: rest as Prisma.TarefaUncheckedUpdateManyInput })
    }
    // 5) ligações das tarefas tocadas voltam exatamente ao que eram
    if (s.ligacoesDe.length) {
      await tx.tarefaLigacao.deleteMany({
        where: { OR: [{ anteriorId: { in: s.ligacoesDe } }, { seguinteId: { in: s.ligacoesDe } }] },
      })
      const ids = [...new Set(s.ligacoes.flatMap((l) => [l.anteriorId, l.seguinteId]))]
      const vivas = new Set(
        (await tx.tarefa.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((t) => t.id),
      )
      const restaurar = s.ligacoes.filter((l) => vivas.has(l.anteriorId) && vivas.has(l.seguinteId))
      if (restaurar.length) await tx.tarefaLigacao.createMany({ data: restaurar, skipDuplicates: true })
    }
    // 6) linhas criadas pela ação (histórico/comentários/anexos em tarefas que ficaram)
    if (s.historico.length) await tx.tarefaHistorico.deleteMany({ where: { id: { in: s.historico } } })
    if (s.comentarios.length) await tx.tarefaComentario.deleteMany({ where: { id: { in: s.comentarios } } })
    if (s.anexos.length) await tx.tarefaAnexo.deleteMany({ where: { id: { in: s.anexos } } })
    if (s.anexosRemovidos.length) {
      await tx.tarefaAnexo.createMany({
        data: s.anexosRemovidos.map((a) => reviver(a, new Set(["createdAt"]))) as unknown as Prisma.TarefaAnexoCreateManyInput[],
        skipDuplicates: true,
      })
    }
    if (s.comentariosExcluidos.length) {
      await tx.tarefaComentario.updateMany({ where: { id: { in: s.comentariosExcluidos } }, data: { excluidoEm: null } })
    }
    for (const c of s.comentariosEditados) {
      await tx.tarefaComentario.updateMany({
        where: { id: c.id },
        data: { conteudo: c.conteudo, editadoEm: c.editadoEm ? new Date(c.editadoEm) : null },
      })
    }

    await tx.tarefaAcao.update({ where: { id }, data: { desfeitaEm: new Date() } })
  })

  return { descricao: acao.descricao }
}

/** Limpeza oportunista: registros antigos não servem mais para nada. */
export async function limparAcoesAntigas(): Promise<void> {
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000)
  await prisma.tarefaAcao.deleteMany({ where: { createdAt: { lt: limite } } }).catch(() => {})
}

