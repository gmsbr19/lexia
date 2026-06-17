import { describe, expect, it } from "vitest"
import { bucketTempo, iconeNotificacao, rotuloModulo, tempoRelativo, tomNotificacao } from "@/components/shell/notif-ui"

const min = (n: number) => new Date(Date.now() - n * 60_000).toISOString()

describe("tomNotificacao", () => {
  it("reserva o dourado (ai) p/ a LexIA — por módulo ou por tipo", () => {
    expect(tomNotificacao({ modulo: "ia", tipo: "lexia", prioridade: "normal" })).toBe("ai")
    expect(tomNotificacao({ modulo: "documentos", tipo: "lexia", prioridade: "normal" })).toBe("ai")
  })
  it("deriva crit/warn da prioridade e neutro do resto", () => {
    expect(tomNotificacao({ modulo: "processos", tipo: "prazo", prioridade: "critica" })).toBe("crit")
    expect(tomNotificacao({ modulo: "processos", tipo: "prazo", prioridade: "alta" })).toBe("warn")
    expect(tomNotificacao({ modulo: "tarefas", tipo: "tarefa", prioridade: "normal" })).toBe("neutral")
  })
  it("LexIA vence a prioridade alta (continua dourado, não âmbar)", () => {
    expect(tomNotificacao({ modulo: "ia", tipo: "lexia", prioridade: "alta" })).toBe("ai")
  })
})

describe("iconeNotificacao", () => {
  it("prefere o ícone do tipo, com fallback no módulo e por fim no sino", () => {
    expect(iconeNotificacao("processos", "prazo")).toBe("flag")
    expect(iconeNotificacao("ia", "lexia")).toBe("sparkles")
    expect(iconeNotificacao("tarefas", "desconhecido")).toBe("listChecks")
    expect(iconeNotificacao(null, "desconhecido")).toBe("bell")
  })
})

describe("rotuloModulo", () => {
  it("usa o rótulo do módulo (LexIA p/ ia) e fallback sem módulo", () => {
    expect(rotuloModulo("ia")).toBe("LexIA")
    expect(rotuloModulo("processos")).toBe("Processos & Prazos")
    expect(rotuloModulo(null)).toBe("LexIA")
  })
})

describe("tempoRelativo", () => {
  it("formata janelas relativas curtas", () => {
    expect(tempoRelativo(min(0))).toBe("agora")
    expect(tempoRelativo(min(5))).toBe("há 5 min")
    expect(tempoRelativo(min(120))).toBe("há 2 h")
  })
  it("trata ISO inválido sem quebrar", () => {
    expect(tempoRelativo("not-a-date")).toBe("")
  })
})

describe("bucketTempo", () => {
  it("agrupa por dia de calendário", () => {
    expect(bucketTempo(new Date().toISOString())).toBe("Hoje")
    // 50h atrás cai em Anteriores (passou de ontem)
    expect(bucketTempo(min(50 * 60))).toBe("Anteriores")
  })
})
