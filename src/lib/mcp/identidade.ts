// Ferramenta `quem_sou_eu` — só do MCP (o chat da LexIA nunca a vê: lá o
// usuário é óbvio). É o critério de aceite da fase 1 do módulo de WhatsApp:
// com o conector autenticado por OAuth, duas pessoas diferentes têm de receber
// cada uma o PRÓPRIO usuário na mesma ferramenta.
//
// Também serve de diagnóstico: diz COMO a chamada se autenticou — por OAuth
// (usuário real) ou pelo token estático antigo (usuário de serviço admin).
import { z } from "zod"
import { defineTool, type AgentTool } from "@/lib/lexia/agent/types"

export type ViaAutenticacao = "oauth" | "token-estatico"

export interface IdentidadeDaChamada {
  via: ViaAutenticacao
  clientId?: string
  /** Nome do aplicativo OAuth que pediu o acesso, quando houver. */
  clienteNome?: string
}

/**
 * Monta a ferramenta já amarrada à identidade DESTA requisição (o registro de
 * ferramentas acontece por requisição, então o fechamento é seguro: nunca
 * compartilha estado entre chamadas de usuários diferentes).
 */
export function identidadeTools(id: IdentidadeDaChamada): AgentTool[] {
  return [
    defineTool({
      name: "quem_sou_eu",
      description:
        "Diz qual usuário do Lexia está por trás desta conexão (nome, e-mail e papel) e como ela foi autenticada. " +
        "Use para confirmar de quem são os dados que você vai ler ou alterar.",
      schema: z.object({}),
      kind: "readonly",
      async run(ctx) {
        return {
          email: ctx.user.email,
          nome: ctx.user.nome,
          papel: ctx.user.role,
          autenticacao: id.via,
          ...(id.clientId ? { clienteOauth: id.clientId } : {}),
          ...(id.clienteNome ? { aplicativo: id.clienteNome } : {}),
          servidor: "lexia",
          aviso:
            id.via === "token-estatico"
              ? "Conexão pelo token estático antigo: as ações rodam como o usuário de serviço (admin), não como uma pessoa. " +
                "Reconecte o conector por OAuth para que cada pessoa use o próprio acesso."
              : undefined,
        }
      },
    }),
  ]
}
