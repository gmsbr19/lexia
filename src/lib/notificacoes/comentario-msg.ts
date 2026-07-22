// Construção PURA das mensagens de comentário (sem Prisma/env). Espelha
// tarefa-msg.ts: a `mensagem` alimenta o in-app (título/assunto do e-mail) e
// `comentarioEmailHtml` monta o corpo (introHtml) do e-mail com o texto real.
import { escapeHtml } from "./email/layout"

/** Linha in-app / assunto do e-mail: quem comentou/mencionou + título da tarefa. */
export function msgComentarioTarefa(p: {
  atorNome?: string | null
  titulo: string
  mencionado?: boolean
}): string {
  if (!p.atorNome) return `Novo comentário em "${p.titulo}"`
  return p.mencionado
    ? `${p.atorNome} mencionou você em "${p.titulo}"`
    : `${p.atorNome} comentou em "${p.titulo}"`
}

const MAX_EMAIL = 2000

/**
 * Corpo HTML (introHtml) do e-mail a partir do `conteudo` com tokens de menção.
 * Resolve `@[id]`→`@Nome` (via `nomePorId`) e `@[todos]`→`@todos`, ESCAPA tudo
 * (anti-XSS) e converte quebras de linha em <br>. Trunca ~2000 chars. Id
 * desconhecido (usuário desativado) → `@?`.
 */
export function comentarioEmailHtml(
  conteudo: string,
  nomePorId: (id: number) => string | null,
): string {
  const bruto = conteudo.length > MAX_EMAIL ? `${conteudo.slice(0, MAX_EMAIL)}…` : conteudo
  // Resolve os tokens p/ texto puro ANTES de escapar (o escape final cobre o
  // corpo E os nomes resolvidos — nada de HTML vaza).
  const texto = bruto.replace(/@\[(\d+|todos)\]/g, (_full, raw: string) => {
    if (raw === "todos") return "@todos"
    const nome = nomePorId(Number(raw))
    return nome ? `@${nome}` : "@?"
  })
  return escapeHtml(texto).replace(/\r?\n/g, "<br>")
}
