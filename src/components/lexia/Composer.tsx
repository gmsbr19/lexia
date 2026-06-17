"use client"

// Message composer: auto-sizing textarea + send / stop button, com anexos
// (imagens/PDF) via clipe, arrastar-e-soltar e colar. Enter envia, Shift+Enter
// quebra linha. Durante o streaming, o botão vira um controle de Parar.
import { useState } from "react"
import { Icon } from "@/components/crm/crm-icons"
import { toast } from "@/lib/client/toast"
import { arquivosDoClipboard, lerArquivos, type ClientAnexo } from "./anexos"
import { AnexoChips, PaperclipButton } from "./AnexoChips"

export function Composer({
  onSend,
  onStop,
  streaming,
  placeholder = "Pergunte, busque ou diga o que fazer...",
}: {
  onSend: (text: string, anexos?: ClientAnexo[]) => void
  onStop: () => void
  streaming: boolean
  placeholder?: string
}) {
  const [input, setInput] = useState("")
  const [anexos, setAnexos] = useState<ClientAnexo[]>([])
  const [dragOver, setDragOver] = useState(false)

  const adicionar = async (files: FileList | File[]) => {
    const { anexos: novos, erros } = await lerArquivos(files, anexos)
    if (novos.length) setAnexos((prev) => [...prev, ...novos])
    erros.forEach((e) => toast(e, { kind: "error" }))
  }

  const submit = () => {
    const t = input.trim()
    if ((!t && anexos.length === 0) || streaming) return
    const enviar = anexos
    setInput("")
    setAnexos([])
    onSend(t, enviar.length ? enviar : undefined)
  }

  const canSend = (input.trim().length > 0 || anexos.length > 0) && !streaming

  return (
    <div style={{ padding: "16px 20px 24px", width: "100%", background: "transparent" }}>
      {anexos.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <AnexoChips anexos={anexos} onRemove={(i) => setAnexos((prev) => prev.filter((_, j) => j !== i))} />
        </div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!dragOver) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files?.length) void adicionar(e.dataTransfer.files)
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--bg-elevated)",
          border: `1px solid ${dragOver ? "var(--accent)" : "var(--border-strong)"}`,
          borderRadius: 24,
          padding: "8px 8px 8px 10px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
          transition: "border-color .15s",
        }}
      >
        <PaperclipButton onPick={(f) => void adicionar(f)} disabled={streaming} />

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          onPaste={(e) => {
            const files = arquivosDoClipboard(e.clipboardData)
            if (files.length) {
              e.preventDefault()
              void adicionar(files)
            }
          }}
          rows={1}
          placeholder={dragOver ? "Solte os arquivos aqui…" : placeholder}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            resize: "none",
            background: "transparent",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text)",
            maxHeight: 120,
            padding: "8px 0",
            letterSpacing: "-0.01em",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={streaming ? onStop : submit}
            disabled={!streaming && !canSend}
            title={streaming ? "Parar" : "Enviar"}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              flexShrink: 0,
              cursor: streaming || canSend ? "pointer" : "default",
              background: streaming ? "var(--bg-sunken)" : canSend ? "var(--bg-sunken)" : "transparent",
              color: streaming ? "var(--text)" : canSend ? "var(--text)" : "var(--text-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background .15s, color .15s",
            }}
          >
            <Icon name={streaming ? "x" : "send"} size={16} />
          </button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-subtle)", textAlign: "center", marginTop: 12, letterSpacing: "-0.01em" }}>
        A LexIA pode cometer erros. Confira informações importantes.
      </div>
    </div>
  )
}
