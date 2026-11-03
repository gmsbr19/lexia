// Next.js — gancho de inicialização do servidor: `register` roda UMA vez por
// instância do servidor, antes de ele atender requisições (ver
// node_modules/next/dist/docs/01-app/02-guides/instrumentation.md).
//
// Só no runtime Node (Prisma não existe no Edge — o `if` segue o padrão da doc
// para o bundler descartar o import no build Edge) e nunca durante o
// `next build`. As tarefas daqui são disparadas em segundo plano: não atrasam
// o boot e uma falha nelas nunca impede o servidor de subir.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    try {
      const { agendarConversaoCasosNoBoot } = await import("./lib/casos/boot")
      agendarConversaoCasosNoBoot()
    } catch {
      /* nunca bloqueia o boot */
    }
  }
}
