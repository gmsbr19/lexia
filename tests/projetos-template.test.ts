import { describe, expect, it } from "vitest"
import { montarFeriados } from "@/lib/processos/feriados"
import type { PrazoContexto } from "@/lib/processos/prazo"
import {
  contarAtrasadas,
  instanciarTemplate,
  progressoProjeto,
  saudeProjeto,
  type TemplateItemInput,
} from "@/lib/projetos/template"

const ctx: PrazoContexto = { feriados: montarFeriados([2025, 2026, 2027]) }

describe("instanciarTemplate — prazos relativos em dias úteis", () => {
  it("offset 0 (base início) cai no próprio dia útil de início", () => {
    const itens: TemplateItemInput[] = [{ titulo: "A", offsetDias: 0, base: "inicio", ordem: 0 }]
    const [a] = instanciarTemplate(itens, { dataInicio: "2026-06-15", ctx }) // segunda
    expect(a.prazoISO).toBe("2026-06-15")
  })

  it("início no fim de semana é protraído ao 1º dia útil", () => {
    const itens: TemplateItemInput[] = [{ titulo: "A", offsetDias: 0, base: "inicio", ordem: 0 }]
    const [a] = instanciarTemplate(itens, { dataInicio: "2026-06-13", ctx }) // sábado
    expect(a.prazoISO).toBe("2026-06-15") // segunda
  })

  it("offset N (base início) conta N dias úteis após o início", () => {
    const itens: TemplateItemInput[] = [{ titulo: "A", offsetDias: 5, base: "inicio", ordem: 0 }]
    const [a] = instanciarTemplate(itens, { dataInicio: "2026-06-15", ctx })
    expect(a.prazoISO).toBe("2026-06-22") // seg 15 +5 dias úteis = seg 22
  })

  it("base 'anterior' encadeia a partir do prazo do item anterior (na ordem)", () => {
    const itens: TemplateItemInput[] = [
      { titulo: "A", offsetDias: 0, base: "inicio", ordem: 0 },
      { titulo: "B", offsetDias: 2, base: "anterior", ordem: 1 },
      { titulo: "C", offsetDias: 3, base: "anterior", ordem: 2 },
    ]
    const r = instanciarTemplate(itens, { dataInicio: "2026-06-15", ctx })
    expect(r.map((x) => x.prazoISO)).toEqual(["2026-06-15", "2026-06-17", "2026-06-22"])
  })

  it("o 1º item com base 'anterior' parte do início do projeto", () => {
    const itens: TemplateItemInput[] = [{ titulo: "A", offsetDias: 1, base: "anterior", ordem: 0 }]
    const [a] = instanciarTemplate(itens, { dataInicio: "2026-06-15", ctx })
    expect(a.prazoISO).toBe("2026-06-16")
  })

  it("ordena por `ordem` antes de encadear, mesmo recebendo itens embaralhados", () => {
    const itens: TemplateItemInput[] = [
      { titulo: "B", offsetDias: 2, base: "anterior", ordem: 1 },
      { titulo: "A", offsetDias: 0, base: "inicio", ordem: 0 },
    ]
    const r = instanciarTemplate(itens, { dataInicio: "2026-06-15", ctx })
    expect(r.map((x) => x.titulo)).toEqual(["A", "B"])
    expect(r.map((x) => x.prazoISO)).toEqual(["2026-06-15", "2026-06-17"])
  })
})

describe("derivações de progresso/saúde (puras)", () => {
  const hoje = "2026-06-15"

  it("progresso = % de tarefas concluídas (0 quando vazio)", () => {
    expect(progressoProjeto([])).toBe(0)
    expect(progressoProjeto([{ done: true }, { done: false }, { done: false }, { done: false }])).toBe(25)
    expect(progressoProjeto([{ done: true }, { done: true }])).toBe(100)
  })

  it("contarAtrasadas conta só tarefas abertas com prazo no passado", () => {
    const tarefas = [
      { done: false, prazo: "2026-06-10" }, // vencida
      { done: true, prazo: "2026-06-01" }, // concluída (não conta)
      { done: false, prazo: "2026-06-20" }, // futura
      { done: false, prazo: null }, // sem prazo
    ]
    expect(contarAtrasadas(tarefas, hoje)).toBe(1)
  })

  it("saúde: atrasado quando há tarefa aberta vencida", () => {
    const s = saudeProjeto({ prazo: null }, [{ done: false, prazo: "2026-06-10" }], hoje)
    expect(s).toBe("atrasado")
  })

  it("saúde: em risco quando uma tarefa aberta vence em ≤3 dias", () => {
    const s = saudeProjeto({ prazo: null }, [{ done: false, prazo: "2026-06-17" }], hoje)
    expect(s).toBe("em_risco")
  })

  it("saúde: no prazo quando nada está próximo nem vencido", () => {
    const s = saudeProjeto({ prazo: "2026-08-01" }, [{ done: false, prazo: "2026-07-15" }], hoje)
    expect(s).toBe("no_prazo")
  })

  it("saúde: projeto concluído nunca acende alerta, mesmo com tarefa vencida", () => {
    const s = saudeProjeto({ prazo: "2026-06-01", status: "concluido" }, [{ done: false, prazo: "2026-06-01" }], hoje)
    expect(s).toBe("no_prazo")
  })

  it("saúde: prazo-alvo do projeto vencido com trabalho aberto → atrasado", () => {
    const s = saudeProjeto({ prazo: "2026-06-10" }, [{ done: false, prazo: null }], hoje)
    expect(s).toBe("atrasado")
  })
})
