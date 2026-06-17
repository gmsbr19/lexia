// Shared atoms for tool definitions.
import { z } from "zod"

/** Optional row cap for list tools (keeps tool results from flooding context). */
export const limite = z.number().int().min(1).max(50).optional().describe("Máximo de itens a retornar (1–50, padrão 20)")

/** Cap a list and report the true total so the model knows it was truncated. */
export function cap<T>(itens: T[], n?: number): { total: number; mostrando: number; itens: T[] } {
  const lim = Math.min(Math.max(n ?? 20, 1), 50)
  return { total: itens.length, mostrando: Math.min(itens.length, lim), itens: itens.slice(0, lim) }
}

/** Format integer centavos as "R$ 1.234,56" for resumo strings on cards. */
export function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
