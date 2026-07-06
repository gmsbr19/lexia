"use client"

// Peças de UI compartilhadas para anexos da LexIA: a faixa de chips de
// pré-visualização (composer + balão do usuário) e o botão de clipe com input
// de arquivo embutido. Estilo inline no padrão do kit (tokens via var(--…)).
import { useRef } from "react"
import { Icon } from "@/components/crm/crm-icons"
import { ACCEPT_ATTR, dataUrlImagem, ehImagem, rotuloTamanho } from "./anexos"
import type { ChatAnexo } from "./types"

/** Botão de clipe que abre o seletor e devolve os arquivos escolhidos. */
export function PaperclipButton({ onPick, disabled }: { onPick: (files: FileList) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={ref}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.length) onPick(e.target.files)
          e.target.value = "" // permite re-anexar o mesmo arquivo
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={disabled}
        title="Anexar imagem ou PDF"
        className="btn btn-ghost"
        style={{ width: 34, height: 34, padding: 0, borderRadius: 10, flexShrink: 0, cursor: disabled ? "default" : "pointer" }}
      >
        <Icon name="paperclip" size={17} />
      </button>
    </>
  )
}

function Thumb({ a, size = 26 }: { a: ChatAnexo; size?: number }) {
  const url = dataUrlImagem(a)
  const radius = size > 30 ? 10 : 6
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={a.nome} style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }} />
  }
  const img = ehImagem(a.mimeType)
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: img ? "var(--accent-soft)" : "var(--bg-sunken)",
        color: img ? "var(--accent)" : "var(--text-muted)",
      }}
    >
      <Icon name={img ? "eye" : "fileText"} size={size > 30 ? 18 : 14} />
    </span>
  )
}

/**
 * Faixa de chips. Com onRemove → chip compacto do composer (✕ pra remover). Sem
 * onRemove → prévia RICA dentro do balão enviado (Fase 7): thumb maior, cartão
 * de arquivo mais legível — a mesma peça, dois tamanhos pelo contexto de uso.
 */
export function AnexoChips({ anexos, onRemove }: { anexos: ChatAnexo[]; onRemove?: (i: number) => void }) {
  if (!anexos.length) return null
  const rica = !onRemove
  const thumbSize = rica ? 44 : 26
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: rica ? 7 : 8, justifyContent: rica ? "flex-end" : "flex-start" }}>
      {anexos.map((a, i) => (
        <div
          key={i}
          title={a.nome}
          style={{
            display: "flex",
            alignItems: "center",
            gap: rica ? 10 : 8,
            maxWidth: rica ? 280 : 240,
            padding: rica ? "7px 12px 7px 7px" : "5px 9px 5px 5px",
            borderRadius: rica ? 12 : 10,
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          <Thumb a={a} size={thumbSize} />
          <div style={{ minWidth: 0, lineHeight: 1.3 }}>
            <div style={{ fontSize: rica ? 13 : 12.5, fontWeight: rica ? 500 : 400, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: rica ? 190 : 150 }}>
              {a.nome}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>{rotuloTamanho(a.tamanho)}</div>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              title="Remover"
              className="btn btn-ghost"
              style={{ width: 22, height: 22, padding: 0, borderRadius: 6, flexShrink: 0, marginLeft: 2, cursor: "pointer" }}
            >
              <Icon name="x" size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
