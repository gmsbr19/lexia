// Projetos & Modelos — camada de escrita. SERVER ONLY. Projeto é FILTRO do quadro
// único; criar a partir de modelo gera projeto + tarefas + ligações numa única
// transação (e o "Desfazer" apaga tudo). Mudanças em projetos também entram no
// registro de ações.
import { randomUUID } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { isValidISO } from "@/lib/datas/util"
import { RegistroAcao } from "@/lib/tarefas/acoes"
import { optId, optStr, reqStr, toDate } from "@/lib/tarefas/_input"
import { historico, TX_OPTS, type Ator } from "@/lib/tarefas/mutations"
import { hojeSP, prazoPadrao } from "@/lib/tarefas/regras"
import { CORES_PROJETO, type PapelModelo, type PassoModelo } from "@/lib/tarefas/types"
import { cicloNoModelo, instanciarModelo, type GrupoWizard } from "./modelo"

type Tx = Prisma.TransactionClient

export interface ProjetoInput {
  nomeCurto: string
  nome: string
  clienteId?: number | null
  area?: string | null
  responsavelId?: number | null
  prazo?: string | null
  cor?: string | null
  descricao?: string | null
}

async function corLivre(tx: Tx): Promise<string> {
  const usadas = new Set(
    (await tx.projeto.findMany({ where: { excluidoEm: null, arquivadoEm: null }, select: { cor: true } })).map((p) => p.cor),
  )
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

function prazoOpt(v: string | null | undefined): Date | null {
  if (!v) return null
  if (!isValidISO(v)) throw new UserError("Prazo inválido")
  return toDate(v)
}

async function inserirProjeto(tx: Tx, reg: RegistroAcao, input: ProjetoInput, modeloOrigemId: number | null) {
  const clienteId = optId(input.clienteId)
  const responsavelId = optId(input.responsavelId)
  await validarRefs(tx, clienteId, responsavelId)
  const p = await tx.projeto.create({
    data: {
      nomeCurto: reqStr(input.nomeCurto, "nome curto").slice(0, 24),
      nome: reqStr(input.nome, "nome completo").slice(0, 200),
      clienteId,
      area: optStr(input.area),
      responsavelId,
      prazo: prazoOpt(input.prazo),
      cor: input.cor && /^#[0-9A-Fa-f]{6}$/.test(input.cor) ? input.cor : await corLivre(tx),
      descricao: optStr(input.descricao),
      modeloOrigemId,
    },
    select: { id: true, nomeCurto: true },
  })
  reg.projetoCriado(p.id)
  return p
}

export async function criarProjeto(input: ProjetoInput, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const reg = new RegistroAcao(tx, ator.id)
    const p = await inserirProjeto(tx, reg, input, null)
    return { id: p.id, acaoId: await reg.salvar(`Projeto criado: ${p.nomeCurto}`) }
  }, TX_OPTS)
}

export interface ProjetoPatch extends Partial<ProjetoInput> {
  arquivado?: boolean
}

export async function atualizarProjeto(id: number, patch: ProjetoPatch, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const antes = await tx.projeto.findFirst({ where: { id, excluidoEm: null }, select: { id: true, nomeCurto: true, arquivadoEm: true } })
    if (!antes) throw new UserError("Projeto não encontrado")
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarProjeto(id)
    const data: Prisma.ProjetoUncheckedUpdateInput = {}
    if (patch.nomeCurto !== undefined) data.nomeCurto = reqStr(patch.nomeCurto, "nome curto").slice(0, 24)
    if (patch.nome !== undefined) data.nome = reqStr(patch.nome, "nome completo").slice(0, 200)
    if (patch.area !== undefined) data.area = optStr(patch.area)
    if (patch.prazo !== undefined) data.prazo = prazoOpt(patch.prazo)
    if (patch.descricao !== undefined) data.descricao = optStr(patch.descricao)
    if (patch.cor !== undefined && patch.cor && /^#[0-9A-Fa-f]{6}$/.test(patch.cor)) data.cor = patch.cor
    if (patch.clienteId !== undefined || patch.responsavelId !== undefined) {
      await validarRefs(tx, optId(patch.clienteId), optId(patch.responsavelId))
      if (patch.clienteId !== undefined) data.clienteId = optId(patch.clienteId)
      if (patch.responsavelId !== undefined) data.responsavelId = optId(patch.responsavelId)
    }
    let msg = `Projeto alterado: ${antes.nomeCurto}`
    if (patch.arquivado !== undefined && patch.arquivado !== !!antes.arquivadoEm) {
      data.arquivadoEm = patch.arquivado ? new Date() : null
      msg = patch.arquivado ? `Projeto arquivado: ${antes.nomeCurto}` : `Projeto desarquivado: ${antes.nomeCurto}`
    }
    if (!Object.keys(data).length) return { acaoId: null as string | null }
    await tx.projeto.update({ where: { id }, data })
    return { acaoId: await reg.salvar(msg) }
  }, TX_OPTS)
}

/** Exclusão (soft): as tarefas ficam, lidas como "Sem projeto". */
export async function excluirProjeto(id: number, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.projeto.findFirst({ where: { id, excluidoEm: null }, select: { nomeCurto: true } })
    if (!p) throw new UserError("Projeto não encontrado")
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarProjeto(id)
    await tx.projeto.update({ where: { id }, data: { excluidoEm: new Date() } })
    return { acaoId: await reg.salvar(`Projeto excluído: ${p.nomeCurto}`) }
  }, TX_OPTS)
}

// ── criar a partir de modelo ─────────────────────────────────────────────────
export interface DeModeloInput {
  modeloId: number
  projeto: ProjetoInput
  grupos: GrupoWizard[]
  responsaveis?: Record<string, number | null | undefined>
}

export async function criarProjetoDeModelo(input: DeModeloInput, ator: Ator) {
  for (const g of input.grupos) if (!isValidISO(g.prazo)) throw new UserError("Prazo do grupo inválido")
  const modelo = await carregarModelo(input.modeloId)
  const responsaveis: Record<string, number | null> = {}
  for (const papel of modelo.papeis) {
    const v = input.responsaveis?.[papel.id]
    responsaveis[papel.id] = v === undefined ? papel.padraoUsuarioId : optId(v)
  }
  const geradas = instanciarModelo(modelo, input.grupos, responsaveis)

  return prisma.$transaction(async (tx) => {
    const reg = new RegistroAcao(tx, ator.id)
    for (const uid of new Set(Object.values(responsaveis))) await validarRefs(tx, null, uid)
    const projeto = await inserirProjeto(tx, reg, input.projeto, modelo.id)
    const ids = new Map<string, number>()
    for (const g of geradas) {
      const t = await tx.tarefa.create({
        data: {
          astreaId: `app-tarefa-${randomUUID()}`,
          titulo: g.titulo,
          status: g.status,
          done: false,
          prazo: toDate(g.prazo)!,
          prazoFatal: g.prazoFatal,
          grupo: g.grupo,
          checklist: JSON.stringify(g.checklist.map((texto, i) => ({ id: `c${i + 1}`, texto, marcado: false }))),
          origem: "modelo",
          geradoPorApp: true,
          responsavelId: g.responsavelId,
          criadoPorId: ator.id,
          projetoId: projeto.id,
        },
        select: { id: true },
      })
      ids.set(g.chave, t.id)
      reg.criada(t.id)
    }
    const ligacoes = geradas.flatMap((g) =>
      g.anteriores.map((a) => ({ anteriorId: ids.get(a)!, seguinteId: ids.get(g.chave)! })),
    )
    if (ligacoes.length) await tx.tarefaLigacao.createMany({ data: ligacoes, skipDuplicates: true })
    await historico(
      tx,
      reg,
      ator,
      [...ids.values()].map((tarefaId) => ({ tarefaId, texto: "Criada pelo modelo" })),
    )
    const acaoId = await reg.salvar(`Projeto criado: ${projeto.nomeCurto}`)
    return { id: projeto.id, acaoId, tarefas: geradas.length, ligacoes: ligacoes.length }
  }, TX_OPTS)
}

// ── modelos (editor — só sócio) ──────────────────────────────────────────────
async function carregarModelo(id: number) {
  const m = await prisma.projetoModelo.findFirst({
    where: { id, excluidoEm: null },
    include: { passos: { orderBy: [{ ordem: "asc" }, { id: "asc" }] } },
  })
  if (!m) throw new UserError("Modelo não encontrado")
  const json = <T>(s: string): T[] => {
    try {
      const v = JSON.parse(s)
      return Array.isArray(v) ? v : []
    } catch {
      return []
    }
  }
  return {
    id: m.id,
    palavraGrupo: m.palavraGrupo,
    sufixoGrupo: m.sufixoGrupo,
    papeis: json<PapelModelo>(m.papeis),
    passos: m.passos.map<PassoModelo>((p) => ({
      chave: p.chave,
      titulo: p.titulo,
      papelId: p.papelId,
      diasAntes: p.diasAntes,
      prazoFatal: p.prazoFatal,
      anteriores: json<string>(p.anteriores),
      checklist: json<string>(p.checklist),
    })),
  }
}

export interface ModeloInput {
  nome: string
  area?: string | null
  palavraGrupo: string
  sufixoGrupo?: string
  papeis: { id: string; rotulo: string; padraoUsuarioId?: number | null }[]
  passos: {
    chave: string
    titulo: string
    papelId?: string | null
    diasAntes: number
    prazoFatal?: boolean
    anteriores?: string[]
    checklist?: string[]
  }[]
}

function normalizarModelo(input: ModeloInput) {
  const papeis: PapelModelo[] = input.papeis.map((p) => ({
    id: p.id.trim(),
    rotulo: p.rotulo.trim(),
    padraoUsuarioId: optId(p.padraoUsuarioId),
  }))
  const papelIds = new Set(papeis.map((p) => p.id))
  if (papelIds.size !== papeis.length) throw new UserError("Papéis repetidos")
  const chaves = new Set<string>()
  for (const p of input.passos) {
    if (chaves.has(p.chave)) throw new UserError("Passos repetidos")
    chaves.add(p.chave)
  }
  const passos: PassoModelo[] = input.passos.map((p) => ({
    chave: p.chave.trim(),
    titulo: p.titulo.trim(),
    papelId: p.papelId && papelIds.has(p.papelId) ? p.papelId : null,
    diasAntes: Math.max(0, Math.trunc(p.diasAntes)),
    prazoFatal: !!p.prazoFatal,
    anteriores: (p.anteriores ?? []).filter((a) => a !== p.chave && chaves.has(a)),
    checklist: (p.checklist ?? []).map((c) => c.trim()).filter(Boolean),
  }))
  if (cicloNoModelo(passos)) throw new UserError("Não é possível: os passos ficariam esperando uns pelos outros.")
  return { papeis, passos }
}

async function gravarPassos(tx: Tx, modeloId: number, passos: PassoModelo[]) {
  await tx.projetoModeloPasso.deleteMany({ where: { modeloId } })
  await tx.projetoModeloPasso.createMany({
    data: passos.map((p, i) => ({
      modeloId,
      chave: p.chave,
      titulo: p.titulo,
      papelId: p.papelId,
      diasAntes: p.diasAntes,
      prazoFatal: p.prazoFatal,
      anteriores: JSON.stringify(p.anteriores),
      checklist: JSON.stringify(p.checklist),
      ordem: i,
    })),
  })
}

export async function criarModelo(input: ModeloInput, ator: Ator) {
  const { papeis, passos } = normalizarModelo(input)
  return prisma.$transaction(async (tx) => {
    const reg = new RegistroAcao(tx, ator.id)
    const ordem = await tx.projetoModelo.count({ where: { excluidoEm: null } })
    const m = await tx.projetoModelo.create({
      data: {
        nome: reqStr(input.nome, "nome"),
        area: optStr(input.area),
        palavraGrupo: reqStr(input.palavraGrupo, "palavra do grupo"),
        sufixoGrupo: input.sufixoGrupo ?? "",
        papeis: JSON.stringify(papeis),
        ordem,
      },
      select: { id: true },
    })
    await gravarPassos(tx, m.id, passos)
    reg.modeloCriado(m.id)
    return { id: m.id, acaoId: await reg.salvar(`Modelo criado: ${reqStr(input.nome, "nome")}`) }
  }, TX_OPTS)
}

export async function atualizarModelo(id: number, input: ModeloInput, ator: Ator) {
  const { papeis, passos } = normalizarModelo(input)
  return prisma.$transaction(async (tx) => {
    const m = await tx.projetoModelo.findFirst({ where: { id, excluidoEm: null }, select: { id: true, nome: true } })
    if (!m) throw new UserError("Modelo não encontrado")
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarModelo(id)
    await tx.projetoModelo.update({
      where: { id },
      data: {
        nome: reqStr(input.nome, "nome"),
        area: optStr(input.area),
        palavraGrupo: reqStr(input.palavraGrupo, "palavra do grupo"),
        sufixoGrupo: input.sufixoGrupo ?? "",
        papeis: JSON.stringify(papeis),
      },
    })
    await gravarPassos(tx, id, passos)
    return { id, acaoId: await reg.salvar(`Modelo alterado: ${m.nome}`) }
  }, TX_OPTS)
}

export async function excluirModelo(id: number, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const m = await tx.projetoModelo.findFirst({ where: { id, excluidoEm: null }, select: { id: true, nome: true } })
    if (!m) throw new UserError("Modelo não encontrado")
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarModelo(id)
    await tx.projetoModelo.update({ where: { id }, data: { excluidoEm: new Date() } })
    return { id, acaoId: await reg.salvar(`Modelo excluído: ${m.nome}`) }
  }, TX_OPTS)
}


// ── estrutura inteira numa chamada (LexIA: economia de tokens) ───────────────
export interface EstruturaTarefa {
  titulo: string
  grupo?: string | null
  responsavelId?: number | null
  prazo?: string | null
  prazoFatal?: boolean
  descricao?: string | null
  checklist?: string[]
  /** Índices (0-based) de tarefas ANTERIORES nesta mesma lista que precisam terminar antes. */
  depoisDe?: number[]
}

/**
 * Cria 1 projeto + as tarefas + as ligações numa única transação. `depoisDe` só
 * aceita índices menores que o da própria tarefa — ciclos são impossíveis por
 * construção. Tarefas com anterior nascem "aguardando". Prazo ausente = sexta da
 * semana. "Desfazer" apaga tudo.
 */
export async function montarEstruturaProjeto(projeto: ProjetoInput, tarefas: EstruturaTarefa[], ator: Ator) {
  const hoje = hojeSP()
  return prisma.$transaction(async (tx) => {
    const reg = new RegistroAcao(tx, ator.id)
    const p = await inserirProjeto(tx, reg, projeto, null)
    const ids: number[] = []
    for (const [i, t] of tarefas.entries()) {
      const antes = [...new Set((t.depoisDe ?? []).filter((j) => Number.isInteger(j) && j >= 0 && j < i))]
      if (t.responsavelId != null) await validarRefs(tx, null, t.responsavelId)
      const criada = await tx.tarefa.create({
        data: {
          astreaId: `app-tarefa-${randomUUID()}`,
          titulo: reqStr(t.titulo, "título").slice(0, 300),
          status: antes.length ? "wait" : "todo",
          done: false,
          prazo: toDate(t.prazo && isValidISO(t.prazo) ? t.prazo : prazoPadrao(hoje))!,
          prazoFatal: !!t.prazoFatal,
          grupo: optStr(t.grupo),
          notes: optStr(t.descricao),
          checklist: JSON.stringify((t.checklist ?? []).filter((c) => c.trim()).map((texto, k) => ({ id: `c${k + 1}`, texto: texto.trim(), marcado: false }))),
          origem: "lexia",
          geradoPorApp: true,
          responsavelId: t.responsavelId === undefined ? ator.id : optId(t.responsavelId),
          criadoPorId: ator.id,
          projetoId: p.id,
        },
        select: { id: true },
      })
      ids.push(criada.id)
      reg.criada(criada.id)
      if (antes.length) {
        await tx.tarefaLigacao.createMany({ data: antes.map((j) => ({ anteriorId: ids[j], seguinteId: criada.id })), skipDuplicates: true })
      }
    }
    await historico(tx, reg, ator, ids.map((tarefaId) => ({ tarefaId, texto: "Tarefa criada" })))
    const acaoId = await reg.salvar(`Projeto criado: ${p.nomeCurto}`)
    return { id: p.id, acaoId, tarefas: ids.length }
  }, TX_OPTS)
}
