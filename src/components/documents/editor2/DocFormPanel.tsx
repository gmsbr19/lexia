"use client"

// Left form panel for the flexible editor — the "LexIA - Documentos" design
// (docs2-form-panel): a filled-input (.f-in) form driven by the document's
// dynamic merge fields, a client picker (vincular existente / criar novo a
// partir do formulário), the letterhead picker, and a progress footer.
import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Search, User, UserPlus } from "lucide-react"
import { apiSend } from "@/lib/client/api"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import { tokens } from "@/styles/tokens.css"
import { normalizar } from "@/lib/text"
import type { PlaceholderDecl } from "@/lib/documents/model/placeholders"
import type { PlaceholderType } from "@/lib/documents/model/types"
import type { TimbradoRow } from "@/lib/documentos/types"
import type { ClienteRow } from "@/lib/finance/types"
import { fInput, fArea, fFlash } from "./fields.css"
import { fieldTypeMeta } from "./field-types"
import { TimbradoPicker } from "./TimbradoPicker"

const MONO_TYPES: PlaceholderType[] = ["cpf", "cnpj", "rg", "oab", "valor", "data", "numero", "processo"]
const OUTROS = "Outros campos"

const eyebrow: React.CSSProperties = { fontSize: 10.5, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: tokens.color.textSubtle, marginBottom: 7 }

// ── kit ─────────────────────────────────────────────────────────────────────
function StatusPill({ done, total }: { done: number; total: number }) {
  const complete = total > 0 && done >= total
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: complete ? "3px 9px 3px 7px" : "3px 10px",
        fontSize: 11,
        fontWeight: 500,
        fontVariantNumeric: "tabular-nums",
        color: complete ? "#020D25" : tokens.color.textSubtle,
        background: complete ? tokens.color.accentStrong : "transparent",
        border: `1px solid ${complete ? tokens.color.accentStrong : tokens.color.borderStrong}`,
        borderRadius: 999,
      }}
    >
      {complete && <Check size={10} strokeWidth={3} />}
      <span>
        {done} / {total}
      </span>
    </span>
  )
}

function FF({ label, affix, children }: { label: string; affix?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: tokens.color.textMuted }}>{label}</label>
        {affix}
      </div>
      {children}
    </div>
  )
}

// "no texto" — jump to (scroll + flash) this field in the document.
function LocateAffix({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ver no documento"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 20,
        padding: "0 7px",
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        fontFamily: tokens.font.sans,
        background: tokens.color.accentSoft,
        color: tokens.color.accent,
        fontSize: 10.5,
        fontWeight: 500,
        letterSpacing: "0.01em",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
      no texto
    </button>
  )
}

// glass dropdown (AI-detected `options`)
function Select({ value, onChange, options, flash }: { value: string; onChange: (v: string) => void; options: string[]; flash: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("pointerdown", onDown, true)
    return () => window.removeEventListener("pointerdown", onDown, true)
  }, [open])
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={flash ? `${fInput} ${fFlash}` : fInput} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left", borderColor: open ? tokens.color.accent : "transparent", color: value ? tokens.color.text : tokens.color.textSubtle }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || "Selecione…"}</span>
        <ChevronDown size={15} style={{ color: tokens.color.textSubtle, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .18s" }} />
      </button>
      {open && (
        <div className={lexGlassStrong} style={{ position: "absolute", top: 44, left: 0, right: 0, zIndex: 61, borderRadius: 12, padding: 6, maxHeight: 260, overflowY: "auto", ...glassElevation("0 18px 50px rgba(2,13,37,0.28)") }}>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o)
                setOpen(false)
              }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 9px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: tokens.font.sans, fontSize: 13, background: o === value ? tokens.color.surfaceHover : "transparent", color: tokens.color.text }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.color.surfaceHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = o === value ? tokens.color.surfaceHover : "transparent")}
            >
              <span style={{ flex: 1, minWidth: 0 }}>{o}</span>
              {o === value && <Check size={14} strokeWidth={2.4} style={{ color: tokens.color.accent }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// picks the control by the AI-detected metadata: options → dropdown, multiline →
// textarea, data → mono date input, else a text input.
function FieldControl({ ph, value, onChange, flash }: { ph: PlaceholderDecl; value: string; onChange: (v: string) => void; flash: boolean }) {
  if (ph.options?.length) return <Select value={value} onChange={onChange} options={ph.options} flash={flash} />
  const meta = fieldTypeMeta(ph.dataType)
  if (ph.multiline) {
    return <textarea className={flash ? `${fArea} ${fFlash}` : fArea} value={value} onChange={(e) => onChange(e.target.value)} placeholder={`A preencher · ${meta.label}`} rows={3} spellCheck={false} />
  }
  const mono = ph.dataType ? MONO_TYPES.includes(ph.dataType) : false
  return (
    <input
      className={flash ? `${fInput} ${fFlash}` : fInput}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={ph.dataType === "data" ? "dd/mm/aaaa" : `A preencher · ${meta.label}`}
      spellCheck={false}
      style={mono ? { fontFamily: tokens.font.mono, letterSpacing: 0 } : undefined}
    />
  )
}

// accordion section (title + done/total pill + chevron)
function FSection({ title, done, total, open, onToggle, children }: { title: string; done: number; total: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div>
      <button type="button" onClick={onToggle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", padding: "14px 20px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: tokens.font.sans }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: tokens.color.accent }}>{title}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusPill done={done} total={total} />
          <ChevronDown size={13} style={{ color: tokens.color.textSubtle, opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </span>
      </button>
      {open && <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>}
      <div style={{ height: 1, background: tokens.color.border }} />
    </div>
  )
}

// ── client picker (search existing / create new from form) ────────────────────
function ClientSelect({
  clienteId,
  clienteNome,
  onPick,
  onCreate,
  onUnlink,
}: {
  clienteId: number | null
  clienteNome: string | null
  onPick: (c: ClienteRow) => void
  onCreate: (nomeHint: string) => void
  onUnlink: () => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [clientes, setClientes] = useState<ClienteRow[] | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || clientes) return
    apiSend<ClienteRow[]>("/api/clientes", "GET")
      .then((rows) => setClientes(rows.filter((c) => c.classificacao === "cliente")))
      .catch(() => setClientes([]))
  }, [open, clientes])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("pointerdown", onDown, true)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onDown, true)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const list = useMemo(() => {
    const nq = normalizar(q.trim())
    return (clientes ?? []).filter((c) => !nq || normalizar(c.nome).includes(nq) || normalizar(c.cpfCnpj ?? "").includes(nq)).slice(0, 40)
  }, [clientes, q])

  const linked = clienteId != null

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          textAlign: "left",
          height: 46,
          padding: "0 11px",
          borderRadius: 10,
          cursor: "pointer",
          fontFamily: tokens.font.sans,
          border: `1px solid ${open ? tokens.color.accent : tokens.color.border}`,
          background: tokens.color.surface,
        }}
      >
        <span style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: linked ? tokens.color.accentSoft : tokens.color.bgSunken, color: linked ? tokens.color.accent : tokens.color.textSubtle, fontSize: 13, fontWeight: 600 }}>
          {linked ? (clienteNome || "?").trim().charAt(0).toUpperCase() : <User size={15} />}
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: linked ? tokens.color.text : tokens.color.textSubtle, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{linked ? clienteNome : "Selecionar cliente"}</span>
          <span style={{ display: "block", fontSize: 11, color: tokens.color.textSubtle }}>{linked ? "Vinculado a este documento" : "Vincular a um cliente existente"}</span>
        </span>
        {linked ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onUnlink()
            }}
            title="Desvincular"
            style={{ fontSize: 11, color: tokens.color.textSubtle, padding: "3px 6px", borderRadius: 6, flexShrink: 0 }}
          >
            desvincular
          </span>
        ) : (
          <ChevronDown size={15} style={{ color: tokens.color.textSubtle, flexShrink: 0 }} />
        )}
      </button>

      {open && (
        <div className={lexGlassStrong} style={{ position: "absolute", top: 52, left: 0, right: 0, zIndex: 61, borderRadius: 14, overflow: "hidden", ...glassElevation("0 18px 50px rgba(2,13,37,0.28)") }}>
          <div style={{ padding: 8, borderBottom: `1px solid ${tokens.color.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 10px", borderRadius: 9, border: `1px solid ${tokens.color.border}`, background: tokens.color.surface }}>
              <Search size={15} style={{ color: tokens.color.textSubtle }} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente por nome ou documento…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: tokens.font.sans, fontSize: 13, color: tokens.color.text }} />
            </div>
          </div>
          <div style={{ maxHeight: 264, overflowY: "auto", padding: 6 }}>
            {clientes == null ? (
              <div style={{ padding: "14px 10px", fontSize: 12.5, color: tokens.color.textSubtle, textAlign: "center" }}>Carregando…</div>
            ) : (
              list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onPick(c)
                    setOpen(false)
                    setQ("")
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "8px 9px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: tokens.font.sans, background: c.id === clienteId ? tokens.color.surfaceHover : "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = tokens.color.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = c.id === clienteId ? tokens.color.surfaceHover : "transparent")}
                >
                  <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: tokens.color.bgSunken, color: tokens.color.textMuted, fontSize: 12, fontWeight: 600 }}>{c.nome.charAt(0).toUpperCase()}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: tokens.color.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nome}</span>
                    <span style={{ display: "block", fontSize: 11, color: tokens.color.textSubtle, fontFamily: tokens.font.mono }}>{c.cpfCnpj || (c.tipo === "pj" ? "PJ" : "PF")}</span>
                  </span>
                  {c.id === clienteId && <Check size={15} strokeWidth={2.4} style={{ color: tokens.color.accent }} />}
                </button>
              ))
            )}
            {clientes != null && list.length === 0 && <div style={{ padding: "14px 10px", fontSize: 12.5, color: tokens.color.textSubtle, textAlign: "center" }}>Nenhum cliente encontrado.</div>}
          </div>
          <button
            type="button"
            onClick={() => {
              onCreate(q.trim())
              setOpen(false)
              setQ("")
            }}
            style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "11px 14px", borderTop: `1px solid ${tokens.color.border}`, border: "none", background: "transparent", cursor: "pointer", fontFamily: tokens.font.sans, color: tokens.color.accent }}
          >
            <span style={{ width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", background: tokens.color.accentSoft }}>
              <UserPlus size={14} />
            </span>
            <span style={{ minWidth: 0, textAlign: "left" }}>
              <span style={{ display: "block", fontSize: 12.5, fontWeight: 500 }}>Criar novo cliente {q.trim() ? `“${q.trim()}”` : ""}</span>
              <span style={{ display: "block", fontSize: 11, color: tokens.color.textSubtle }}>Cadastrado a partir dos dados do formulário</span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── panel ─────────────────────────────────────────────────────────────────────
export function DocFormPanel({
  placeholders,
  valores,
  setValor,
  timbrados,
  timbradoId,
  setTimbradoId,
  timbradoImagem,
  clienteId,
  clienteNome,
  onPickCliente,
  onCreateCliente,
  onUnlinkCliente,
  onLocateField,
  flashNames,
}: {
  placeholders: PlaceholderDecl[]
  valores: Record<string, string>
  setValor: (name: string, value: string) => void
  timbrados: TimbradoRow[]
  timbradoId: number | null
  setTimbradoId: (id: number | null) => void
  timbradoImagem: string | null
  clienteId: number | null
  clienteNome: string | null
  onPickCliente: (c: ClienteRow) => void
  onCreateCliente: (nomeHint: string) => void
  onUnlinkCliente: () => void
  onLocateField: (name: string) => void
  flashNames: Set<string>
}) {
  const done = placeholders.filter((p) => (valores[p.name] ?? "").trim()).length
  const total = placeholders.length
  const pending = total - done
  const pct = total ? Math.round((done / total) * 100) : 0

  // Group fields into the AI-detected sections, preserving first-appearance
  // order; fields with no section fall into "Outros campos" at the end.
  const sections = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, PlaceholderDecl[]>()
    for (const ph of placeholders) {
      const sec = ph.section?.trim() || OUTROS
      if (!map.has(sec)) {
        map.set(sec, [])
        if (sec !== OUTROS) order.push(sec)
      }
      map.get(sec)!.push(ph)
    }
    const out = order.map((label) => ({ label, fields: map.get(label)! }))
    if (map.has(OUTROS)) out.push({ label: OUTROS, fields: map.get(OUTROS)! })
    return out
  }, [placeholders])

  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const toggleSec = (label: string) => setClosed((p) => ({ ...p, [label]: !p[label] }))

  return (
    <aside style={{ width: "100%", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", minHeight: 0, background: tokens.color.bg, borderRight: `1px solid ${tokens.color.border}` }}>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {/* top: cliente + timbrado */}
        <div style={{ padding: "18px 20px" }}>
          <div style={eyebrow}>Cliente</div>
          <ClientSelect clienteId={clienteId} clienteNome={clienteNome} onPick={onPickCliente} onCreate={onCreateCliente} onUnlink={onUnlinkCliente} />
          <div style={{ height: 16 }} />
          <div style={eyebrow}>Papel timbrado</div>
          <TimbradoPicker timbrados={timbrados} value={timbradoId} onChange={setTimbradoId} selectedImage={timbradoImagem} />
        </div>
        <div style={{ height: 1, background: tokens.color.border }} />

        {/* campos — seções montadas pela IA */}
        {total === 0 ? (
          <div style={{ padding: "16px 20px", fontSize: 12.5, color: tokens.color.textSubtle, lineHeight: 1.55 }}>
            Nenhum campo ainda. Use <strong style={{ color: tokens.color.textMuted }}>Campo</strong> na barra ou peça à LexIA para <strong style={{ color: tokens.color.accent }}>detectar campos</strong> — ela agrupa em seções e escolhe os controles.
          </div>
        ) : (
          sections.map((sec) => {
            const secDone = sec.fields.filter((p) => (valores[p.name] ?? "").trim()).length
            return (
              <FSection key={sec.label} title={sec.label} done={secDone} total={sec.fields.length} open={!closed[sec.label]} onToggle={() => toggleSec(sec.label)}>
                {sec.fields.map((ph) => (
                  <FF key={ph.name} label={ph.label} affix={<LocateAffix onClick={() => onLocateField(ph.name)} />}>
                    <FieldControl ph={ph} value={valores[ph.name] ?? ""} onChange={(v) => setValor(ph.name, v)} flash={flashNames.has(ph.name)} />
                  </FF>
                ))}
              </FSection>
            )
          })
        )}
      </div>

      {/* progress footer */}
      {total > 0 && (
        <div style={{ borderTop: `1px solid ${tokens.color.border}`, padding: "12px 20px", background: tokens.color.bgSoft, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: tokens.color.textMuted, fontWeight: 500 }}>Progresso</span>
            <span style={{ fontSize: 12, color: tokens.color.textSubtle, fontVariantNumeric: "tabular-nums" }}>{pending === 0 ? "Tudo preenchido" : `${pending} campo${pending > 1 ? "s" : ""} pendente${pending > 1 ? "s" : ""}`}</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: tokens.color.bgSunken, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: tokens.color.accentStrong, borderRadius: 999, transition: "width .3s" }} />
          </div>
        </div>
      )}
    </aside>
  )
}
