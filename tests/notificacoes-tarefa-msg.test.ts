import { describe, expect, it } from "vitest"
import { msgTarefaAtribuida, msgTarefaConcluida } from "@/lib/notificacoes/tarefa-msg"

// Datas em São Paulo (UTC-3): 2026-07-07T17:30Z == 14:30 SP do dia 07/07.
const concluidoHoje = new Date("2026-07-07T17:30:00Z")
const concluidoOutroDia = new Date("2026-07-05T12:00:00Z") // 05/07 09:00 SP
const prazo = new Date("2026-07-10T15:00:00Z") // 10/07

describe("msgTarefaAtribuida", () => {
  it("nomeia o delegante e inclui o prazo", () => {
    expect(msgTarefaAtribuida({ atorNome: "Leonardo Collares", titulo: "Peticionar", prazo })).toBe(
      'Leonardo Collares delegou uma tarefa para você: "Peticionar" · vence 10/07',
    )
  })
  it("sem prazo, omite o sufixo", () => {
    expect(msgTarefaAtribuida({ atorNome: "Ana", titulo: "Ligar", prazo: null })).toBe(
      'Ana delegou uma tarefa para você: "Ligar"',
    )
  })
  it("sem nome do ator, cai no fallback genérico", () => {
    expect(msgTarefaAtribuida({ atorNome: null, titulo: "Revisar", prazo: null })).toBe(
      'Nova tarefa para você: "Revisar"',
    )
  })
})

describe("msgTarefaConcluida", () => {
  it("nomeia quem concluiu e diz 'hoje às HH:MM' quando foi hoje", () => {
    expect(
      msgTarefaConcluida({ atorNome: "Ana Souza", titulo: "Protocolar", concluidoEm: concluidoHoje, hoje: "2026-07-07" }),
    ).toBe('Ana Souza concluiu a tarefa: "Protocolar" · hoje às 14:30')
  })
  it("usa DD/MM às HH:MM quando não foi hoje", () => {
    expect(
      msgTarefaConcluida({ atorNome: "Ana", titulo: "X", concluidoEm: concluidoOutroDia, hoje: "2026-07-07" }),
    ).toBe('Ana concluiu a tarefa: "X" · 05/07 às 09:00')
  })
  it("sem nome do ator, fallback; sem timestamp, sem sufixo de tempo", () => {
    expect(msgTarefaConcluida({ atorNome: null, titulo: "Y", concluidoEm: null })).toBe(
      'Tarefa concluída: "Y"',
    )
  })
})
