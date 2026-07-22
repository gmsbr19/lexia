// Projetos — read layer. SERVER ONLY. Derives progresso/saúde from each project's
// tasks (pure helpers in template.ts) and composes the productivity dashboard in
// the getDashboard style (parallel aggregates). Reuses the tarefas team-member +
// option queries so the pickers match the rest of the app.
import { prisma } from "@/lib/db"
import { getCasoOptions, getClienteOptions } from "@/lib/finance/queries"
import { addDiasISO, diasEntreISO, hojeISO, toISODate } from "@/lib/processos/datas"
import { toTeamMember } from "@/lib/tarefas/queries"
import type { TeamMember, VinculoRef } from "@/lib/tarefas/types"
import { getUsuariosAtivos } from "@/lib/users/queries"
import { contarAtrasadas, progressoProjeto, saudeProjeto } from "./template"
import type {
  DashAreaResumo,
  DashCargaMembro,
  DashDistribuicao,
  DashDistribuicaoLinha,
  DashGargalo,
  DashProjetoSaude,
  ProdutividadeDashboard,
  ProjetoDetail,
  ProjetoStatus,
  ProjetosDataset,
  ProjetoView,
  SecaoView,
  TemplateBase,
  TemplateView,
} from "./types"

const dISO = (d: Date | null): string | null => (d ? toISODate(d) : null)

function parseJsonStrArr(s: string | null | undefined): string[] {
  if (!s) return []
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

function vinculoDe(
  casoId: number | null,
  clienteId: number | null,
  casoTitulo?: string | null,
  clienteNome?: string | null,
): VinculoRef | null {
  if (casoId) return { tipo: "caso", id: casoId, nome: casoTitulo ?? `Caso #${casoId}` }
  if (clienteId) return { tipo: "cliente", id: clienteId, nome: clienteNome ?? `Cliente #${clienteId}` }
  return null
}

const projetoSelect = {
  id: true,
  nome: true,
  descricao: true,
  status: true,
  cor: true,
  icone: true,
  area: true,
  prazo: true,
  responsavelId: true,
  casoId: true,
  clienteId: true,
  templateOrigemId: true,
  ordem: true,
  caso: { select: { titulo: true } },
  cliente: { select: { nome: true } },
  tarefas: { select: { done: true, prazo: true } },
} as const

type ProjetoRow = {
  id: number
  nome: string
  descricao: string | null
  status: string
  cor: string | null
  icone: string | null
  area: string | null
  prazo: Date | null
  responsavelId: number | null
  casoId: number | null
  clienteId: number | null
  templateOrigemId: number | null
  ordem: number
  caso: { titulo: string } | null
  cliente: { nome: string } | null
  tarefas: { done: boolean; prazo: Date | null }[]
}

function toProjetoView(p: ProjetoRow, byId: Map<number, TeamMember>, hoje: string): ProjetoView {
  const tarefas = p.tarefas.map((t) => ({ done: t.done, prazo: dISO(t.prazo) }))
  const prazoISO = dISO(p.prazo)
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    status: p.status as ProjetoStatus,
    cor: p.cor,
    icone: p.icone,
    area: p.area,
    prazo: prazoISO,
    responsavel: p.responsavelId ? byId.get(p.responsavelId) ?? null : null,
    vinculo: vinculoDe(p.casoId, p.clienteId, p.caso?.titulo, p.cliente?.nome),
    templateOrigemId: p.templateOrigemId,
    progresso: progressoProjeto(tarefas),
    totalTarefas: tarefas.length,
    concluidas: tarefas.filter((t) => t.done).length,
    atrasadas: contarAtrasadas(tarefas, hoje),
    saude: saudeProjeto({ prazo: prazoISO, status: p.status }, tarefas, hoje),
    favorito: false,
    ordem: p.ordem,
  }
}

/** Dataset for the Projetos workspace (rail + canvas pickers). */
export async function getProjetosDataset(): Promise<ProjetosDataset> {
  const hoje = hojeISO()
  const [projetos, secoes, usuarios, casos, clientes] = await Promise.all([
    prisma.projeto.findMany({
      where: { excluidoEm: null },
      orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      select: projetoSelect,
    }),
    // Todas as seções dos projetos vivos (chapado; o cliente filtra por projetoId).
    prisma.projetoSecao.findMany({
      where: { projeto: { excluidoEm: null } },
      orderBy: [{ projetoId: "asc" }, { ordem: "asc" }],
      select: { id: true, projetoId: true, nome: true, cor: true, ordem: true },
    }),
    getUsuariosAtivos(),
    getCasoOptions(),
    getClienteOptions(),
  ])
  const socios = usuarios.map(toTeamMember)
  const byId = new Map(socios.map((m) => [m.id, m]))
  return {
    projetos: (projetos as unknown as ProjetoRow[]).map((p) => toProjetoView(p, byId, hoje)),
    secoes: secoes as SecaoView[],
    socios,
    casos,
    clientes,
  }
}

/** One project + the ids of its tasks (the canvas reads task bodies from the tarefas dataset). */
export async function getProjeto(id: number): Promise<ProjetoDetail | null> {
  const hoje = hojeISO()
  const [p, usuarios] = await Promise.all([
    prisma.projeto.findFirst({
      where: { id, excluidoEm: null },
      select: { ...projetoSelect, tarefas: { select: { id: true, done: true, prazo: true } } },
    }),
    getUsuariosAtivos(),
  ])
  if (!p) return null
  const byId = new Map(usuarios.map(toTeamMember).map((m) => [m.id, m]))
  const view = toProjetoView(p as unknown as ProjetoRow, byId, hoje)
  const tarefaIds = (p.tarefas as { id: number }[]).map((t) => t.id)
  return { ...view, tarefaIds }
}

// ── Templates ───────────────────────────────────────────────────────────────────
export async function getTemplates(): Promise<TemplateView[]> {
  const rows = await prisma.projetoTemplate.findMany({
    where: { excluidoEm: null },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      nome: true,
      descricao: true,
      area: true,
      cor: true,
      icone: true,
      ativo: true,
      _count: { select: { projetos: true } },
      itens: {
        orderBy: { ordem: "asc" },
        select: {
          id: true,
          titulo: true,
          descricao: true,
          prio: true,
          responsavelPlaceholder: true,
          offsetDias: true,
          base: true,
          dor: true,
          dod: true,
          ordem: true,
          secaoOrdem: true,
        },
      },
      secoes: {
        orderBy: { ordem: "asc" },
        select: { nome: true, cor: true, ordem: true },
      },
    },
  })
  return rows.map((t) => ({
    id: t.id,
    nome: t.nome,
    descricao: t.descricao,
    area: t.area,
    cor: t.cor,
    icone: t.icone,
    ativo: t.ativo,
    usos: t._count.projetos,
    itens: t.itens.map((it) => ({
      id: it.id,
      titulo: it.titulo,
      descricao: it.descricao,
      prio: it.prio,
      responsavelPlaceholder: it.responsavelPlaceholder,
      offsetDiasUteis: it.offsetDias,
      base: it.base as TemplateBase,
      dor: parseJsonStrArr(it.dor),
      dod: parseJsonStrArr(it.dod),
      ordem: it.ordem,
      secaoOrdem: it.secaoOrdem,
    })),
    secoes: t.secoes.map((s) => ({ nome: s.nome, cor: s.cor, ordem: s.ordem })),
  }))
}

// ── Productivity dashboard (visão de equipe) ──────────────────────────────────────
const rankSaude = (s: string): number => (s === "atrasado" ? 0 : s === "em_risco" ? 1 : 2)

export async function getProdutividadeDashboard(): Promise<ProdutividadeDashboard> {
  const hoje = hojeISO()
  const seteAtras = addDiasISO(hoje, -7)
  const trintaAtras = addDiasISO(hoje, -30)
  const [projetos, tarefas, usuarios] = await Promise.all([
    prisma.projeto.findMany({
      where: { excluidoEm: null },
      select: {
        id: true,
        nome: true,
        status: true,
        prazo: true,
        area: true,
        responsavelId: true,
        tarefas: { select: { done: true, prazo: true, concluidoEm: true } },
      },
    }),
    prisma.tarefa.findMany({
      select: {
        id: true,
        titulo: true,
        status: true,
        done: true,
        prazo: true,
        responsavelId: true,
        concluidoEm: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    getUsuariosAtivos(),
  ])
  const socios = usuarios.map(toTeamMember)
  const byId = new Map(socios.map((m) => [m.id, m]))

  // ── KPIs ──
  const projetosAtivos = projetos.filter((p) => p.status === "ativo").length
  const tarefasAtrasadas = tarefas.filter((t) => !t.done && dISO(t.prazo) && dISO(t.prazo)! < hoje).length

  const doneRecent = tarefas.filter((t) => t.done && t.concluidoEm && dISO(t.concluidoEm)! >= trintaAtras)
  const comPrazo = doneRecent.filter((t) => t.prazo)
  const noPrazo = comPrazo.filter((t) => dISO(t.concluidoEm)! <= dISO(t.prazo)!)
  const taxaNoPrazoPct = comPrazo.length ? Math.round((noPrazo.length / comPrazo.length) * 100) : null
  const cycles = doneRecent
    .map((t) => diasEntreISO(dISO(t.createdAt)!, dISO(t.concluidoEm)!))
    .filter((n) => Number.isFinite(n) && n >= 0)
  const cycleTimeDias = cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : null

  // ── Saúde por projeto ──
  const projSaude: DashProjetoSaude[] = projetos
    .map((p) => {
      const tt = p.tarefas.map((t) => ({ done: t.done, prazo: dISO(t.prazo) }))
      return {
        id: p.id,
        nome: p.nome,
        responsavel: p.responsavelId ? byId.get(p.responsavelId) ?? null : null,
        progresso: progressoProjeto(tt),
        saude: saudeProjeto({ prazo: dISO(p.prazo), status: p.status }, tt, hoje),
        atrasadas: contarAtrasadas(tt, hoje),
      }
    })
    .sort((a, b) => rankSaude(a.saude) - rankSaude(b.saude) || b.atrasadas - a.atrasadas)

  // ── Carga por pessoa ──
  const carga: DashCargaMembro[] = socios
    .map((m) => {
      const minhas = tarefas.filter((t) => t.responsavelId === m.id)
      return {
        membro: m,
        atribuidas: minhas.filter((t) => !t.done).length,
        concluidasSemana: minhas.filter((t) => t.done && t.concluidoEm && dISO(t.concluidoEm)! >= seteAtras).length,
        atrasadas: minhas.filter((t) => !t.done && dISO(t.prazo) && dISO(t.prazo)! < hoje).length,
      }
    })
    .sort((a, b) => b.atribuidas - a.atribuidas)

  // ── Distribuição futura: tarefas abertas (com prazo) por dia, por pessoa ──
  const HORIZONTE = 14
  const dias = Array.from({ length: HORIZONTE }, (_, i) => addDiasISO(hoje, i))
  const fimHorizonte = dias[dias.length - 1]
  const linhas: DashDistribuicaoLinha[] = socios
    .map((m) => {
      const abertas = tarefas.filter((t) => t.responsavelId === m.id && !t.done)
      const comPrazo = abertas.filter((t) => t.prazo)
      const counts = dias.map((d) => comPrazo.filter((t) => dISO(t.prazo) === d).length)
      const depois = comPrazo.filter((t) => dISO(t.prazo)! > fimHorizonte).length
      const semPrazo = abertas.length - comPrazo.length
      const total = counts.reduce((a, b) => a + b, 0) + depois
      return { membro: m, counts, depois, semPrazo, total }
    })
    .filter((l) => l.total > 0 || l.semPrazo > 0)
    .sort((a, b) => b.total - a.total)
  const distribuicao: DashDistribuicao = { dias, linhas }

  // ── Gargalos: tarefas paradas em doing/review (proxy: dias desde a última alteração) ──
  const gargalos: DashGargalo[] = tarefas
    .filter((t) => !t.done && (t.status === "doing" || t.status === "review"))
    .map((t) => ({
      tarefaId: t.id,
      titulo: t.titulo,
      status: t.status,
      diasParado: diasEntreISO(dISO(t.updatedAt)!, hoje),
      responsavel: t.responsavelId ? byId.get(t.responsavelId) ?? null : null,
    }))
    .filter((g) => g.diasParado >= 3)
    .sort((a, b) => b.diasParado - a.diasParado)
    .slice(0, 10)

  // ── Por área ──
  const areaSet = new Set(projetos.map((p) => p.area).filter((a): a is string => !!a))
  const porArea: DashAreaResumo[] = [...areaSet].map((area) => {
    const pp = projetos.filter((p) => p.area === area)
    const tt = pp.flatMap((p) => p.tarefas)
    return {
      area,
      projetosAtivos: pp.filter((p) => p.status === "ativo").length,
      tarefasAtrasadas: tt.filter((t) => !t.done && dISO(t.prazo) && dISO(t.prazo)! < hoje).length,
      tarefasConcluidas30d: tt.filter((t) => t.done && t.concluidoEm && dISO(t.concluidoEm)! >= trintaAtras).length,
    }
  }).sort((a, b) => b.projetosAtivos - a.projetosAtivos || b.tarefasAtrasadas - a.tarefasAtrasadas)

  return {
    kpis: { projetosAtivos, tarefasAtrasadas, taxaNoPrazoPct, cycleTimeDias },
    projetos: projSaude,
    carga,
    distribuicao,
    gargalos,
    porArea,
  }
}
