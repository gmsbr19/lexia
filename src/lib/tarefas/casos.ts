// Tarefas — "Novo caso…" pelo quadro. SERVER ONLY. O caso é o "projeto" do quadro;
// aqui só se cria o caso com a etiqueta do quadro (nome curto, cor, prazo…) — o
// cadastro completo (contrato, tipo, status, financeiro) fica em /casos. Entra no
// registro de ações: o "Desfazer" exclui o caso (soft) se ninguém o usou ainda.
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { comResponsavelPadrao, criarCasoTx } from "@/lib/casos/mutations"
import { veTudo } from "@/lib/processos/rbac"
import { RegistroAcao } from "./acoes"
import { optId, optStr } from "./_input"
import { TX_OPTS, type Ator } from "./mutations"
import { CORES_CASO } from "./types"

type Tx = Prisma.TransactionClient

export interface CasoQuadroInput {
  nomeCurto: string
  nome: string // título do caso
  clienteId?: number | null
  area?: string | null
  responsavelId?: number | null
  prazo?: string | null
  cor?: string | null
  descricao?: string | null
}

/** Primeira cor do quadro que nenhum caso em andamento usa (senão, a primeira). */
async function corLivre(tx: Tx): Promise<string> {
  const usadas = new Set(
    (
      await tx.caso.findMany({
        where: { excluidoEm: null, cor: { not: null }, tarefas: { some: { done: false } } },
        select: { cor: true },
      })
    ).map((c) => c.cor),
  )
  return CORES_CASO.find((c) => !usadas.has(c)) ?? CORES_CASO[0]
}

async function validarRefs(tx: Tx, clienteId: number | null, responsavelId: number | null) {
  if (clienteId != null && !(await tx.cliente.findUnique({ where: { id: clienteId }, select: { id: true } }))) {
    throw new UserError("Cliente não encontrado")
  }
  if (responsavelId != null && !(await tx.user.findUnique({ where: { id: responsavelId }, select: { id: true } }))) {
    throw new UserError("Responsável não encontrado")
  }
}

/** Cria o caso dentro da transação do chamador e o registra para o "Desfazer". */
export async function inserirCasoQuadro(
  tx: Tx,
  reg: RegistroAcao,
  input: CasoQuadroInput,
  ator: Ator,
  modeloOrigemId: number | null,
): Promise<{ id: number; curto: string }> {
  const clienteId = optId(input.clienteId)
  const escolhido = optId(input.responsavelId)
  await validarRefs(tx, clienteId, escolhido)
  const { responsavelUserId } = comResponsavelPadrao(
    { responsavelUserId: escolhido },
    { userId: ator.id, veTudo: !ator.email || veTudo(ator.role ?? "estagiario") },
  )
  const curto = (optStr(input.nomeCurto) ?? "").slice(0, 24)
  const c = await criarCasoTx(tx, {
    titulo: input.nome,
    nomeCurto: curto || null,
    clientePrincipalId: clienteId,
    area: optStr(input.area),
    responsavelUserId: responsavelUserId ?? null,
    prazo: input.prazo ?? null,
    cor: input.cor && /^#[0-9A-Fa-f]{6}$/.test(input.cor) ? input.cor : await corLivre(tx),
    descricao: optStr(input.descricao),
    modeloOrigemId,
  })
  reg.casoCriado(c.id)
  return { id: c.id, curto: curto || c.titulo }
}

export async function criarCasoQuadro(input: CasoQuadroInput, ator: Ator) {
  return prisma.$transaction(async (tx) => {
    const reg = new RegistroAcao(tx, ator.id)
    const c = await inserirCasoQuadro(tx, reg, input, ator, null)
    return { id: c.id, acaoId: await reg.salvar(`Caso criado: ${c.curto}`) }
  }, TX_OPTS)
}
