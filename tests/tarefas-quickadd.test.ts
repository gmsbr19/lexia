// Quick-add natural-language parser (Tarefas v2): #projeto resolves against the
// DYNAMIC project list (accent-insensitive substring), @pessoa against the
// active users, plus !prioridade, hora and date keywords.
import { describe, expect, it } from "vitest"
import { parseQuickAdd, tRel } from "@/components/tarefas/tf-meta"
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
