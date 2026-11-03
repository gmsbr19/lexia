// Modelos de tarefas — camada de escrita. SERVER ONLY. Aplicar um modelo gera, num
// projeto NOVO (criado na hora: com cliente = caso do cliente; sem = projeto
// interno) ou num projeto EXISTENTE, as tarefas + ligações do modelo numa única
// transação (o "Desfazer" tira as tarefas e, se o projeto foi criado pela ação,
// o exclui — soft). O editor de modelos também entra no registro de ações.
import { randomUUID } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { isValidISO } from "@/lib/datas/util"
import { RegistroAcao } from "@/lib/tarefas/acoes"
import { optId, optStr, reqStr, toDate } from "@/lib/tarefas/_input"
import { inserirProjeto, type ProjetoNovoInput } from "@/lib/tarefas/projetos"
import { historico, MSG_SEM_ACESSO_CASO, podeVincularProjeto, projetoDoQuadro, TX_OPTS, type Ator } from "@/lib/tarefas/mutations"
import { lerChave } from "@/lib/tarefas/projetos-quadro"
import { hojeSP, prazoPadrao } from "@/lib/tarefas/regras"
import type { ChaveProjeto, PapelModelo, PassoModelo, TipoProjeto } from "@/lib/tarefas/types"
import { cicloNoModelo, instanciarModelo, type GrupoWizard } from "./modelo"

type Tx = Prisma.TransactionClient

/** Onde as tarefas entram: um projeto novo (criado agora) ou um projeto existente. */
export type AlvoProjeto = { novo: ProjetoNovoInput; projeto?: undefined } | { projeto: ChaveProjeto; novo?: undefined }

interface AlvoResolvido {
  chave: ChaveProjeto
  tipo: TipoProjeto
  casoId: number | null
  projetoId: number | null
  curto: string
  novo: boolean
}

async function validarUsuario(tx: Tx, id: number | null) {
  if (id != null && !(await tx.user.findUnique({ where: { id }, select: { id: true } }))) {
    throw new UserError("Responsável não encontrado")
  }
}

/** Resolve o alvo dentro da transação: cria o projeto novo ou confere o existente. */
async function resolverAlvo(
  tx: Tx,
  reg: RegistroAcao,
  alvo: AlvoProjeto,
  ator: Ator,
  modeloOrigemId: number | null,
): Promise<AlvoResolvido> {
  if (alvo.novo) {
    const p = await inserirProjeto(tx, reg, alvo.novo, ator, modeloOrigemId)
    const id = lerChave(p.chave)!.id
    return { chave: p.chave, tipo: p.tipo, casoId: p.tipo === "caso" ? id : null, projetoId: p.tipo === "interno" ? id : null, curto: p.curto, novo: true }
  }
  if (!(await podeVincularProjeto(ator, alvo.projeto))) throw new UserError(MSG_SEM_ACESSO_CASO)
  const p = await projetoDoQuadro(tx, alvo.projeto)
  if (!p) throw new UserError("Projeto não encontrado")
  if (modeloOrigemId != null) {
    if (p.casoId != null) await tx.caso.updateMany({ where: { id: p.casoId, modeloOrigemId: null }, data: { modeloOrigemId } })
    if (p.projetoId != null) await tx.projeto.updateMany({ where: { id: p.projetoId, modeloOrigemId: null }, data: { modeloOrigemId } })
  }
  return { chave: p.chave, tipo: p.casoId != null ? "caso" : "interno", casoId: p.casoId, projetoId: p.projetoId, curto: p.curto, novo: false }
}

const rotuloNovo = (a: AlvoResolvido) => (a.tipo === "caso" ? "Caso criado" : "Projeto criado")

// ── aplicar um modelo ────────────────────────────────────────────────────────
export type UsarModeloInput = AlvoProjeto & {
  grupos: GrupoWizard[]
  responsaveis?: Record<string, number | null | undefined>
}

export async function usarModelo(modeloId: number, input: UsarModeloInput, ator: Ator) {
  for (const g of input.grupos) if (!isValidISO(g.prazo)) throw new UserError("Prazo do grupo inválido")
  const modelo = await carregarModelo(modeloId)
  const responsaveis: Record<string, number | null> = {}
  for (const papel of modelo.papeis) {
    const v = input.responsaveis?.[papel.id]
    responsaveis[papel.id] = v === undefined ? papel.padraoUsuarioId : optId(v)
  }
  const geradas = instanciarModelo(modelo, input.grupos, responsaveis)

  return prisma.$transaction(async (tx) => {
    const reg = new RegistroAcao(tx, ator.id)
    for (const uid of new Set(Object.values(responsaveis))) await validarUsuario(tx, uid)
    const alvo = await resolverAlvo(tx, reg, input, ator, modelo.id)
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
          casoId: alvo.casoId,
          projetoId: alvo.projetoId,
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
    const acaoId = await reg.salvar(alvo.novo ? `${rotuloNovo(alvo)}: ${alvo.curto}` : `Modelo aplicado: ${alvo.curto}`)
    return { chave: alvo.chave, acaoId, tarefas: geradas.length, ligacoes: ligacoes.length }
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
 * Cria as tarefas + as ligações num projeto (novo ou existente) numa única
 * transação. `depoisDe` só aceita índices menores que o da própria tarefa —
 * ciclos são impossíveis por construção. Tarefas com anterior nascem
 * "aguardando". Prazo ausente = sexta da semana. "Desfazer" tira tudo.
 */
export async function montarEstruturaProjeto(destino: AlvoProjeto, tarefas: EstruturaTarefa[], ator: Ator) {
  const hoje = hojeSP()
  return prisma.$transaction(async (tx) => {
    const reg = new RegistroAcao(tx, ator.id)
    const alvo = await resolverAlvo(tx, reg, destino, ator, null)
    const ids: number[] = []
    for (const [i, t] of tarefas.entries()) {
      const antes = [...new Set((t.depoisDe ?? []).filter((j) => Number.isInteger(j) && j >= 0 && j < i))]
      if (t.responsavelId != null) await validarUsuario(tx, t.responsavelId)
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
          checklist: JSON.stringify(
            (t.checklist ?? []).filter((c) => c.trim()).map((texto, k) => ({ id: `c${k + 1}`, texto: texto.trim(), marcado: false })),
          ),
          origem: "lexia",
          geradoPorApp: true,
          responsavelId: t.responsavelId === undefined ? ator.id : optId(t.responsavelId),
          criadoPorId: ator.id,
          casoId: alvo.casoId,
          projetoId: alvo.projetoId,
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
    const acaoId = await reg.salvar(alvo.novo ? `${rotuloNovo(alvo)}: ${alvo.curto}` : `${ids.length} tarefas em ${alvo.curto}`)
    return { chave: alvo.chave, acaoId, tarefas: ids.length }
  }, TX_OPTS)
}
