// Modelos de projeto (src/lib/projetos/modelo.ts): instanciação por grupos ×
// passos, prazos relativos, ligações dentro do grupo e validação de ciclo.
import { describe, expect, it } from "vitest"
import { ajustarGrupos, cicloNoModelo, gruposPadrao, instanciarModelo, resumoModelo, textoDiasAntes, type ModeloBase } from "@/lib/projetos/modelo"

const INTEG: ModeloBase = {
  palavraGrupo: "Protocolo",
  sufixoGrupo: " · 1º RI Taubaté",
  papeis: [
    { id: "apoio", rotulo: "Apoio", padraoUsuarioId: 3 },
    { id: "adv", rotulo: "Advogado", padraoUsuarioId: 2 },
  ],
  passos: [
    { chave: "doc", titulo: "Reunir documentação", papelId: "apoio", diasAntes: 15, prazoFatal: false, anteriores: [], checklist: ["Matrículas atualizadas", " "] },
    { chave: "cert", titulo: "Conferir certidões", papelId: "apoio", diasAntes: 10, prazoFatal: false, anteriores: ["doc"], checklist: [] },
    { chave: "itbi", titulo: "Solicitar ITBI", papelId: "adv", diasAntes: 8, prazoFatal: false, anteriores: ["doc"], checklist: [] },
    { chave: "prot", titulo: "Protocolar remessa", papelId: "adv", diasAntes: 0, prazoFatal: false, anteriores: ["cert", "itbi", "fantasma"], checklist: [] },
  ],
}

describe("modelos de projeto", () => {
  it("grupos padrão com nomes pré-gerados", () => {
    const g = gruposPadrao(INTEG, 2, "2026-09-23")
    expect(g).toEqual([
      { nome: "Protocolo 01 · 1º RI Taubaté", prazo: "2026-10-14" },
      { nome: "Protocolo 02 · 1º RI Taubaté", prazo: "2026-10-28" },
    ])
    expect(ajustarGrupos(g, 1, INTEG, "2026-09-23")).toHaveLength(1)
    expect(ajustarGrupos(g, 30, INTEG, "2026-09-23")).toHaveLength(12)
  })
  it("gera tarefas por grupo × passo, com prazo relativo e ligações no grupo", () => {
    const g = gruposPadrao(INTEG, 2, "2026-09-23")
    const t = instanciarModelo(INTEG, g, { apoio: 3, adv: null })
    expect(t).toHaveLength(8)
    const prot2 = t.find((x) => x.chave === "1:prot")!
    expect(prot2).toMatchObject({ grupo: "Protocolo 02 · 1º RI Taubaté", prazo: "2026-10-28", status: "wait", responsavelId: null })
    expect(prot2.anteriores).toEqual(["1:cert", "1:itbi"]) // "fantasma" descartada
    const doc1 = t.find((x) => x.chave === "0:doc")!
    expect(doc1).toMatchObject({ prazo: "2026-09-29", status: "todo", responsavelId: 3, checklist: ["Matrículas atualizadas"] })
  })
  it("resumo do assistente", () => {
    const g = gruposPadrao(INTEG, 2, "2026-09-23")
    expect(resumoModelo(INTEG, g)).toEqual({ grupos: 2, tarefas: 8, ligacoes: 8, prazoMin: "2026-09-29", prazoMax: "2026-10-28" })
  })
  it("texto de dias antes", () => {
    expect(textoDiasAntes(0)).toBe("no prazo do grupo")
    expect(textoDiasAntes(1)).toBe("1 dia antes")
    expect(textoDiasAntes(10)).toBe("10 dias antes")
  })
  it("editor rejeita passos em ciclo", () => {
    expect(cicloNoModelo(INTEG.passos)).toBeNull()
    const ciclo = [
      { ...INTEG.passos[0], anteriores: ["prot"] },
      ...INTEG.passos.slice(1),
    ]
    expect(cicloNoModelo(ciclo)).not.toBeNull()
  })
})
