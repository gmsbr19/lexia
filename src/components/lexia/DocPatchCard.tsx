"use client"

// Card "Aplicar/Aplicar todos" para as edições que a LexIA propõe ao documento
// ABERTO no editor flexível (bloco SSE "doc-patch"). Renderizado dentro do balão
// da LexIA SÓ no painel embutido (DocLexiaPanel) — o `onAccept` aplica as ops/
// campos no editor vivo. O estado "aplicado" é local ao card (efêmero; reaplicar
// é inócuo). Visual herdado do antigo DocLexiaChat para manter a familiaridade.
import { useEffect, useRef, useState } from "react"
import { Braces, Check, Edit3, Sparkles } from "lucide-react"
import type { CampoDetectado } from "@/lib/documents/model/campos"
import type { DocOp } from "@/lib/documents/model/ops"
import { tokens } from "@/styles/tokens.css"

const OP_LABEL: Record<DocOp["tipo"], string> = {
  preencher_campo: "Preencher campo",
  substituir_texto: "Substituir texto",
  inserir_paragrafo: "Inserir parágrafo",
  substituir_selecao: "Editar trecho selecionado",
  inserir_apos_selecao: "Inserir após a seleção",
  formatar_texto: "Formatar texto",
  formatar_selecao: "Formatar seleção",
}

const MARCA_LABEL: Record<string, string> = { bold: "negrito", italic: "itálico", underline: "sublinhado", strike: "tachado" }

function opLabel(op: DocOp): string {
  const marca = MARCA_LABEL[op.marca ?? ""] ?? op.marca ?? "formatação"
  switch (op.tipo) {
    case "preencher_campo":
      return `Preencher “${op.name ?? ""}” com “${op.valor ?? ""}”.`
    case "substituir_texto":
      return `Trocar “${op.de ?? ""}” por “${op.para ?? ""}”.`
    case "inserir_paragrafo":
      return `Inserir parágrafo: “${op.texto ?? ""}”.`
    case "substituir_selecao":
      return `Trocar o trecho selecionado por “${op.para ?? ""}”.`
    case "inserir_apos_selecao":
      return `Inserir após a seleção: “${op.texto ?? ""}”.`
    case "formatar_texto":
      return `${op.remover ? "Remover" : "Aplicar"} ${marca} em “${op.de ?? ""}”.`
    case "formatar_selecao":
      return `${op.remover ? "Remover" : "Aplicar"} ${marca} no trecho selecionado.`
  }
}

export interface DocPatchPayload {
  ops?: DocOp[]
  campos?: CampoDetectado[]
}

export function DocPatchCard({
  block,
  onAccept,
  autoApply = false,
}: {
  block: { type: "doc-patch"; ops: DocOp[]; campos?: CampoDetectado[] }
  onAccept: (payload: DocPatchPayload) => void
  /** Modo automático: aplica todas as alterações na hora, sem clicar em "Aplicar". */
  autoApply?: boolean
}) {
  const [applied, setApplied] = useState<Record<number, boolean>>({})
  const ops = block.ops ?? []
  const campos = block.campos ?? []
  const isCampos = campos.length > 0
  const itens = isCampos ? campos.length : ops.length

  // Auto-mode: aplica tudo assim que o card aparece (uma vez só).
  const autoRef = useRef(false)
  useEffect(() => {
    if (!autoApply || autoRef.current || itens === 0) return
    autoRef.current = true
    onAccept(isCampos ? { campos } : { ops })
    setApplied(() => {
      const n: Record<number, boolean> = {}
      for (let i = 0; i < itens; i++) n[i] = true
      return n
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApply])

  if (itens === 0) return null

  const allApplied = Array.from({ length: itens }).every((_, i) => applied[i])

  const applyOne = (i: number) => {
    if (applied[i]) return
    onAccept(isCampos ? { campos: [campos[i]] } : { ops: [ops[i]] })
    setApplied((a) => ({ ...a, [i]: true }))
  }
  const applyAll = () => {
    const pend = Array.from({ length: itens }).map((_, i) => i).filter((i) => !applied[i])
    if (!pend.length) return
    onAccept(isCampos ? { campos: pend.map((i) => campos[i]) } : { ops: pend.map((i) => ops[i]) })
    setApplied((a) => {
      const n = { ...a }
      pend.forEach((i) => (n[i] = true))
      return n
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ fontSize: 13, color: tokens.color.text, lineHeight: 1.55 }}>
        {isCampos ? (
          <>
            Encontrei <strong>{itens}</strong> {itens === 1 ? "trecho" : "trechos"} que pode{itens === 1 ? "" : "m"} virar campo:
          </>
        ) : (
          "Preparei as alterações abaixo — revise e aplique as que fizerem sentido:"
        )}
      </div>

      {itens > 1 && !allApplied && (
        <button onClick={applyAll} style={{ ...chipBtn, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={14} /> Aplicar todos
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {isCampos
          ? campos.map((c, i) => {
              const on = !!applied[i]
              return (
                <Row key={i} on={on} icon={on ? <Check size={13} /> : <Braces size={13} />} eyebrow={c.label || c.name} detail={c.exactText} onApply={() => applyOne(i)} />
              )
            })
          : ops.map((op, i) => {
              const on = !!applied[i]
              return <Row key={i} on={on} icon={on ? <Check size={13} /> : <Edit3 size={13} />} eyebrow={OP_LABEL[op.tipo]} detail={opLabel(op)} onApply={() => applyOne(i)} />
            })}
      </div>
    </div>
  )
}

function Row({ on, icon, eyebrow, detail, onApply }: { on: boolean; icon: React.ReactNode; eyebrow: string; detail: string; onApply: () => void }) {
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${on ? tokens.color.okSoft : tokens.color.border}`, background: tokens.color.surface, overflow: "hidden", opacity: on ? 0.62 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px" }}>
        <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", background: on ? tokens.color.okSoft : tokens.color.accentSoft, color: on ? tokens.color.ok : tokens.color.accent }}>
          {icon}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 500, color: tokens.color.textSubtle, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{eyebrow}</span>
        {on ? <span style={{ fontSize: 11.5, color: tokens.color.ok, fontWeight: 500, flexShrink: 0 }}>Aplicado</span> : <button onClick={onApply} style={chipBtn}>Aplicar</button>}
      </div>
      <div style={{ padding: "0 11px 10px", fontSize: 12.5, color: tokens.color.text, lineHeight: 1.5, letterSpacing: "-0.01em", wordBreak: "break-word" }}>{detail}</div>
    </div>
  )
}

const chipBtn: React.CSSProperties = {
  height: 28,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${tokens.color.borderStrong}`,
  background: "transparent",
  color: tokens.color.text,
  fontSize: 12,
  fontWeight: 500,
  fontFamily: tokens.font.sans,
  cursor: "pointer",
  flexShrink: 0,
}
