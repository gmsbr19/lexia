// MCP — criação do usuário de serviço disparada no BOOT do servidor
// (src/instrumentation.ts). SERVER ONLY.
//
// Existe para dispensar o passo manual por SSH (`npm run mcp:user`) a cada
// deploy ou banco novo. Segue o padrão de ./../casos/boot.ts: roda em segundo
// plano, não atrasa o boot e qualquer falha vira log — nunca derruba o app.
// NUNCA duplica usuário (ver boot-core.ts: `User.email` é @unique e a decisão é
// "criar só se faltar"); uma corrida entre duas instâncias cai no P2002 do
// Prisma e é tratada como sucesso.
import { log } from "@/lib/log"
import { decidirUsuarioMcp, emailDoUsuarioMcp } from "./boot-core"

export function agendarUsuarioMcpNoBoot(): void {
  void (async () => {
    const email = emailDoUsuarioMcp(process.env.LEXIA_MCP_USER)
    try {
      const tokenDefinido = !!process.env.LEXIA_MCP_TOKEN
      if (!tokenDefinido) return // MCP desligado: nem consulta o banco
      const { prisma } = await import("@/lib/db")
      const existente = await prisma.user.findUnique({ where: { email }, select: { ativo: true } })
      const decisao = decidirUsuarioMcp({ tokenDefinido, existente })
      if (decisao === "ja-existe") return // caso comum a partir do 2º boot: silencioso
      if (decisao === "desativado-preservado") {
        log.warn(
          { email },
          "mcp: usuário de serviço está DESATIVADO — o conector vai recusar toda chamada. Reative em Configurações → Usuários (o boot não reativa de propósito: desativar é o jeito de revogar o MCP)",
        )
        return
      }
      const criado = await prisma.user.create({ data: { email, nome: "Servidor MCP", passwordHash: null, role: "admin" } })
      log.info({ email, id: criado.id }, "mcp: usuário de serviço criado no boot")
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") return // outra instância criou primeiro
      log.error(
        { email, err: e instanceof Error ? `${e.name}: ${e.message}` : String(e) },
        "mcp: criação do usuário de serviço no boot falhou — o app segue normal; rode `npm run mcp:user` ou refaça o deploy",
      )
    }
  })()
}
