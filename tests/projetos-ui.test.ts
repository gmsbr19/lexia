// Pure client helpers for the Projetos & Tarefas workspace (pj-meta): the live
// project rollup (mirrors the server-derived progresso/saúde) and the wizard's
// weekend-only business-day preview.
import { describe, expect, it } from "vitest"
import { addBizDaysClient, dateAbs, dateFull, deriveRollup } from "@/components/projetos/pj-meta"
import { tRel } from "@/components/tarefas/tf-meta"
import type { TaskRow } from "@/lib/tarefas/types"

const task = (projetoId: number | null, over: Partial<TaskRow> = {}): TaskRow => ({
  id: Math.floor(Math.random() * 1e9),
  titulo: "t",
  status: "todo",
  done: false,
  prio: 4,
  projeto: "inbox",
  data: null,
  hora: null,
  prazo: null,
  notes: null,
  reminder: null,
  recur: null,
  ai: false,
  subtasks: [],
  dor: [],
  dod: [],
  responsavelId: null,
  casoId: null,
  clienteId: null,
  projetoId,
  vinculo: null,
  ordem: 0,
  ...over,
})

describe("addBizDaysClient (weekend-only preview)", () => {
  it("keeps a weekday when offset is 0", () => {
    expect(addBizDaysClient("2026-06-12", 0)).toBe("2026-06-12") // Friday
  })
  it("rolls a weekend start forward to Monday at offset 0", () => {
    expect(addBizDaysClient("2026-06-13", 0)).toBe("2026-06-15") // Sat -> Mon
  })
  it("skips the weekend when adding one business day from Friday", () => {
    expect(addBizDaysClient("2026-06-12", 1)).toBe("2026-06-15") // Fri +1 -> Mon
  })
  it("adds business days within a week", () => {
    expect(addBizDaysClient("2026-06-15", 3)).toBe("2026-06-18") // Mon +3 -> Thu
  })
})

describe("deriveRollup", () => {
  it("counts only tasks of the given project", () => {
    const tasks = [task(1), task(1, { done: true, status: "done" }), task(2)]
    const r = deriveRollup(1, tasks)
    expect(r.total).toBe(2)
    expect(r.done).toBe(1)
    expect(r.progresso).toBe(50)
  })
  it("flags atrasado when an open task is overdue", () => {
    const tasks = [task(1, { prazo: tRel(-2) }), task(1, { done: true, status: "done" })]
    const r = deriveRollup(1, tasks)
    expect(r.overdue).toBe(1)
    expect(r.saude).toBe("atrasado")
  })
  it("flags em_risco when a task is due within 2 days (none overdue)", () => {
    const r = deriveRollup(1, [task(1, { prazo: tRel(1) })])
    expect(r.overdue).toBe(0)
    expect(r.saude).toBe("em_risco")
  })
  it("is no_prazo with comfortable deadlines", () => {
    const r = deriveRollup(1, [task(1, { prazo: tRel(20) })])
    expect(r.saude).toBe("no_prazo")
  })
  it("returns zeros for a project with no tasks", () => {
    expect(deriveRollup(99, [task(1)])).toEqual({ total: 0, done: 0, overdue: 0, progresso: 0, saude: "no_prazo" })
  })
})

describe("date formatting", () => {
  it("dateAbs is day + short month", () => {
    expect(dateAbs("2026-06-09")).toBe("9 jun")
  })
  it("dateFull appends the year", () => {
    expect(dateFull("2026-06-09")).toBe("9 jun 2026")
  })
  it("renders an em dash for null", () => {
    expect(dateAbs(null)).toBe("—")
    expect(dateFull(null)).toBe("—")
  })
})
