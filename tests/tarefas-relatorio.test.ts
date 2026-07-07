import { describe, expect, it } from "vitest"
import { deveEnviarRelatorio, horaRelatorio, querRelatorioDiario } from "@/lib/notificacoes/preferencias-core"
import { agruparPorPrazo, montarEmailRelatorio, type TarefaLinha } from "@/lib/tarefas/relatorio"

const t = (id: number, prazoISO: string, extra?: Partial<TarefaLinha>): TarefaLinha => ({
  id,
  titulo: `Tarefa ${id}`,
  prazoISO,
  ...extra,
})

describe("preferências do relatório diário", () => {
  it("default é LIGADO às 08:00 (opt-out)", () => {
    expect(querRelatorioDiario({})).toBe(true)
    expect(horaRelatorio({})).toBe(8)
    expect(deveEnviarRelatorio({}, 8)).toBe(true)
    expect(deveEnviarRelatorio({}, 9)).toBe(false)
  })
  it("desligado explicitamente não envia", () => {
    expect(deveEnviarRelatorio({ relatorioDiario: false }, 8)).toBe(false)
  })
  it("respeita a hora configurada (ignora os minutos)", () => {
    expect(horaRelatorio({ relatorioHora: "09:30" })).toBe(9)
    expect(deveEnviarRelatorio({ relatorioHora: "09:30" }, 9)).toBe(true)
    expect(deveEnviarRelatorio({ relatorioHora: "09:30" }, 8)).toBe(false)
  })
})

describe("agruparPorPrazo", () => {
  it("separa atrasadas (prazo < hoje) de para-hoje (== hoje) e ignora futuras", () => {
    const linhas = [t(1, "2026-07-05"), t(2, "2026-07-07"), t(3, "2026-07-06"), t(4, "2026-07-09")]
    const { atrasadas, hoje } = agruparPorPrazo(linhas, "2026-07-07")
    expect(atrasadas.map((l) => l.id)).toEqual([1, 3])
    expect(hoje.map((l) => l.id)).toEqual([2])
  })
})

describe("montarEmailRelatorio", () => {
  it("dia vazio → subject 'tudo em dia' e mensagem positiva", () => {
    const out = montarEmailRelatorio("Ana Souza", { atrasadas: [], hoje: [], equipe: [] }, null)
    expect(out.subject).toBe("Tarefas do dia — tudo em dia")
    expect(out.html).toContain("Tudo em dia")
    expect(out.html).toContain("Bom dia, Ana")
  })
  it("conta atrasadas + hoje no subject e lista os títulos", () => {
    const out = montarEmailRelatorio(
      "Leo",
      { atrasadas: [t(1, "2026-07-05", { titulo: "Peticionar" })], hoje: [t(2, "2026-07-07", { titulo: "Ligar" })], equipe: [] },
      "https://app.exemplo",
    )
    expect(out.subject).toBe("Tarefas do dia — 1 atrasada, 1 para hoje")
    expect(out.html).toContain("Peticionar")
    expect(out.html).toContain("Ligar")
    expect(out.html).toContain("https://app.exemplo/tarefas") // CTA com base
  })
  it("inclui a seção de equipe só quando há linhas de equipe (com o responsável)", () => {
    const semEquipe = montarEmailRelatorio("Leo", { atrasadas: [], hoje: [], equipe: [] }, null)
    expect(semEquipe.html).not.toContain("Equipe — atrasadas")
    const comEquipe = montarEmailRelatorio(
      "Leo",
      { atrasadas: [], hoje: [], equipe: [t(9, "2026-07-01", { titulo: "Recurso", responsavelNome: "Ana" })] },
      null,
    )
    expect(comEquipe.html).toContain("Equipe — atrasadas (1)")
    expect(comEquipe.html).toContain("Recurso")
    expect(comEquipe.html).toContain("Ana")
  })
})
