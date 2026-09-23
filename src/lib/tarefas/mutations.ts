// Tarefas — camada de escrita. SERVER ONLY. O backend é a FONTE DA VERDADE das
// regras (as mesmas funções de ./regras.ts que o cliente usa para a prévia
// otimista). Toda mutação:
//   • roda numa transação com um RegistroAcao (→ "Desfazer");
//   • grava linhas legíveis em TarefaHistorico ("Movida para Em andamento"…);
//   • devolve `acaoId` (+ o que a tela precisa para o aviso).
// Notificações são disparadas DEPOIS da transação, fire-and-forget (uma falha
// de notificação nunca quebra a mutação).
import { randomUUID } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { addDays, isValidISO } from "@/lib/datas/util"
import { parseRecur, proximaOcorrencia } from "@/lib/datas/recorrencia"
import { notificarSuaVez, notificarTarefaAtribuida, notificarTarefaConcluida } from "@/lib/notificacoes/triggers"
import { RegistroAcao } from "./acoes"
import { fromDate, optId, optStr, parseArr, reqStr, toDate } from "./_input"
import { posicaoDepois } from "./filtros"
import {
  aguardandoRotulo,
  criariaCiclo,
  dataCurta,
  deslocamentoCadeia,
  hojeSP,
  indexar,
  liberadasAoConcluir,
  pendentes,
  prazoPadrao,
  precisaConfirmarInicio,
  precisaTextoAguardando,
  statusAoDesligar,
  statusAoLigar,
  tituloCopia,
} from "./regras"
import { isStatus, statusLabel, type ChecklistItem, type TaskStatus } from "./types"

type Tx = Prisma.TransactionClient

export const TX_OPTS = { timeout: 20_000, maxWait: 10_000 }

// ── ator (quem está agindo) ──────────────────────────────────────────────────
export interface Ator {
  id: number | null
  email: string | null
  nome: string // primeiro nome ("Concluída por Thiago")
}

export async function resolverAtor(email?: string | null): Promise<Ator> {
  if (!email) return { id: null, email: null, nome: "LexIA" }
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true, nome: true } })
  return { id: u?.id ?? null, email, nome: u?.nome.trim().split(/\s+/)[0] ?? email }
}

// ── helpers internos ─────────────────────────────────────────────────────────
const GRAFO_SELECT = {
  id: true,
  titulo: true,
  status: true,
  prazo: true,
  prazoFatal: true,
  grupo: true,
  responsavelId: true,
  aguardandoTexto: true,
  projetoId: true,
  projetoRef: { select: { excluidoEm: true } },
  anteriores: { select: { anteriorId: true } },
} satisfies Prisma.TarefaSelect

export interface NoGrafo {
  id: number
  titulo: string
  status: TaskStatus
  prazo: string
  prazoFatal: boolean
  grupo: string | null
  responsavelId: number | null
  aguardandoTexto: string | null
  projetoId: number | null
  anteriores: number[]
}

function toNo(r: Prisma.TarefaGetPayload<{ select: typeof GRAFO_SELECT }>): NoGrafo {
  return {
    id: r.id,
    titulo: r.titulo,
    status: isStatus(r.status) ? r.status : "todo",
    prazo: fromDate(r.prazo)!,
    prazoFatal: r.prazoFatal,
    grupo: r.grupo,
    responsavelId: r.responsavelId,
    aguardandoTexto: r.aguardandoTexto,
    // projeto excluído (soft-delete) conta como "Sem projeto" — igual à leitura do quadro
    projetoId: r.projetoId != null && r.projetoRef && !r.projetoRef.excluidoEm ? r.projetoId : null,
    anteriores: r.anteriores.map((a) => a.anteriorId),
  }
}

// Namespace do advisory lock por projeto (pg_advisory_xact_lock(ns, projetoId)).
const LOCK_GRAFO = 7_331

/**
 * As tarefas que podem estar ligadas às `ids` (ligações só existem dentro do
 * projeto). ANTES de ler, trava o(s) projeto(s) até o fim da transação: duas
 * conclusões/ligações simultâneas no mesmo projeto são serializadas e a segunda
 * enxerga o estado já gravado pela primeira (sem liberação perdida, sem ciclo).
 */
async function grafo(tx: Tx, ids: number[]): Promise<NoGrafo[]> {
  const base = await tx.tarefa.findMany({ where: { id: { in: ids } }, select: { projetoId: true } })
  const projetos = [...new Set(base.map((b) => b.projetoId).filter((p): p is number => p != null))].sort((a, b) => a - b)
  for (const p of projetos) await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_GRAFO}::int, ${p}::int)`
  const rows = await tx.tarefa.findMany({
    where: { OR: [{ id: { in: ids } }, ...(projetos.length ? [{ projetoId: { in: projetos } }] : [])] },
    select: GRAFO_SELECT,
  })
  return rows.map(toNo)
}

export async function historico(tx: Tx, reg: RegistroAcao, ator: Ator, itens: { tarefaId: number; texto: string }[]) {
  if (!itens.length) return
  const rows = await tx.tarefaHistorico.createManyAndReturn({
    data: itens.map((i) => ({ tarefaId: i.tarefaId, texto: i.texto.slice(0, 300), autorId: ator.id })),
    select: { id: true },
  })
  reg.historico(rows.map((r) => r.id))
}

async function nomesUsuarios(tx: Tx): Promise<(id: number | null) => string> {
  const us = await tx.user.findMany({ select: { id: true, nome: true } })
  const m = new Map(us.map((u) => [u.id, u.nome.trim().split(/\s+/)[0] ?? u.nome]))
  return (id) => (id == null ? "sem responsável" : (m.get(id) ?? "sem responsável"))
}

async function projetoVivo(tx: Tx, id: number | null | undefined) {
  if (id == null) return null
  const p = await tx.projeto.findFirst({
    where: { id, excluidoEm: null },
    select: { id: true, nomeCurto: true, clienteId: true },
  })
  if (!p) throw new UserError("Projeto não encontrado")
  return p
}

async function validarUsuario(tx: Tx, id: number | null): Promise<number | null> {
  if (id == null) return null
  const u = await tx.user.findUnique({ where: { id }, select: { id: true } })
  if (!u) throw new UserError("Responsável não encontrado")
  return id
}

async function validarCliente(tx: Tx, id: number | null): Promise<{ id: number; nome: string } | null> {
  if (id == null) return null
  const c = await tx.cliente.findUnique({ where: { id }, select: { id: true, nome: true } })
  if (!c) throw new UserError("Cliente não encontrado")
  return c
}

function recurValida(v: string | null | undefined): string | null {
  const t = optStr(v)
  return t && parseRecur(t) ? t : null
}

function novoItem(texto: string): ChecklistItem {
  return { id: randomUUID().slice(0, 8), texto: texto.trim(), marcado: false }
}

function checklistDe(raw: string): ChecklistItem[] {
  return parseArr<ChecklistItem>(raw).filter((c) => c && typeof c.texto === "string")
}

// ── criar ────────────────────────────────────────────────────────────────────
export interface NovaTarefa {
  titulo: string
  projetoId?: number | null
  grupo?: string | null
  /** ausente = quem cria; null = sem responsável */
  responsavelId?: number | null
  clienteId?: number | null
  prazo?: string | null // ausente/null = sexta da semana (prazoPadrao)
  prazoFatal?: boolean
  descricao?: string | null
  checklist?: string[]
  recur?: string | null
  casoId?: number | null
  processoId?: number | null
  leadId?: number | null
  status?: TaskStatus
  origem?: string
  recorrenteDeId?: number | null
}

async function inserir(tx: Tx, reg: RegistroAcao, ator: Ator, n: NovaTarefa, hoje: string) {
  const projeto = await projetoVivo(tx, optId(n.projetoId))
  const prazo = n.prazo && isValidISO(n.prazo) ? n.prazo : prazoPadrao(hoje)
  const responsavelId = n.responsavelId === undefined ? ator.id : await validarUsuario(tx, optId(n.responsavelId))
  const cliente = projeto?.clienteId ? null : await validarCliente(tx, optId(n.clienteId))
  const t = await tx.tarefa.create({
    data: {
      astreaId: `app-tarefa-${randomUUID()}`,
      titulo: reqStr(n.titulo, "título").slice(0, 300),
      status: n.status ?? "todo",
      done: false,
      prazo: toDate(prazo)!,
      prazoFatal: !!n.prazoFatal,
      grupo: projeto ? optStr(n.grupo) : null,
      notes: optStr(n.descricao),
      checklist: JSON.stringify((n.checklist ?? []).filter((c) => c.trim()).map(novoItem)),
      recur: recurValida(n.recur),
      origem: n.origem ?? "manual",
      geradoPorApp: true,
      responsavelId,
      criadoPorId: ator.id,
      projetoId: projeto?.id ?? null,
      clienteId: cliente?.id ?? null,
      casoId: optId(n.casoId),
      processoId: optId(n.processoId),
      leadId: optId(n.leadId),
      recorrenteDeId: optId(n.recorrenteDeId),
    },
    select: { id: true, titulo: true, responsavelId: true, prazo: true, grupo: true },
  })
  reg.criada(t.id)
  return t
}

export async function criarTarefa(n: NovaTarefa, ator: Ator) {
  const hoje = hojeSP()
  const r = await prisma.$transaction(async (tx) => {
    const reg = new RegistroAcao(tx, ator.id)
    const t = await inserir(tx, reg, ator, n, hoje)
    await historico(tx, reg, ator, [{ tarefaId: t.id, texto: "Tarefa criada" }])
    return { t, acaoId: await reg.salvar(`Criada: ${t.titulo}`) }
  }, TX_OPTS)
  if (r.t.responsavelId && r.t.responsavelId !== ator.id) {
    void notificarTarefaAtribuida({
      tarefaId: r.t.id,
      titulo: r.t.titulo,
      responsavelId: r.t.responsavelId,
      actorEmail: ator.email,
      prazo: r.t.prazo,
    })
  }
  return { id: r.t.id, prazo: fromDate(r.t.prazo)!, acaoId: r.acaoId }
}

/** Criação em lote (LexIA): uma transação, uma ação, sem notificação por tarefa. */
export async function criarTarefas(lista: NovaTarefa[], ator: Ator) {
  if (!lista.length) return { ids: [] as number[], acaoId: null as string | null }
  const hoje = hojeSP()
  return prisma.$transaction(async (tx) => {
    const reg = new RegistroAcao(tx, ator.id)
    const ids: number[] = []
    for (const n of lista) ids.push((await inserir(tx, reg, ator, n, hoje)).id)
    await historico(tx, reg, ator, ids.map((id) => ({ tarefaId: id, texto: "Tarefa criada" })))
    return { ids, acaoId: await reg.salvar(`${ids.length} tarefas criadas`) }
  }, TX_OPTS)
}

// ── duplicar ─────────────────────────────────────────────────────────────────
/**
 * "Duplicar": nova tarefa com os mesmos dados — projeto, grupo, responsável,
 * cliente, prazo, prazo fatal, descrição, checklist (desmarcado), repetição e
 * vínculos — e as mesmas "só começa depois de" (as que ELA libera, não: isso
 * mudaria outras tarefas). Nasce "a fazer", ou "aguardando" se alguma anterior
 * ainda está aberta. Comentários, histórico e anexos não vêm junto. Na ordem
 * manual de quem duplicou, entra logo abaixo da original.
 */
export async function duplicarTarefa(id: number, ator: Ator) {
  const hoje = hojeSP()
  const r = await prisma.$transaction(async (tx) => {
    const nos = await grafo(tx, [id]) // trava o projeto: as ligações copiadas refletem o estado atual
    const map = indexar(nos)
    const o = map.get(id)
    const t = await tx.tarefa.findUnique({ where: { id } })
    if (!o || !t) throw new UserError("Tarefa não encontrada")
    // ligações só existem dentro de um projeto (vivo); a cópia só RECEBE ligações → nunca forma ciclo
    const anteriores =
      o.projetoId == null
        ? []
        : o.anteriores.map((a) => map.get(a)).filter((a): a is NoGrafo => !!a && a.projetoId === o.projetoId)
    const reg = new RegistroAcao(tx, ator.id)
    const nova = await inserir(
      tx,
      reg,
      ator,
      {
        titulo: tituloCopia(t.titulo),
        projetoId: o.projetoId,
        grupo: t.grupo,
        responsavelId: t.responsavelId,
        clienteId: t.clienteId,
        prazo: o.prazo,
        prazoFatal: t.prazoFatal,
        descricao: t.notes,
        checklist: checklistDe(t.checklist).map((c) => c.texto),
        recur: t.recur,
        casoId: t.casoId,
        processoId: t.processoId,
        leadId: t.leadId,
        status: anteriores.some((a) => a.status !== "done") ? "wait" : "todo",
        origem: "duplicada",
      },
      hoje,
    )
    if (anteriores.length) {
      await tx.tarefaLigacao.createMany({ data: anteriores.map((a) => ({ anteriorId: a.id, seguinteId: nova.id })) })
    }
    await historico(tx, reg, ator, [{ tarefaId: nova.id, texto: `Duplicada de: ${t.titulo}` }])
    // Ordem manual de quem duplicou (preferência pessoal: fora do Desfazer — some junto com a tarefa).
    let ordem: number | null = null
    if (ator.id != null) {
      const minhas = await tx.tarefaOrdem.findMany({ where: { userId: ator.id }, select: { tarefaId: true, ordem: true } })
      const daOriginal = minhas.find((m) => m.tarefaId === id)
      if (daOriginal) {
        ordem = posicaoDepois(daOriginal.ordem, minhas.map((m) => m.ordem))
        await tx.tarefaOrdem.create({ data: { userId: ator.id, tarefaId: nova.id, ordem } })
      }
    }
    return { nova, ordem, acaoId: await reg.salvar(`Duplicada: ${t.titulo}`) }
  }, TX_OPTS)
  if (r.nova.responsavelId && r.nova.responsavelId !== ator.id) {
    void notificarTarefaAtribuida({
      tarefaId: r.nova.id,
      titulo: r.nova.titulo,
      responsavelId: r.nova.responsavelId,
      actorEmail: ator.email,
      prazo: r.nova.prazo,
    })
  }
  return { id: r.nova.id, titulo: r.nova.titulo, ordem: r.ordem, acaoId: r.acaoId }
}

// ── editar campos ────────────────────────────────────────────────────────────
export interface TarefaPatch {
  titulo?: string
  descricao?: string | null
  projetoId?: number | null
  grupo?: string | null
  responsavelId?: number | null
  clienteId?: number | null
  prazoFatal?: boolean
  recur?: string | null
}

export async function atualizarTarefa(id: number, patch: TarefaPatch, ator: Ator) {
  const r = await prisma.$transaction(async (tx) => {
    const antes = await tx.tarefa.findUnique({
      where: { id },
      select: {
        titulo: true,
        notes: true,
        projetoId: true,
        grupo: true,
        responsavelId: true,
        clienteId: true,
        prazoFatal: true,
        recur: true,
        status: true,
        aguardandoTexto: true,
        prazo: true,
        projetoRef: { select: { excluidoEm: true } },
      },
    })
    if (!antes) throw new UserError("Tarefa não encontrada")
    // projeto excluído (soft-delete) conta como "Sem projeto"
    const projetoVivoAntes = antes.projetoId != null && antes.projetoRef && !antes.projetoRef.excluidoEm ? antes.projetoId : null
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarTarefas([id])
    const data: Prisma.TarefaUncheckedUpdateInput = {}
    const linhas: { tarefaId: number; texto: string }[] = []
    const add = (texto: string, tarefaId = id) => linhas.push({ tarefaId, texto })

    if (patch.titulo !== undefined) {
      const v = reqStr(patch.titulo, "título").slice(0, 300)
      if (v !== antes.titulo) {
        data.titulo = v
        add("Título alterado")
      }
    }
    if (patch.descricao !== undefined) {
      const v = optStr(patch.descricao)
      if (v !== antes.notes) {
        data.notes = v
        add("Descrição alterada")
      }
    }
    if (patch.prazoFatal !== undefined && patch.prazoFatal !== antes.prazoFatal) {
      data.prazoFatal = patch.prazoFatal
      add(patch.prazoFatal ? "Marcada como prazo fatal" : "Prazo fatal removido")
    }
    if (patch.recur !== undefined) {
      const v = recurValida(patch.recur)
      if (v !== antes.recur) {
        data.recur = v
        add(v ? `Repetição: ${v}` : "Repetição removida")
      }
    }
    let novoResponsavel: number | null | undefined
    if (patch.responsavelId !== undefined) {
      const v = await validarUsuario(tx, optId(patch.responsavelId))
      if (v !== antes.responsavelId) {
        data.responsavelId = v
        novoResponsavel = v
        const nome = await nomesUsuarios(tx)
        add(v ? `Responsável: ${nome(v)}` : "Sem responsável")
      }
    }

    // Projeto: trocar remove TODAS as ligações da tarefa e zera o grupo.
    let projetoEfetivo = projetoVivoAntes
    let clienteDoProjeto: number | null = null
    if (patch.projetoId !== undefined && optId(patch.projetoId) !== projetoVivoAntes) {
      const novo = await projetoVivo(tx, optId(patch.projetoId))
      projetoEfetivo = novo?.id ?? null
      clienteDoProjeto = novo?.clienteId ?? null
      data.projetoId = projetoEfetivo
      data.grupo = null
      if (clienteDoProjeto) data.clienteId = null // não duplica o cliente do projeto na tarefa
      add(novo ? `Projeto: ${novo.nomeCurto}` : "Sem projeto")

      await reg.guardarLigacoes([id])
      const ligs = await tx.tarefaLigacao.findMany({
        where: { OR: [{ anteriorId: id }, { seguinteId: id }] },
        select: { anteriorId: true, seguinteId: true },
      })
      if (ligs.length) {
        const seguintes = ligs.filter((l) => l.anteriorId === id).map((l) => l.seguinteId)
        await reg.guardarTarefas(seguintes)
        await tx.tarefaLigacao.deleteMany({ where: { OR: [{ anteriorId: id }, { seguinteId: id }] } })
        if (antes.status === "wait" && !antes.aguardandoTexto) data.status = "todo"
        // seguintes que só esperavam por esta voltam para "a fazer"
        const nos = await grafo(tx, seguintes)
        const map = indexar(nos)
        for (const sid of seguintes) {
          const s = map.get(sid)
          if (!s) continue
          const ns = statusAoDesligar(s, pendentes(s, map).length)
          if (ns !== s.status) await tx.tarefa.update({ where: { id: sid }, data: { status: ns } })
          add(`Ligação removida: ${antes.titulo}`, sid)
        }
      }
    } else if (projetoEfetivo != null) {
      const p = await tx.projeto.findUnique({ where: { id: projetoEfetivo }, select: { clienteId: true } })
      clienteDoProjeto = p?.clienteId ?? null
    }

    if (patch.grupo !== undefined && data.grupo === undefined) {
      const v = projetoEfetivo != null ? optStr(patch.grupo) : null
      if (v !== antes.grupo) {
        data.grupo = v
        add(v ? `Grupo: ${v}` : "Sem grupo")
      }
    }
    // Cliente: com cliente no projeto, o da tarefa é herdado (somente leitura).
    if (patch.clienteId !== undefined && !clienteDoProjeto) {
      const c = await validarCliente(tx, optId(patch.clienteId))
      if ((c?.id ?? null) !== antes.clienteId) {
        data.clienteId = c?.id ?? null
        add(c ? `Cliente: ${c.nome}` : "Cliente removido")
      }
    }

    if (!Object.keys(data).length) return { acaoId: null as string | null, titulo: antes.titulo, novoResponsavel, prazo: antes.prazo }
    await tx.tarefa.update({ where: { id }, data })
    await historico(tx, reg, ator, linhas)
    const acaoId = await reg.salvar(linhas.find((l) => l.tarefaId === id)?.texto ?? "Tarefa alterada")
    return { acaoId, titulo: (data.titulo as string | undefined) ?? antes.titulo, novoResponsavel, prazo: antes.prazo }
  }, TX_OPTS)

  if (r.novoResponsavel && r.novoResponsavel !== ator.id) {
    void notificarTarefaAtribuida({
      tarefaId: id,
      titulo: r.titulo,
      responsavelId: r.novoResponsavel,
      actorEmail: ator.email,
      prazo: r.prazo,
    })
  }
  return { acaoId: r.acaoId }
}

// ── prazo (com ajuste em cadeia) ─────────────────────────────────────────────
export async function definirPrazo(id: number, prazo: string, ajustarSeguintes: boolean, ator: Ator) {
  if (!isValidISO(prazo)) throw new UserError("Prazo inválido")
  return prisma.$transaction(async (tx) => {
    const nos = await grafo(tx, [id])
    const t = nos.find((n) => n.id === id)
    if (!t) throw new UserError("Tarefa não encontrada")
    if (t.prazo === prazo) return { acaoId: null as string | null, ajustadas: 0 }
    const desloc = deslocamentoCadeia(id, prazo, nos)
    const mover = ajustarSeguintes && desloc.delta !== 0 ? desloc.moveis : []
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarTarefas([id, ...mover])
    await tx.tarefa.update({ where: { id }, data: { prazo: toDate(prazo)! } })
    const linhas = [{ tarefaId: id, texto: `Prazo alterado para ${dataCurta(prazo)}` }]
    const map = indexar(nos)
    for (const sid of mover) {
      const s = map.get(sid)!
      const novo = addDays(s.prazo, desloc.delta)
      await tx.tarefa.update({ where: { id: sid }, data: { prazo: toDate(novo)! } })
      linhas.push({ tarefaId: sid, texto: `Prazo ajustado para ${dataCurta(novo)}` })
    }
    await historico(tx, reg, ator, linhas)
    return { acaoId: await reg.salvar(`Prazo: ${dataCurta(prazo)}`), ajustadas: mover.length }
  }, TX_OPTS)
}

// ── status ───────────────────────────────────────────────────────────────────
export type ResultadoStatus =
  | { acaoId: string | null }
  | { precisaConfirmacao: true; texto: string }
  | { precisaTexto: true }

export async function moverStatus(
  id: number,
  status: TaskStatus,
  opts: { aguardandoTexto?: string | null; confirmarInicio?: boolean },
  ator: Ator,
): Promise<ResultadoStatus | ResultadoConclusao> {
  if (status === "done") return concluirTarefa(id, ator)
  return prisma.$transaction(async (tx) => {
    const nos = await grafo(tx, [id])
    const map = indexar(nos)
    const t = map.get(id)
    if (!t) throw new UserError("Tarefa não encontrada")
    const texto = optStr(opts.aguardandoTexto)
    if (t.status === status && !(status === "wait" && texto && texto !== t.aguardandoTexto)) return { acaoId: null }

    if (precisaConfirmarInicio(t, map, status) && !opts.confirmarInicio) {
      const nome = await nomesUsuarios(tx)
      return { precisaConfirmacao: true as const, texto: aguardandoRotulo(t, map, nome) ?? "" }
    }
    let aguardando: string | null = null
    if (status === "wait") {
      if (precisaTextoAguardando(t, map, "wait")) {
        if (!texto) return { precisaTexto: true as const }
        aguardando = texto
      } else {
        aguardando = pendentes(t, map).length ? null : (texto ?? t.aguardandoTexto)
      }
    }
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarTarefas([id])
    // Sair de "Aguardando" limpa o terceiro; reabrir limpa a conclusão.
    await tx.tarefa.update({
      where: { id },
      data: { status, done: false, concluidoEm: null, aguardandoTexto: aguardando },
    })
    const msg = `Movida para ${statusLabel(status)}`
    await historico(tx, reg, ator, [{ tarefaId: id, texto: aguardando ? `${msg}: ${aguardando}` : msg }])
    return { acaoId: await reg.salvar(msg) }
  }, TX_OPTS)
}

// ── concluir (libera seguintes, "Sua vez", repetição) ────────────────────────
export interface Liberada {
  id: number
  titulo: string
  grupo: string | null
  responsavelId: number | null
}
export interface ResultadoConclusao {
  acaoId: string | null
  liberadas: Liberada[]
  semResponsavel: Liberada[]
  repeticaoId: number | null
}

export async function concluirTarefa(id: number, ator: Ator): Promise<ResultadoConclusao> {
  const hoje = hojeSP()
  const r = await prisma.$transaction(async (tx) => {
    const nos = await grafo(tx, [id]) // trava o projeto antes de ler o estado
    const t = await tx.tarefa.findUnique({ where: { id } })
    if (!t) throw new UserError("Tarefa não encontrada")
    if (t.status === "done") {
      return { acaoId: null, liberadas: [] as Liberada[], repeticaoId: null as number | null, t, concluidoEm: t.concluidoEm }
    }
    const liberadas = liberadasAoConcluir(id, nos)
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarTarefas([id, ...liberadas.map((l) => l.id)])
    const concluidoEm = new Date()
    await tx.tarefa.update({
      where: { id },
      data: { status: "done", done: true, concluidoEm, aguardandoTexto: null },
    })
    const linhas = [{ tarefaId: id, texto: `Concluída por ${ator.nome}` }]
    if (liberadas.length) {
      await tx.tarefa.updateMany({ where: { id: { in: liberadas.map((l) => l.id) } }, data: { status: "todo" } })
      for (const l of liberadas) linhas.push({ tarefaId: l.id, texto: `Liberada: ${t.titulo} concluída` })
    }

    // Repetição: gera a próxima (uma vez só — guarda por recorrenteDeId aberto).
    let repeticaoId: number | null = null
    if (t.recur && parseRecur(t.recur)) {
      const aberta = await tx.tarefa.findFirst({ where: { recorrenteDeId: id, done: false }, select: { id: true } })
      const prox = proximaOcorrencia(t.recur, fromDate(t.prazo)!, hoje)
      if (!aberta && prox) {
        const nova = await inserir(
          tx,
          reg,
          ator,
          {
            titulo: t.titulo,
            projetoId: t.projetoId != null ? (await tx.projeto.findFirst({ where: { id: t.projetoId, excluidoEm: null }, select: { id: true } }))?.id ?? null : null,
            grupo: t.grupo,
            responsavelId: t.responsavelId,
            clienteId: t.clienteId,
            prazo: prox,
            prazoFatal: t.prazoFatal,
            descricao: t.notes,
            checklist: checklistDe(t.checklist).map((c) => c.texto),
            recur: t.recur,
            casoId: t.casoId,
            processoId: t.processoId,
            leadId: t.leadId,
            origem: "recorrencia",
            recorrenteDeId: id,
          },
          hoje,
        )
        repeticaoId = nova.id
        linhas.push({ tarefaId: nova.id, texto: "Tarefa criada (repetição)" })
      }
    }
    await historico(tx, reg, ator, linhas)
    const acaoId = await reg.salvar(`Concluída: ${t.titulo}`)
    return {
      acaoId,
      liberadas: liberadas.map((l) => ({ id: l.id, titulo: l.titulo, grupo: l.grupo, responsavelId: l.responsavelId })),
      repeticaoId,
      t,
      concluidoEm,
    }
  }, TX_OPTS)

  if (r.acaoId) {
    void notificarTarefaConcluida({
      tarefaId: id,
      titulo: r.t.titulo,
      criadoPorId: r.t.criadoPorId,
      actorEmail: ator.email,
      concluidoEm: r.concluidoEm,
    })
    for (const l of r.liberadas) {
      if (l.responsavelId) {
        void notificarSuaVez({ tarefaId: l.id, titulo: l.titulo, grupo: l.grupo, responsavelId: l.responsavelId, actorEmail: ator.email })
      }
    }
  }
  return {
    acaoId: r.acaoId,
    liberadas: r.liberadas.filter((l) => l.responsavelId != null),
    semResponsavel: r.liberadas.filter((l) => l.responsavelId == null),
    repeticaoId: r.repeticaoId,
  }
}

/** "Quem cuida do próximo passo?" — atribui e avisa "Sua vez". */
export async function atribuirProximoPasso(id: number, responsavelId: number, ator: Ator) {
  const r = await prisma.$transaction(async (tx) => {
    const t = await tx.tarefa.findUnique({ where: { id }, select: { titulo: true, grupo: true } })
    if (!t) throw new UserError("Tarefa não encontrada")
    await validarUsuario(tx, responsavelId)
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarTarefas([id])
    await tx.tarefa.update({ where: { id }, data: { responsavelId } })
    const nome = await nomesUsuarios(tx)
    await historico(tx, reg, ator, [{ tarefaId: id, texto: `Responsável: ${nome(responsavelId)}` }])
    return { t, acaoId: await reg.salvar(`Responsável: ${nome(responsavelId)}`) }
  }, TX_OPTS)
  void notificarSuaVez({ tarefaId: id, titulo: r.t.titulo, grupo: r.t.grupo, responsavelId, actorEmail: ator.email })
  return { acaoId: r.acaoId }
}

// ── excluir ──────────────────────────────────────────────────────────────────
export async function excluirTarefa(id: number, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const nos = await grafo(tx, [id])
    const map = indexar(nos)
    const t = map.get(id)
    if (!t) throw new UserError("Tarefa não encontrada")
    const reg = new RegistroAcao(tx, ator.id)
    const seguintes = nos.filter((n) => n.anteriores.includes(id))
    await reg.guardarRemocao(id)
    await reg.guardarTarefas(seguintes.map((s) => s.id))
    await tx.tarefa.delete({ where: { id } })
    // seguintes que só esperavam por esta voltam para "a fazer"
    for (const s of seguintes) {
      const restantes = pendentes(s, map).filter((p) => p.id !== id).length
      const ns = statusAoDesligar(s, restantes)
      if (ns !== s.status) await tx.tarefa.update({ where: { id: s.id }, data: { status: ns } })
    }
    await historico(
      tx,
      reg,
      ator,
      seguintes.map((s) => ({ tarefaId: s.id, texto: `Ligação removida: ${t.titulo} excluída` })),
    )
    return { acaoId: await reg.salvar(`Excluída: ${t.titulo}`) }
  }, TX_OPTS)
}

// ── ligações ─────────────────────────────────────────────────────────────────
export const MSG_CICLO = "Não é possível: as tarefas ficariam esperando uma pela outra."
export const MSG_PROJETOS = "Ligações só entre tarefas do mesmo projeto."

export async function ligar(anteriorId: number, seguinteId: number, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const nos = await grafo(tx, [anteriorId, seguinteId])
    const map = indexar(nos)
    const a = map.get(anteriorId)
    const b = map.get(seguinteId)
    if (!a || !b) throw new UserError("Tarefa não encontrada")
    if (a.id === b.id) throw new UserError(MSG_CICLO)
    if (a.projetoId == null || a.projetoId !== b.projetoId) throw new UserError(MSG_PROJETOS)
    if (b.anteriores.includes(a.id)) throw new UserError("Essas tarefas já estão ligadas.")
    if (criariaCiclo(a.id, b.id, map)) throw new UserError(MSG_CICLO)
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarLigacoes([b.id])
    await reg.guardarTarefas([b.id])
    await tx.tarefaLigacao.create({ data: { anteriorId: a.id, seguinteId: b.id } })
    const ns = statusAoLigar(b, a)
    if (ns !== b.status) await tx.tarefa.update({ where: { id: b.id }, data: { status: ns } })
    await historico(tx, reg, ator, [{ tarefaId: b.id, texto: `Só começa depois de: ${a.titulo}` }])
    return { acaoId: await reg.salvar("Ligação criada"), anterior: a.titulo, seguinte: b.titulo }
  }, TX_OPTS)
}

export async function desligar(anteriorId: number, seguinteId: number, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const existe = await tx.tarefaLigacao.findUnique({
      where: { anteriorId_seguinteId: { anteriorId, seguinteId } },
      select: { anterior: { select: { titulo: true } } },
    })
    if (!existe) throw new UserError("Ligação não encontrada")
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarLigacoes([seguinteId])
    await reg.guardarTarefas([seguinteId])
    await tx.tarefaLigacao.delete({ where: { anteriorId_seguinteId: { anteriorId, seguinteId } } })
    const nos = await grafo(tx, [seguinteId])
    const map = indexar(nos)
    const b = map.get(seguinteId)
    if (b) {
      const ns = statusAoDesligar(b, pendentes(b, map).length)
      if (ns !== b.status) await tx.tarefa.update({ where: { id: b.id }, data: { status: ns } })
    }
    await historico(tx, reg, ator, [{ tarefaId: seguinteId, texto: `Ligação removida: ${existe.anterior.titulo}` }])
    return { acaoId: await reg.salvar("Ligação removida") }
  }, TX_OPTS)
}

// ── checklist ────────────────────────────────────────────────────────────────
async function comChecklist(
  id: number,
  ator: Ator,
  fn: (itens: ChecklistItem[], titulo: string) => { itens: ChecklistItem[]; texto: string },
) {
  return prisma.$transaction(async (tx) => {
    const t = await tx.tarefa.findUnique({ where: { id }, select: { checklist: true, titulo: true } })
    if (!t) throw new UserError("Tarefa não encontrada")
    const { itens, texto } = fn(checklistDe(t.checklist), t.titulo)
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarTarefas([id])
    await tx.tarefa.update({ where: { id }, data: { checklist: JSON.stringify(itens) } })
    await historico(tx, reg, ator, [{ tarefaId: id, texto }])
    return { acaoId: await reg.salvar(texto) }
  }, TX_OPTS)
}

export function adicionarItem(id: number, texto: string, ator: Ator) {
  const t = reqStr(texto, "item").slice(0, 300)
  return comChecklist(id, ator, (itens) => {
    if (itens.length >= 60) throw new UserError("Checklist cheio")
    return { itens: [...itens, novoItem(t)], texto: "Item adicionado ao checklist" }
  })
}

export function editarItem(id: number, itemId: string, patch: { texto?: string; marcado?: boolean }, ator: Ator) {
  return comChecklist(id, ator, (itens) => {
    const item = itens.find((i) => i.id === itemId)
    if (!item) throw new UserError("Item não encontrado")
    let texto = "Item alterado"
    const novos = itens.map((i) => {
      if (i.id !== itemId) return i
      const n = { ...i }
      if (patch.texto !== undefined) n.texto = reqStr(patch.texto, "item").slice(0, 300)
      if (patch.marcado !== undefined && patch.marcado !== i.marcado) {
        n.marcado = patch.marcado
        texto = patch.marcado ? "Item marcado" : "Item desmarcado"
      }
      return n
    })
    return { itens: novos, texto }
  })
}

export function removerItem(id: number, itemId: string, ator: Ator) {
  return comChecklist(id, ator, (itens) => {
    if (!itens.some((i) => i.id === itemId)) throw new UserError("Item não encontrado")
    return { itens: itens.filter((i) => i.id !== itemId), texto: "Item removido do checklist" }
  })
}

/** "Transformar em tarefa": nova tarefa com o texto do item (mesmo projeto/grupo/responsável). */
export async function itemParaTarefa(id: number, itemId: string, ator: Ator) {
  const hoje = hojeSP()
  return prisma.$transaction(async (tx) => {
    const t = await tx.tarefa.findUnique({
      where: { id },
      select: { titulo: true, checklist: true, projetoId: true, grupo: true, responsavelId: true, clienteId: true, projetoRef: { select: { excluidoEm: true } } },
    })
    if (!t) throw new UserError("Tarefa não encontrada")
    const itens = checklistDe(t.checklist)
    const item = itens.find((i) => i.id === itemId)
    if (!item) throw new UserError("Item não encontrado")
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarTarefas([id])
    const projetoOk = t.projetoId != null && t.projetoRef && !t.projetoRef.excluidoEm
    const nova = await inserir(
      tx,
      reg,
      ator,
      {
        titulo: item.texto,
        projetoId: projetoOk ? t.projetoId : null,
        grupo: projetoOk ? t.grupo : null,
        responsavelId: t.responsavelId,
        clienteId: t.clienteId,
        origem: "checklist",
      },
      hoje,
    )
    await tx.tarefa.update({ where: { id }, data: { checklist: JSON.stringify(itens.filter((i) => i.id !== itemId)) } })
    await historico(tx, reg, ator, [{ tarefaId: nova.id, texto: `Criada a partir do checklist de ${t.titulo}` }])
    return { id: nova.id, acaoId: await reg.salvar(`Tarefa criada: ${item.texto}`) }
  }, TX_OPTS)
}

// ── anexos ───────────────────────────────────────────────────────────────────
export const ANEXO_MAX_BYTES = 10 * 1024 * 1024

export async function anexarLink(id: number, nome: string, url: string, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const t = await tx.tarefa.findUnique({ where: { id }, select: { id: true } })
    if (!t) throw new UserError("Tarefa não encontrada")
    const reg = new RegistroAcao(tx, ator.id)
    const a = await tx.tarefaAnexo.create({
      data: { tarefaId: id, tipo: "link", nome: reqStr(nome, "nome").slice(0, 200), url, autorId: ator.id },
      select: { id: true, nome: true },
    })
    reg.anexo(a.id)
    await historico(tx, reg, ator, [{ tarefaId: id, texto: `Anexo: ${a.nome}` }])
    return { id: a.id, acaoId: await reg.salvar(`Anexo: ${a.nome}`) }
  }, TX_OPTS)
}

export async function anexarArquivo(
  id: number,
  arq: { nome: string; mimeType: string; bytes: Buffer },
  ator: Ator,
) {
  if (!arq.bytes.length) throw new UserError("Arquivo vazio")
  if (arq.bytes.length > ANEXO_MAX_BYTES) throw new UserError("Arquivo acima de 10 MB")
  return prisma.$transaction(async (tx) => {
    const t = await tx.tarefa.findUnique({ where: { id }, select: { id: true } })
    if (!t) throw new UserError("Tarefa não encontrada")
    const reg = new RegistroAcao(tx, ator.id)
    const a = await tx.tarefaAnexo.create({
      data: {
        tarefaId: id,
        tipo: "arquivo",
        nome: reqStr(arq.nome, "nome").slice(0, 200),
        mimeType: arq.mimeType.slice(0, 120) || "application/octet-stream",
        tamanho: arq.bytes.length,
        data: arq.bytes.toString("base64"),
        autorId: ator.id,
      },
      select: { id: true, nome: true },
    })
    reg.anexo(a.id)
    await historico(tx, reg, ator, [{ tarefaId: id, texto: `Anexo: ${a.nome}` }])
    return { id: a.id, acaoId: await reg.salvar(`Anexo: ${a.nome}`) }
  }, TX_OPTS)
}

export async function removerAnexo(id: number, anexoId: number, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const a = await tx.tarefaAnexo.findFirst({ where: { id: anexoId, tarefaId: id }, select: { id: true, nome: true } })
    if (!a) throw new UserError("Anexo não encontrado")
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarAnexoRemovido(a.id)
    await tx.tarefaAnexo.delete({ where: { id: a.id } })
    await historico(tx, reg, ator, [{ tarefaId: id, texto: `Anexo removido: ${a.nome}` }])
    return { acaoId: await reg.salvar(`Anexo removido: ${a.nome}`) }
  }, TX_OPTS)
}

/** Bytes de um anexo do tipo arquivo (download). */
export async function lerAnexo(id: number, anexoId: number) {
  const a = await prisma.tarefaAnexo.findFirst({
    where: { id: anexoId, tarefaId: id, tipo: "arquivo" },
    select: { nome: true, mimeType: true, data: true },
  })
  if (!a || !a.data) return null
  return { nome: a.nome, mimeType: a.mimeType ?? "application/octet-stream", bytes: Buffer.from(a.data, "base64") }
}

