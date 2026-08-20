// Quick-add natural-language parser (Tarefas v2): #projeto resolves against the
// DYNAMIC project list (accent-insensitive substring), @pessoa against the
// active users, plus !prioridade, hora and date keywords.
//
// Date/time resolution is delegated to src/lib/datas/nl.ts (parseDataNatural);
// its own vocabulary coverage is tested in tests/datas-nl.test.ts — the cases
// below only prove the wiring (delegation) still yields the exact same
// contract, plus that the newly-shared vocabulary now works inside quick-add
// text for free.
import { describe, expect, it } from "vitest"
import { parseQuickAdd, tRel, TODAY, tParse } from "@/components/tarefas/tf-meta"
import type { TeamMember } from "@/lib/tarefas/types"

const socios: TeamMember[] = [
  { id: 1, nome: "João Prado", first: "João", initials: "JP", color: "#111", role: "Sócio" },
  { id: 2, nome: "Joana Silva", first: "Joana", initials: "JS", color: "#222", role: "Advogada" },
  { id: 3, nome: "Rafael Moraes", first: "Rafael", initials: "RM", color: "#333", role: "Sócio" },
]
const projetos = [
  { id: 10, nome: "Contencioso trabalhista" },
  { id: 11, nome: "Societário & M&A" },
]
const ctx = { socios, projetos }

describe("parseQuickAdd — projeto dinâmico (#token)", () => {
  it("resolves #token by accent-insensitive substring of the project name", () => {
    const r = parseQuickAdd("Protocolar recurso #societario", ctx)
    expect(r.projetoId).toBe(11)
    expect(r.titulo).toBe("Protocolar recurso")
  })
  it("matches partial words (\"#trabalhista\")", () => {
    expect(parseQuickAdd("Audiência #trabalhista", ctx).projetoId).toBe(10)
  })
  it("leaves projetoId null (Entrada) when the token matches nothing", () => {
    const r = parseQuickAdd("Revisar contrato #inexistente", ctx)
    expect(r.projetoId).toBeNull()
    expect(r.titulo).toBe("Revisar contrato")
  })
})

describe("parseQuickAdd — pessoas, prioridade, datas", () => {
  it("resolves a unique @first-name prefix", () => {
    expect(parseQuickAdd("Ligar para o perito @rafael", ctx).responsavelId).toBe(3)
  })
  it("flags ambiguous assignee prefixes", () => {
    const r = parseQuickAdd("Enviar minuta @joa", ctx)
    expect(r.responsavelId).toBeNull()
    expect(r.assigneeAmbiguous).toBe(true)
  })
  it("parses !alta and inline time, defaulting the date to today", () => {
    const r = parseQuickAdd("Protocolar recurso 14h !alta", ctx)
    expect(r.prio).toBe(2)
    expect(r.hora).toBe("14:00")
    expect(r.data).toBe(tRel(0))
  })
  it("parses the amanhã keyword", () => {
    expect(parseQuickAdd("Reunião amanhã", ctx).data).toBe(tRel(1))
  })
})

describe("parseQuickAdd — vocabulary shared via src/lib/datas/nl.ts (delegation)", () => {
  it("understands 'próxima semana' inside quick-add text", () => {
    const r = parseQuickAdd("Reunião próxima semana", ctx)
    expect(r.titulo).toBe("Reunião")
    expect(r.data).not.toBeNull()
    expect(r.data! > TODAY()).toBe(true)
    expect(tParse(r.data!).getDay()).toBe(1) // segunda-feira
  })
  it("understands 'dia N' inside quick-add text", () => {
    const r = parseQuickAdd("Pagar conta dia 15", ctx)
    expect(r.titulo).toBe("Pagar conta")
    expect(r.data).not.toBeNull()
    expect(tParse(r.data!).getDate()).toBe(15)
    expect(r.data! >= TODAY()).toBe(true)
  })
  it("still strips a bare time token and defaults the date to today (unchanged contract)", () => {
    const r = parseQuickAdd("Ligar para o cliente 9h30", ctx)
    expect(r.titulo).toBe("Ligar para o cliente")
    expect(r.hora).toBe("09:30")
    expect(r.data).toBe(tRel(0))
  })
})
