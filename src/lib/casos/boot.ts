// Casos — conversão dos dados de processo legados disparada no BOOT do servidor
// (src/instrumentation.ts). SERVER ONLY.
//
// Roda a cada start (deploy/restart) em segundo plano — não atrasa o boot nem o
// derruba: qualquer falha vira log e o app segue normal. É idempotente (um caso
// já convertido não tem mais campos legados), então depois da 1ª execução só
// sobra uma consulta rápida. Conflitos de CNJ (mesmo número em 2 casos) nunca
// são tocados — ficam no log a cada boot até alguém resolver à mão.
// Log sem PII: só contagens, ids de caso e o nº CNJ (dado público do processo).
import { log } from "@/lib/log"

export function agendarConversaoCasosNoBoot(): void {
  void (async () => {
    try {
      const [{ prisma }, { converterDadosProcessuaisLegados }] = await Promise.all([
        import("@/lib/db"),
        import("./legado"),
      ])
      const r = await converterDadosProcessuaisLegados(prisma)
      const mudou = r.criados + r.completados + r.registrados
      if (mudou > 0) {
        log.info(
          {
            criados: r.criados,
            completados: r.completados,
            registrados: r.registrados,
            semCnjValido: r.semCnjValido.map((s) => s.casoId),
          },
          "casos: dados de processo legados convertidos em processos",
        )
      }
      if (r.conflitos.length) {
        log.warn(
          { conflitos: r.conflitos.map((c) => ({ casoId: c.casoId, numeroCnj: c.numeroCnj, outroCasoId: c.outroCasoId })) },
          "casos: CNJ já pertence a um processo de outro caso — resolva à mão (nada foi alterado nesses casos)",
        )
      }
      if (r.erros.length) {
        log.error(
          { erros: r.erros.map((e) => ({ casoId: e.casoId, erro: e.erro })) },
          "casos: falha ao converter alguns casos (os demais foram convertidos)",
        )
      }
    } catch (e) {
      log.error(
        { err: e instanceof Error ? `${e.name}: ${e.message}` : String(e) },
        "casos: conversão de dados de processo no boot falhou — o app segue normal",
      )
    }
  })()
}
