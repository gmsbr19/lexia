import { describe, expect, it } from "vitest"
import { rowsToCsv } from "@/components/ui/datagrid/csv"
import type { GridColumn } from "@/components/ui/datagrid/types"

interface Row { id: number; nome: string; etapa: string; valorCents: number | null }
const columns: GridColumn<Row>[] = [
  { key: "nome", label: "Nome", type: "text", accessor: (r) => r.nome },
  { key: "etapa", label: "Etapa", type: "select", accessor: (r) => r.etapa, options: [{ value: "novo", label: "Novo" }] },
  { key: "valorCents", label: "Valor", type: "money", accessor: (r) => r.valorCents },
]

describe("rowsToCsv", () => {
  it("emits a header row from column labels, ';'-separated", () => {
    const csv = rowsToCsv([], columns)
    expect(csv).toBe('"Nome";"Etapa";"Valor"')
  })

  it("resolves select values to their label via column.options", () => {
    const csv = rowsToCsv([{ id: 1, nome: "X", etapa: "novo", valorCents: null }], columns)
    expect(csv.split("\r\n")[1]).toBe('"X";"Novo";""')
  })

  it("formats money as comma-decimal reais", () => {
    const csv = rowsToCsv([{ id: 1, nome: "X", etapa: "novo", valorCents: 150050 }], columns)
    expect(csv.split("\r\n")[1]).toContain('"1500,50"')
  })

  it("doubles embedded quotes", () => {
    const csv = rowsToCsv([{ id: 1, nome: 'Diz "oi"', etapa: "novo", valorCents: null }], columns)
    expect(csv.split("\r\n")[1]).toContain('"Diz ""oi"""')
  })

  it("neutralizes a leading =/+/-/@ to prevent CSV formula injection", () => {
    for (const nome of ["=cmd|'/c calc'!A1", "+1+1", "-1+1", "@SUM(1,1)"]) {
      const csv = rowsToCsv([{ id: 1, nome, etapa: "novo", valorCents: null }], columns)
      const cell = csv.split("\r\n")[1].split(";")[0]
      expect(cell.startsWith(`"'${nome[0]}`)).toBe(true)
    }
  })
})
