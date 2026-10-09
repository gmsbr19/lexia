// Informações fixadas — escrita. SERVER ONLY. Cada mutação roda numa transação com
// um RegistroAcao (o "Desfazer" do quadro de Tarefas), grava quem e quando
// (e-mail) e, quando a informação nasce de um comentário, deixa uma linha no
// histórico da tarefa de origem.
//
// Acesso: fixada é do escritório inteiro — qualquer pessoa cria, edita, fixa e
// desafixa. Nota de caso NÃO fixada só para quem acessa o caso (advogado/
// estagiário: os seus). Excluir: o autor ou a gestão (admin/sócio).
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { ForbiddenError, UserError } from "@/lib/errors"
import { RegistroAcao } from "@/lib/tarefas/acoes"
import { MSG_SEM_ACESSO_CASO, TX_OPTS, historico, podeVincularCaso, type Ator } from "@/lib/tarefas/mutations"
import { WHERE_INTERNO_VIVO } from "@/lib/tarefas/queries"
import { CONTEUDO_MAX, fonteDaAncora, normalizarConteudo, type Ancora, type FonteInfo, type InformacaoRow } from "./core"
import { getInformacao } from "./queries"

type Tx = Prisma.TransactionClient

export interface InformacaoInput {
  ancora: Ancora
  conteudo: string
  fixado?: boolean // padrão: fixada
  origemTarefaId?: number | null
}

export interface ResultadoInformacao {
  informacao: InformacaoRow | null
  acaoId: string | null
}

function conteudoValido(s: string): string {
  const v = normalizarConteudo(s)
  if (!v) throw new UserError("A informação não pode ficar vazia")
  if (v.length > CONTEUDO_MAX) throw new UserError(`A informação passa de ${CONTEUDO_MAX} caracteres`)
  return v
}

/** Nome da âncora viva ("no cliente Maria"); erro se não existir. */
async function ancoraViva(tx: Tx, a: Ancora): Promise<string> {
  if (a.tipo === "cliente") {
    const c = await tx.cliente.findUnique({ where: { id: a.id }, select: { nome: true } })
    if (!c) throw new UserError("Cliente não encontrado")
    return `no cliente ${c.nome}`
  }
  if (a.tipo === "caso") {
    const c = await tx.caso.findFirst({ where: { id: a.id, excluidoEm: null }, select: { titulo: true, nomeCurto: true } })
    if (!c) throw new UserError("Caso não encontrado")
    return `no caso ${c.nomeCurto?.trim() || c.titulo}`
  }
  const p = await tx.projeto.findFirst({ where: { id: a.id, ...WHERE_INTERNO_VIVO }, select: { nome: true, nomeCurto: true } })
  if (!p) throw new UserError("Projeto não encontrado")
  return `no projeto ${p.nomeCurto.trim() || p.nome}`
}

export async function criarInformacao(input: InformacaoInput, ator: Ator): Promise<ResultadoInformacao> {
  const conteudo = conteudoValido(input.conteudo)
  const fixado = input.fixado ?? true
  const { ancora } = input
  if (ancora.tipo === "caso" && !fixado && !(await podeVincularCaso(ator, ancora.id))) throw new UserError(MSG_SEM_ACESSO_CASO)
  const fonte = fonteDaAncora(ancora.tipo)
  const { id, acaoId } = await prisma.$transaction(async (tx) => {
    const onde = await ancoraViva(tx, ancora)
    let origemId: number | null = null
    if (input.origemTarefaId != null) {
      const t = await tx.tarefa.findUnique({ where: { id: input.origemTarefaId }, select: { id: true } })
      if (!t) throw new UserError("Tarefa não encontrada")
      origemId = t.id
    }
    const reg = new RegistroAcao(tx, ator.id)
    const autor = ator.email ?? "LexIA"
    const agora = new Date()
    const comum = {
      autor,
      conteudo,
      fixado,
      fixadoEm: fixado ? agora : null,
      fixadoPor: fixado ? autor : null,
      origemTarefaId: origemId,
    }
    const novo =
      ancora.tipo === "cliente"
        ? await tx.clienteAnotacao.create({ data: { clienteId: ancora.id, tipo: "nota", ...comum }, select: { id: true } })
        : await tx.anotacao.create({
            data: { ...(ancora.tipo === "caso" ? { casoId: ancora.id } : { projetoId: ancora.id }), ...comum },
            select: { id: true },
          })
    reg.informacaoCriada(fonte, novo.id)
    if (origemId != null) await historico(tx, reg, ator, [{ tarefaId: origemId, texto: `Informação fixada ${onde}` }])
    return { id: novo.id, acaoId: await reg.salvar(fixado ? "Informação fixada" : "Nota adicionada") }
  }, TX_OPTS)
  return { informacao: await getInformacao(fonte, id), acaoId }
}

/** Linha viva da tabela, já validada como informação (nota de cliente / do caso ou projeto). */
async function linhaViva(tx: Tx, fonte: FonteInfo, id: number) {
  if (fonte === "cliente") {
    const r = await tx.clienteAnotacao.findFirst({
      where: { id, excluidoEm: null },
      select: { id: true, tipo: true, autor: true, conteudo: true, fixado: true },
    })
    if (!r) throw new UserError("Informação não encontrada")
    if (r.tipo !== "nota") throw new UserError("Diretivas de cobrança não são informações")
    return { ...r, casoId: null as number | null }
  }
  const r = await tx.anotacao.findFirst({
    where: { id, excluidoEm: null },
    select: { id: true, autor: true, conteudo: true, fixado: true, casoId: true, projetoId: true, processoId: true },
  })
  if (!r) throw new UserError("Informação não encontrada")
  if (r.processoId != null || (r.casoId == null && r.projetoId == null)) throw new UserError("Notas de processo ficam na ficha do processo")
  return r
}

export async function editarInformacao(
  fonte: FonteInfo,
  id: number,
  patch: { conteudo?: string; fixado?: boolean },
  ator: Ator,
): Promise<ResultadoInformacao> {
  const conteudo = patch.conteudo !== undefined ? conteudoValido(patch.conteudo) : undefined
  const acaoId = await prisma.$transaction(async (tx) => {
    const r = await linhaViva(tx, fonte, id)
    const fixadoDepois = patch.fixado ?? r.fixado
    if (r.casoId != null && !fixadoDepois && !(await podeVincularCaso(ator, r.casoId))) throw new UserError(MSG_SEM_ACESSO_CASO)
    const agora = new Date()
    const quem = ator.email ?? "LexIA"
    const data: Prisma.AnotacaoUpdateManyMutationInput = {}
    const mudouTexto = conteudo !== undefined && conteudo !== r.conteudo
    const mudouFixado = patch.fixado !== undefined && patch.fixado !== r.fixado
    if (mudouTexto) Object.assign(data, { conteudo, editadoEm: agora, editadoPor: quem })
    if (mudouFixado) Object.assign(data, { fixado: patch.fixado, fixadoEm: patch.fixado ? agora : null, fixadoPor: patch.fixado ? quem : null })
    if (!mudouTexto && !mudouFixado) return null
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarInformacao(fonte, id)
    if (fonte === "cliente") await tx.clienteAnotacao.update({ where: { id }, data })
    else await tx.anotacao.update({ where: { id }, data })
    const desc = mudouFixado ? (patch.fixado ? "Informação fixada" : "Informação desafixada") : "Informação editada"
    return reg.salvar(desc)
  }, TX_OPTS)
  return { informacao: await getInformacao(fonte, id), acaoId }
}

export async function excluirInformacao(fonte: FonteInfo, id: number, ator: Ator): Promise<{ id: number; acaoId: string }> {
  const acaoId = await prisma.$transaction(async (tx) => {
    const r = await linhaViva(tx, fonte, id)
    const gestao = ator.role === "admin" || ator.role === "socio"
    const autor = !!ator.email && r.autor.toLowerCase() === ator.email.toLowerCase()
    if (!gestao && !autor) throw new ForbiddenError()
    const reg = new RegistroAcao(tx, ator.id)
    await reg.guardarInformacao(fonte, id)
    const data = { excluidoEm: new Date() }
    if (fonte === "cliente") await tx.clienteAnotacao.update({ where: { id }, data })
    else await tx.anotacao.update({ where: { id }, data })
    return reg.salvar("Informação excluída")
  }, TX_OPTS)
  return { id, acaoId }
}
