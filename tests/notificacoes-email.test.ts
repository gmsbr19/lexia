import { describe, expect, it } from "vitest"
import { renderEmailNotificacao } from "@/lib/notificacoes/email/render"

describe("renderEmailNotificacao", () => {
  it("monta subject com o módulo + botão CTA com a URL absoluta", () => {
    const r = renderEmailNotificacao({ mensagem: "Prazo vence amanhã", modulo: "processos", prioridade: "alta", url: "https://lexia.app/processos/9" })
    expect(r.subject).toContain("Processos")
    expect(r.subject).toContain("Prazo vence amanhã")
    expect(r.html).toContain("https://lexia.app/processos/9")
    expect(r.html).toContain("Abrir no LexIA")
    expect(r.text).toContain("Abrir: https://lexia.app/processos/9")
  })

  it("escapa HTML da mensagem (sem injeção)", () => {
    const r = renderEmailNotificacao({ mensagem: 'Tarefa "<b>x</b>"', modulo: "tarefas", prioridade: "normal", url: null })
    expect(r.html).toContain("&lt;b&gt;")
    expect(r.html).not.toContain("<b>x</b>")
  })

  it("sem URL → sem CTA nem linha 'Abrir:'", () => {
    const r = renderEmailNotificacao({ mensagem: "Aviso", modulo: null, prioridade: "normal", url: null })
    expect(r.html).not.toContain("Abrir no LexIA")
    expect(r.text).not.toContain("Abrir:")
    expect(r.subject).toContain("LexIA")
  })
})
