// Tarefas — projetos criados/editados pelo quadro. SERVER ONLY.
// "Novo projeto": COM cliente vira um CASO do cliente (o cadastro completo —
// contrato, tipo, status, financeiro — fica em /casos); SEM cliente vira um
// projeto INTERNO do escritório (Manutenção do Lexia, Marketing…). O interno é
// editado aqui (modal da aba Projetos): editar/arquivar/excluir entram no
// "Desfazer"; "vincular a um cliente" converte o interno em caso (não desfaz).
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { comResponsavelPadrao, criarCasoTx } from "@/lib/casos/mutations"
import { veTudo } from "@/lib/processos/rbac"
import { RegistroAcao } from "./acoes"
import { optId, optStr, reqStr, toDate } from "./_input"
import { TX_OPTS, type Ator } from "./mutations"
import { chaveCaso, chaveInterno } from "./projetos-quadro"
import { WHERE_INTERNO_VIVO } from "./queries"
import { CORES_PROJETO, type ChaveProjeto } from "./types"

type Tx = Prisma.TransactionClient

const HEX = /^#[0-9A-Fa-f]{6}$/

export interface ProjetoNovoInput {
  nomeCurto: string
  nome: string // título do caso / nome do projeto interno
  clienteId?: number | null // com cliente → caso do cliente; sem → projeto interno
  area?: string | null // só caso
  responsavelId?: number | null
  prazo?: string | null
  cor?: string | null
  descricao?: string | null
}

/** Primeira cor do quadro que nenhum projeto em andamento usa (senão, a primeira). */
async function corLivre(tx: Tx): Promise<string> {
  const emAndamento = { tarefas: { some: { done: false } } }
  const [casos, internos] = await Promise.all([
    tx.caso.findMany({ where: { excluidoEm: null, cor: { not: null }, ...emAndamento }, select: { cor: true } }),
    tx.projeto.findMany({ where: { ...WHERE_INTERNO_VIVO, cor: { not: null }, ...emAndamento }, select: { cor: true } }),
  ])
  const usadas = new Set([...casos, ...internos].map((c) => c.cor))
  return CORES_PROJETO.find((c) => !usadas.has(c)) ?? CORES_PROJETO[0]
}

async function validarRefs(tx: Tx, clienteId: number | null, responsavelId: number | null) {
  if (clienteId != null && !(await tx.cliente.findUnique({ where: { id: clienteId }, select: { id: true } }))) {
    throw new UserError("Cliente não encontrado")
  }
  if (responsavelId != null && !(await tx.user.findUnique({ where: { id: responsavelId }, select: { id: true } }))) {
    throw new UserError("Responsável não encontrado")
  }
}

const curto24 = (v: unknown) => (optStr(v) ?? "").slice(0, 24)
const corValida = (v: unknown) => (typeof v === "string" && HEX.test(v) ? v : null)

/** Cria o caso (projeto COM cliente) dentro da transação do chamador e o registra para o "Desfazer". */
export async function inserirCasoQuadro(
  tx: Tx,
  reg: RegistroAcao,
  input: ProjetoNovoInput,
  ator: Ator,
  modeloOrigemId: number | null,
): Promise<{ chave: ChaveProjeto; curto: string; tipo: "caso" }> {
  const clienteId = optId(input.clienteId)
  const escolhido = optId(input.responsavelId)
  await validarRefs(tx, clienteId, escolhido)
  const { responsavelUserId } = comResponsavelPadrao(
    { responsavelUserId: escolhido },
    { userId: ator.id, veTudo: !ator.email || veTudo(ator.role ?? "estagiario") },
  )
  const curto = curto24(input.nomeCurto)
  const c = await criarCasoTx(tx, {
    titulo: input.nome,
    nomeCurto: curto || null,
    clientePrincipalId: clienteId,
    area: optStr(input.area),
    responsavelUserId: responsavelUserId ?? null,
    prazo: input.prazo ?? null,
    cor: corValida(input.cor) ?? (await corLivre(tx)),
    descricao: optStr(input.descricao),
    modeloOrigemId,
  })
  reg.casoCriado(c.id)
  return { chave: chaveCaso(c.id), curto: curto || c.titulo, tipo: "caso" }
}

/** Cria o projeto INTERNO (sem cliente) dentro da transação do chamador e o registra para o "Desfazer". */
export async function inserirProjetoInterno(
  tx: Tx,
  reg: RegistroAcao,
  input: ProjetoNovoInput,
  modeloOrigemId: number | null,
): Promise<{ chave: ChaveProjeto; curto: string; tipo: "interno" }> {
  const responsavelId = optId(input.responsavelId)
  await validarRefs(tx, null, responsavelId)
  const nome = reqStr(input.nome, "nome").slice(0, 400)
  const curto = curto24(input.nomeCurto) || nome.slice(0, 24)
  const p = await tx.projeto.create({
    data: {
      nomeCurto: curto,
      nome,
      cor: corValida(input.cor) ?? (await corLivre(tx)),
      prazo: toDate(input.prazo ?? null),
      responsavelId,
      descricao: optStr(input.descricao),
      modeloOrigemId,
    },
    select: { id: true },
  })
  reg.projetoCriado(p.id)
  return { chave: chaveInterno(p.id), curto, tipo: "interno" }
}

/** Projeto novo: com cliente → caso do cliente; sem cliente → projeto interno. */
export function inserirProjeto(tx: Tx, reg: RegistroAcao, input: ProjetoNovoInput, ator: Ator, modeloOrigemId: number | null) {
  return optId(input.clienteId) != null
    ? inserirCasoQuadro(tx, reg, input, ator, modeloOrigemId)
    : inserirProjetoInterno(tx, reg, input, modeloOrigemId)
}

export async function criarProjeto(input: ProjetoNovoInput, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const reg = new RegistroAcao(tx, ator.id)
    const p = await inserirProjeto(tx, reg, input, ator, null)
    const rotulo = p.tipo === "caso" ? "Caso criado" : "Projeto criado"
    return { chave: p.chave, tipo: p.tipo, acaoId: await reg.salvar(`${rotulo}: ${p.curto}`) }
  }, TX_OPTS)
}

// ── projeto interno: editar, arquivar, excluir, converter em caso ────────────
async function internoVivo(tx: Tx, id: number) {
  const p = await tx.projeto.findFirst({ where: { id, ...WHERE_INTERNO_VIVO } })
  if (!p) throw new UserError("Projeto não encontrado")
  return p
}

export interface ProjetoInternoPatch {
  nomeCurto?: string
  nome?: string
  responsavelId?: number | null
  prazo?: string | null
  cor?: string | null
  descricao?: string | null
  arquivado?: boolean
}

export async function editarProjetoInterno(id: number, patch: ProjetoInternoPatch, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const antes = await internoVivo(tx, id)
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarProjeto(id)
    const data: Prisma.ProjetoUncheckedUpdateInput = {}
    if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome").slice(0, 400)
    if (patch.nomeCurto !== undefined) data.nomeCurto = curto24(patch.nomeCurto) || ((data.nome as string | undefined) ?? antes.nome).slice(0, 24)
    if (patch.responsavelId !== undefined) {
      const r = optId(patch.responsavelId)
      await validarRefs(tx, null, r)
      data.responsavelId = r
    }
    if (patch.prazo !== undefined) data.prazo = toDate(patch.prazo)
    if (patch.cor !== undefined) data.cor = corValida(patch.cor) ?? antes.cor
    if (patch.descricao !== undefined) data.descricao = optStr(patch.descricao)
    let rotulo = "Projeto alterado"
    if (patch.arquivado !== undefined && patch.arquivado !== (antes.arquivadoEm != null)) {
      data.arquivadoEm = patch.arquivado ? new Date() : null
      rotulo = patch.arquivado ? "Projeto arquivado" : "Projeto reaberto"
    }
    if (!Object.keys(data).length) return { acaoId: null as string | null }
    const p = await tx.projeto.update({ where: { id }, data, select: { nomeCurto: true } })
    return { acaoId: await reg.salvar(`${rotulo}: ${p.nomeCurto}`) }
  }, TX_OPTS)
}

/**
 * Excluir (soft) um projeto interno: as tarefas ficam "Sem projeto" — perdem o
 * grupo e as ligações (que só existem dentro de um projeto); quem só aguardava
 * por ligação volta para "a fazer". Tudo volta no "Desfazer".
 */
export async function excluirProjetoInterno(id: number, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const p = await internoVivo(tx, id)
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarProjeto(id)
    const ids = (await tx.tarefa.findMany({ where: { projetoId: id }, select: { id: true } })).map((t) => t.id)
    if (ids.length) {
      await reg.guardarTarefas(ids)
      await reg.guardarLigacoes(ids)
      await tx.tarefaLigacao.deleteMany({ where: { OR: [{ anteriorId: { in: ids } }, { seguinteId: { in: ids } }] } })
      await tx.tarefa.updateMany({ where: { id: { in: ids }, status: "wait", aguardandoTexto: null }, data: { status: "todo" } })
      await tx.tarefa.updateMany({ where: { id: { in: ids } }, data: { projetoId: null, grupo: null } })
    }
    await tx.projeto.update({ where: { id }, data: { excluidoEm: new Date() } })
    return { tarefas: ids.length, acaoId: await reg.salvar(`Projeto excluído: ${p.nomeCurto}`) }
  }, TX_OPTS)
}

/**
 * Vincular um projeto interno a um cliente: ele vira um CASO do cliente (mesmo
 * nome, cor, prazo, descrição, responsável), as tarefas vão junto (o cliente
 * passa a ser herdado do caso) e o projeto guarda o caso de destino (redirects).
 * Não entra no "Desfazer": o caso passa a existir em /casos.
 */
export async function converterEmCaso(id: number, clienteId: number, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const p = await internoVivo(tx, id)
    await validarRefs(tx, clienteId, null)
    const { responsavelUserId } = comResponsavelPadrao(
      { responsavelUserId: p.responsavelId },
      { userId: ator.id, veTudo: !ator.email || veTudo(ator.role ?? "estagiario") },
    )
    const c = await criarCasoTx(tx, {
      titulo: p.nome,
      nomeCurto: p.nomeCurto,
      clientePrincipalId: clienteId,
      responsavelUserId: responsavelUserId ?? null,
      prazo: p.prazo ? p.prazo.toISOString().slice(0, 10) : null,
      cor: p.cor,
      descricao: p.descricao,
      status: p.arquivadoEm ? "Arquivado" : "Ativo",
      modeloOrigemId: p.modeloOrigemId,
    })
    const tarefas = (await tx.tarefa.findMany({ where: { projetoId: id }, select: { id: true } })).map((t) => t.id)
    if (tarefas.length) {
      await tx.tarefa.updateMany({ where: { id: { in: tarefas } }, data: { casoId: c.id, projetoId: null, clienteId: null } })
      await tx.tarefaHistorico.createMany({
        data: tarefas.map((tarefaId) => ({ tarefaId, texto: `Projeto virou caso do cliente: ${p.nomeCurto}`, autorId: ator.id })),
      })
    }
    // as informações (notas) do projeto passam a ser do caso
    await tx.anotacao.updateMany({ where: { projetoId: id }, data: { casoId: c.id, projetoId: null } })
    await tx.projeto.update({ where: { id }, data: { casoId: c.id } })
    return { casoId: c.id, chave: chaveCaso(c.id) }
  }, TX_OPTS)
}
