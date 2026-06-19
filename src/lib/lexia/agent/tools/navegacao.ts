// Navigation tool — a client-executed action. The server validates the route
// against a whitelist and emits a `navigate` SSE event; the browser performs the
// router.push. Returns the normalized route so the loop can echo it to the model.
import { z } from "zod"
import { UserError } from "@/lib/errors"
import { defineTool } from "../types"

const ROTAS: RegExp[] = [
  /^\/$/,
  /^\/financeiro$/,
  /^\/clientes$/,
  /^\/clientes\/\d+$/,
  /^\/casos$/,
  /^\/contratos$/,
  /^\/agenda$/,
  /^\/tarefas$/,
  /^\/projetos$/,
  /^\/projetos\/\d+$/,
  /^\/comercial$/,
  /^\/documents$/,
  /^\/documents\/editor\/[a-z-]+$/,
  /^\/processos$/,
  /^\/processos\/\d+$/,
  /^\/plano-acao$/,
  /^\/lexia$/,
  /^\/notificacoes$/,
]

/** Returns the normalized in-app route, or null if it is not an allowed destination. */
export function validarRota(rota: unknown): string | null {
  if (typeof rota !== "string") return null
  const r = rota.trim()
  if (!r.startsWith("/") || r.startsWith("//")) return null // in-app, no protocol-relative
  const path = r.split("?")[0].split("#")[0]
  if (!ROTAS.some((re) => re.test(path))) return null
  const query = r.includes("?") ? r.split("?")[1].split("#")[0] : ""
  return query ? `${path}?${query}` : path
}

export const navegacaoTools = [
  defineTool({
    name: "navegar",
    kind: "client",
    description:
      "Leva o usuário a uma tela do app. Use quando ele pedir para 'abrir/ir para/mostrar' uma seção. " +
      "Rotas válidas: / (início), /financeiro (aceita ?tab=&mes=&periodo=&dir=&stat=&q=), /clientes, /clientes/<id>, " +
      "/contratos (?contrato=<id>), /agenda, /tarefas, /projetos, /projetos/<id>, /comercial (?tab=), /documents, " +
      "/processos (módulo unificado 'Casos & Processos'; aceita ?view=painel|processos|prazos|andamentos|captura e ?caso=<id> para abrir um caso), " +
      "/processos/<id>, /plano-acao, /lexia. " +
      "Obs.: /casos é legado e redireciona para /processos?view=processos — prefira /processos.",
    schema: z.object({
      rota: z.string().min(1).max(200).describe("Caminho interno do app, ex.: /financeiro?tab=lancamentos&stat=vencido"),
    }),
    run: async (_ctx, { rota }) => {
      const norm = validarRota(rota)
      if (!norm) throw new UserError(`Rota inválida: ${rota}`)
      return norm
    },
  }),
]
