// Tarefas — o que é de CADA pessoa no quadro: a visão (ordenar, direção, agrupar)
// em User.tarefasPrefs e a ordem manual dos cartões em TarefaOrdem. Não é dado da
// tarefa (não entra no histórico nem no Desfazer). SERVER ONLY.
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { lerPreferencias, type PrefsQuadro } from "./filtros"

export async function getPrefsQuadro(userId: number | null): Promise<PrefsQuadro> {
  if (userId == null) return lerPreferencias(null)
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { tarefasPrefs: true } })
  return lerPreferencias(u?.tarefasPrefs ?? null)
}

export async function setPrefsQuadro(userId: number | null, p: PrefsQuadro): Promise<PrefsQuadro> {
  if (userId == null) throw new UserError("Usuário não encontrado")
  const v = lerPreferencias(p)
  await prisma.user.update({ where: { id: userId }, data: { tarefasPrefs: JSON.stringify(v) } })
  return v
}

/** Posições manuais desta pessoa: { tarefaId: ordem }. */
export async function getOrdemManual(userId: number | null): Promise<Record<number, number>> {
  if (userId == null) return {}
  const rows = await prisma.tarefaOrdem.findMany({ where: { userId }, select: { tarefaId: true, ordem: true } })
  return Object.fromEntries(rows.map((r) => [r.tarefaId, r.ordem]))
}

/** Grava as posições calculadas no cliente (filtros.reposicionar). Ignora tarefa que não existe mais. */
export async function salvarOrdem(userId: number | null, itens: { id: number; ordem: number }[]): Promise<{ n: number }> {
  if (userId == null) throw new UserError("Usuário não encontrado")
  if (!itens.length) return { n: 0 }
  const vivas = new Set(
    (await prisma.tarefa.findMany({ where: { id: { in: itens.map((i) => i.id) } }, select: { id: true } })).map((t) => t.id),
  )
  const validos = itens.filter((i) => vivas.has(i.id))
  await prisma.$transaction([
    prisma.tarefaOrdem.deleteMany({ where: { userId, tarefaId: { in: validos.map((i) => i.id) } } }),
    prisma.tarefaOrdem.createMany({ data: validos.map((i) => ({ userId, tarefaId: i.id, ordem: i.ordem })) }),
  ])
  return { n: validos.length }
}
