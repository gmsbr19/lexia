"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronLeft, Star, Trash2, Upload } from "lucide-react"
import { apiSend } from "@/lib/client/api"
import type { TimbradoDetail } from "@/lib/documentos/types"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"

type Margins = { top: number; right: number; bottom: number; left: number }

const DEFAULT_MARGINS: Margins = { top: 34, right: 24, bottom: 28, left: 24 }

function MarginInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: tokens.color.textMuted, marginBottom: 5 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", height: 38, padding: "0 4px 0 11px", borderRadius: 8, border: `1px solid ${tokens.color.border}`, background: tokens.color.surface }}>
        <input
          type="number"
          value={value}
          min={0}
          max={80}
          onChange={(e) => onChange(Math.max(0, Math.min(80, Number(e.target.value) || 0)))}
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: tokens.font.sans, fontSize: 14, color: tokens.color.text, fontVariantNumeric: "tabular-nums" }}
        />
        <span style={{ fontSize: 12, color: tokens.color.textSubtle, padding: "0 8px", fontFamily: tokens.font.mono }}>mm</span>
      </div>
    </div>
  )
}

/** A4 thumbnail of an uploaded letterhead, with an optional dashed safe-area overlay. */
function Thumb({ imagem, w, margins, showSafe }: { imagem: string; w: number; margins?: Margins; showSafe?: boolean }) {
  const h = Math.round((w * 297) / 210)
  return (
    <div style={{ width: w, height: h, background: "#fff", borderRadius: 5, position: "relative", overflow: "hidden", boxShadow: "0 1px 2px rgba(2,13,37,0.1), 0 8px 22px rgba(2,13,37,0.14)", flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imagem} alt="" style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
      {showSafe && margins && (
        <div
          style={{
            position: "absolute",
            top: `${(margins.top / 297) * 100}%`,
            right: `${(margins.right / 210) * 100}%`,
            bottom: `${(margins.bottom / 297) * 100}%`,
            left: `${(margins.left / 210) * 100}%`,
            border: `1px dashed ${tokens.color.accentStrong}`,
            borderRadius: 2,
            background: "rgba(192,161,71,0.06)",
          }}
        />
      )}
    </div>
  )
}

export function TimbradosManager({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter()
  const [list, setList] = useState<TimbradoDetail[]>([])
  const [selId, setSelId] = useState<number | null>(null)
  const [margins, setMargins] = useState<Margins>(DEFAULT_MARGINS)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async (focusId?: number) => {
    try {
      const r = await apiSend<{ timbrados: TimbradoDetail[] }>("/api/documentos/timbrados?comImagem=1", "GET")
      setList(r.timbrados)
      setSelId((cur) => focusId ?? (cur && r.timbrados.some((t) => t.id === cur) ? cur : r.timbrados[0]?.id ?? null))
    } catch {
      // ignore
    }
  }
  useEffect(() => {
    void load()
  }, [])

  const cur = useMemo(() => list.find((t) => t.id === selId) ?? null, [list, selId])
  useEffect(() => {
    if (cur) setMargins({ top: cur.margemTop, right: cur.margemRight, bottom: cur.margemBottom, left: cur.margemLeft })
  }, [cur])

  const onFile = (file: File | undefined) => {
    setErr(null)
    if (!file || busy) return
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      setErr("Envie uma imagem PNG ou JPEG.")
      return
    }
    if (file.size > 7_000_000) {
      setErr("Imagem muito grande (máx. ~7 MB).")
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      setBusy(true)
      try {
        const res = await apiSend<{ ok: boolean; result: { id: number } }>("/api/documentos/timbrados", "POST", {
          nome: file.name.replace(/\.[^.]+$/, ""),
          imagem: String(reader.result),
          mimeType: file.type,
          margemTop: DEFAULT_MARGINS.top,
          margemRight: DEFAULT_MARGINS.right,
          margemBottom: DEFAULT_MARGINS.bottom,
          margemLeft: DEFAULT_MARGINS.left,
          padrao: list.length === 0,
        })
        await load(res.result?.id)
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Falha ao enviar o timbrado.")
      } finally {
        setBusy(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const salvarMargens = async () => {
    if (!cur || busy) return
    setBusy(true)
    setErr(null)
    try {
      await apiSend(`/api/documentos/timbrados/${cur.id}`, "PATCH", {
        margemTop: margins.top,
        margemRight: margins.right,
        margemBottom: margins.bottom,
        margemLeft: margins.left,
      })
      await load(cur.id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao salvar as margens.")
    } finally {
      setBusy(false)
    }
  }

  const definirPadrao = async (id: number) => {
    setErr(null)
    try {
      await apiSend(`/api/documentos/timbrados/${id}`, "PATCH", { padrao: true })
      await load(id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao definir padrão.")
    }
  }

  const excluir = async (id: number) => {
    if (!window.confirm("Excluir este papel timbrado? Documentos existentes mantêm o que já foi gerado.")) return
    setErr(null)
    try {
      await apiSend(`/api/documentos/timbrados/${id}`, "DELETE")
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao excluir.")
    }
  }

  const dropzone = (variant: "full" | "row") => (
    <div
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        onFile(e.dataTransfer.files?.[0])
      }}
      style={
        variant === "full"
          ? {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              cursor: "pointer",
              padding: "72px 24px",
              borderRadius: 16,
              border: `1.5px dashed ${drag ? tokens.color.borderGold : tokens.color.borderStrong}`,
              background: drag ? tokens.color.accentSoft : tokens.color.surface,
              transition: "background .15s, border-color .15s",
            }
          : {
              display: "flex",
              alignItems: "center",
              gap: 11,
              cursor: "pointer",
              padding: "13px 14px",
              borderRadius: 12,
              border: `1.5px dashed ${drag ? tokens.color.borderGold : tokens.color.borderStrong}`,
              background: drag ? tokens.color.accentSoft : "transparent",
              transition: "background .15s, border-color .15s",
            }
      }
    >
      {variant === "full" ? (
        <>
          <span style={{ width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", background: tokens.color.accentSoft, color: tokens.color.accent, marginBottom: 16 }}>
            <Upload size={22} />
          </span>
          <div style={{ fontSize: 16, fontWeight: 500, color: tokens.color.text }}>Envie seu primeiro papel timbrado</div>
          <div style={{ fontSize: 13, color: tokens.color.textMuted, marginTop: 6, maxWidth: 380, lineHeight: 1.5 }}>
            Arraste uma imagem A4 (PNG ou JPG) ou clique para selecionar. Depois você define a área de segurança onde o texto pode entrar.
          </div>
        </>
      ) : (
        <>
          <span style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: tokens.color.accentSoft, color: tokens.color.accent, flexShrink: 0 }}>
            <Upload size={16} />
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: tokens.color.text }}>Enviar timbrado</div>
            <div style={{ fontSize: 11.5, color: tokens.color.textSubtle }}>Arraste ou clique · PNG/JPG</div>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div style={{ height: "100%", overflowY: "auto", width: "100%" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: embedded ? "26px 36px 36px" : "28px 24px" }}>
        {!embedded && (
          <button
            onClick={() => router.push("/documents")}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", color: tokens.color.textMuted, cursor: "pointer", fontSize: 13, marginBottom: 16 }}
          >
            <ChevronLeft size={14} /> Documentos
          </button>
        )}

        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.025em", color: tokens.color.text }}>Papéis timbrados</h1>
          <p style={{ margin: "5px 0 0", fontSize: 14, color: tokens.color.textMuted }}>O timbrado é o fundo da folha A4 — o PDF sai idêntico a este preview.</p>
        </div>

        {err && <div style={{ color: "var(--crit)", fontSize: 13, marginBottom: 14 }}>{err}</div>}

        <input ref={fileRef} type="file" accept="image/png,image/jpeg" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0] ?? undefined)} />

        {list.length === 0 ? (
          dropzone("full")
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>
            {/* left: upload + list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dropzone("row")}
              {list.map((t) => {
                const on = t.id === selId
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelId(t.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 11,
                      cursor: "pointer",
                      borderRadius: 12,
                      border: `1px solid ${on ? tokens.color.borderGold : tokens.color.border}`,
                      background: on ? tokens.color.accentSoft : tokens.color.surface,
                      transition: "background .14s, border-color .14s",
                    }}
                  >
                    <Thumb imagem={t.imagem} w={46} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: tokens.color.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.nome}</span>
                        {t.padrao && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 18, padding: "0 7px", borderRadius: 6, fontSize: 10.5, fontWeight: 500, background: tokens.color.accentSoft, color: tokens.color.accent }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                            Padrão
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: tokens.color.textSubtle, marginTop: 2 }}>
                        Margens {t.margemTop}/{t.margemRight}/{t.margemBottom}/{t.margemLeft} mm
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* right: safe-area editor */}
            {cur && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 28, background: tokens.color.surface, border: `1px solid ${tokens.color.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <Thumb imagem={cur.imagem} w={360} margins={margins} showSafe />
                  <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: tokens.color.textMuted }}>
                    <span style={{ width: 16, height: 10, border: `1px dashed ${tokens.color.accentStrong}`, borderRadius: 2, display: "inline-block" }} />
                    Área de segurança — o texto fica dentro do tracejado
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: tokens.color.text, letterSpacing: "-0.01em" }}>{cur.nome}</div>
                  <div style={{ fontSize: 12, color: tokens.color.textSubtle, marginBottom: 18 }}>Margens de segurança</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <MarginInput label="Topo" value={margins.top} onChange={(v) => setMargins({ ...margins, top: v })} />
                    <MarginInput label="Direita" value={margins.right} onChange={(v) => setMargins({ ...margins, right: v })} />
                    <MarginInput label="Base" value={margins.bottom} onChange={(v) => setMargins({ ...margins, bottom: v })} />
                    <MarginInput label="Esquerda" value={margins.left} onChange={(v) => setMargins({ ...margins, left: v })} />
                  </div>
                  <button onClick={() => void salvarMargens()} disabled={busy} className={btn({ variant: "primary" })} style={{ width: "100%", marginTop: 18, height: 38, fontSize: 13 }}>
                    <Check size={15} /> Salvar margens
                  </button>
                  <div style={{ height: 1, background: tokens.color.border, margin: "16px 0" }} />
                  {!cur.padrao && (
                    <button onClick={() => void definirPadrao(cur.id)} className={btn({ variant: "secondary" })} style={{ width: "100%", height: 36, fontSize: 13, marginBottom: 8 }}>
                      <Star size={14} /> Definir como padrão
                    </button>
                  )}
                  <button onClick={() => void excluir(cur.id)} className={btn({ variant: "ghost" })} style={{ width: "100%", height: 36, fontSize: 13, color: "var(--crit)" }}>
                    <Trash2 size={14} /> Excluir timbrado
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
