import { describe, expect, it } from "vitest"
import { linkParaNotificacao } from "@/lib/notificacoes/links"

describe("linkParaNotificacao", () => {
  it("mapeia por refTipo com id", () => {
    expect(linkParaNotificacao("tarefas", "tarefa", 12)).toBe("/tarefas?tarefa=12")
    expect(linkParaNotificacao("agenda", "evento", 3)).toBe("/agenda")
    expect(linkParaNotificacao("processos", "processo", 7)).toBe("/processos/7")
    expect(linkParaNotificacao("comercial", "lead", 4)).toBe("/comercial?tab=leads")
    expect(linkParaNotificacao("documentos", "documento", 8)).toBe("/contratos?contrato=8")
    expect(linkParaNotificacao("sistema", "captura", null)).toBe("/processos?view=captura")
  })

  it("prazo usa o processoId quando disponível, senão a fila de prazos", () => {
    expect(linkParaNotificacao("processos", "prazo", 5, { processoId: 9 })).toBe("/processos/9")
    expect(linkParaNotificacao("processos", "prazo", 5)).toBe("/processos?view=prazos")
    expect(linkParaNotificacao("processos", "publicacao", 2)).toBe("/processos?view=andamentos")
  })

  it("cai no índice do módulo sem refTipo reconhecido", () => {
    expect(linkParaNotificacao("comercial", null, null)).toBe("/comercial")
    expect(linkParaNotificacao("tarefas", null, null)).toBe("/tarefas")
    expect(linkParaNotificacao("documentos", "desconhecido", 1)).toBe("/documents")
  })

  it("retorna null sem módulo nem refTipo", () => {
    expect(linkParaNotificacao(null, null, null)).toBeNull()
    expect(linkParaNotificacao("sistema", null, null)).toBeNull()
  })

  it("módulo ia (LexIA) cai no índice /lexia", () => {
    expect(linkParaNotificacao("ia", null, null)).toBe("/lexia")
  })
})
