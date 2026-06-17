// Helpers para montar cartões de confirmação LEGÍVEIS na LexIA: resolve ids→nomes
// e formata datas/$ em pt-BR, para o advogado ver "João Silva" e "12/06/2026" em
// vez de "#42" e "2026-06-12". SERVER ONLY. NÃO importa next-auth (test-safe — é
// puxado pelo registry no tests/lexia-agent.test.ts).
import { prisma } from "@/lib/db"
import { brl } from "./tools/shared"

export { brl }

/** "2026-06-12" → "12/06/2026" (devolve o input se não for ISO). */
export function dataBr(iso?: string | null): string {
  if (!iso) return "—"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

export async function nomeCliente(id?: number | null): Promise<string> {
  if (!id) return "—"
  const c = await prisma.cliente.findUnique({ where: { id }, select: { nome: true } })
  return c?.nome ?? `cliente #${id}`
}
export async function nomeCaso(id?: number | null): Promise<string> {
  if (!id) return "—"
  const c = await prisma.caso.findUnique({ where: { id }, select: { titulo: true } })
  return c?.titulo ?? `caso #${id}`
}
export async function nomeUsuario(id?: number | null): Promise<string> {
  if (!id) return "—"
  const u = await prisma.user.findUnique({ where: { id }, select: { nome: true } })
  return u?.nome ?? `usuário #${id}`
}
/** Rótulo amigável de um processo: nº CNJ, senão o título do caso. */
export async function rotuloProcesso(id?: number | null): Promise<string> {
  if (!id) return "—"
  const p = await prisma.processo.findUnique({
    where: { id },
    select: { numeroCnj: true, caso: { select: { titulo: true } } },
  })
  if (!p) return `processo #${id}`
  return p.numeroCnj ?? p.caso?.titulo ?? `processo #${id}`
}
