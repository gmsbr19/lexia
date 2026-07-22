"use client"

// LexIA · Comercial v2 — Leads kanban (ported faithfully from the design
// handoff src/com2/cx-leads-views.jsx CxLeadsKanban). Columns = the open
// stages (configured order) + the fixed terminals Ganho/Perdido, with sticky
// column headers, count + estimated sum per column and dashed placeholders.
// Dragging onto an open stage moves the lead (optimistic, same POST as the
// table's stage control); dropping onto Ganho/Perdido opens the dedicated
// Converter/Perdido flows — they collect the mandatory extras first.
import React, { useCallback, useMemo, useState } from "react"
import { Icon } from "./cm-icons"
import { CxAvatar, CxNum, CxPhone, CxQualBadge, CX_TEMP_MAP } from "./cx-kit"
import { cmCompact, type CmLeadScore } from "./cm-meta"
import type { CmDatasetLead, CmUsuarioOption } from "@/lib/comercial/types"

const COL_CAP = 30

interface Column { key: string; nome: string; cor: string | null; terminal: "ganho" | "perdido" | null }

const CxKanbanCard = React.memo(function CxKanbanCard({ l, score, campMap, userMap, onEdit, onDragStart }: {
  l: CmDatasetLead
  score: CmLeadScore | undefined
  campMap: Map<number, string>
  userMap: Map<number, string>
  onEdit: (l: CmDatasetLead) => void
  onDragStart: (e: React.DragEvent, l: CmDatasetLead) => void
}) {
  const temp = l.temperatura ? CX_TEMP_MAP[l.temperatura] : null
  const respNome = l.responsavelUserId != null ? userMap.get(l.responsavelUserId) ?? null : null
  return (
    <div draggable onDragStart={(e) => onDragStart(e, l)} onClick={() => onEdit(l)} className="cx-kcard" style={{ padding: "10px 11px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 7, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, boxShadow: "var(--shadow-sm)" }}>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", lineHeight: 1.35, letterSpacing: "-0.01em" }}>{l.nome}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {temp && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 20, padding: "0 8px", borderRadius: 5, fontSize: 11, fontWeight: 500, color: temp.color, background: temp.color + "1c" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: temp.color }} />{temp.label}
          </span>
        )}
        {score && <CxQualBadge state={score.estado} size="sm" />}
      </div>
      {l.contato && (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }} onClick={(e) => e.stopPropagation()}>
          <Icon name="phone" size={11} style={{ color: "var(--text-subtle)" }} />
          <CxPhone value={l.contato} size={11.5} color="var(--text-subtle)" />
        </div>
      )}
      {l.campanhaId != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <Icon name="megaphone" size={11} style={{ flexShrink: 0 }} />{campMap.get(l.campanhaId)}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 2, paddingTop: 7, borderTop: "1px solid var(--border)" }}>
        <CxAvatar id={l.responsavelUserId} nome={respNome} size={20} />
        <CxNum size={12} weight={500} color="var(--text-muted)">{cmCompact(l.valorEstimadoCents || 0)}</CxNum>
      </div>
    </div>
  )
})

export function CmKanban({ leads, stages, usuarios, campMap, scores, onMove, onConvert, onLose, onEdit }: {
  leads: CmDatasetLead[]
  stages: { key: string; nome: string; cor: string | null }[]
  usuarios: CmUsuarioOption[]
  campMap: Map<number, string>
  scores: Map<number, CmLeadScore>
  onMove: (id: number, etapa: string) => void
  onConvert: (l: CmDatasetLead) => void
  onLose: (l: CmDatasetLead) => void
  onEdit: (l: CmDatasetLead) => void
}) {
  const [over, setOver] = useState<string | null>(null)
  const [shownByCol, setShownByCol] = useState<Record<string, number>>({})

  const userMap = useMemo(() => new Map(usuarios.map((u) => [u.id, u.nome])), [usuarios])

  const columns: Column[] = useMemo(
    () => [
      ...stages.map((s) => ({ key: s.key, nome: s.nome, cor: s.cor, terminal: null as null })),
      { key: "ganho", nome: "Ganho", cor: "#2E9E5B", terminal: "ganho" as const },
      { key: "perdido", nome: "Perdido", cor: "#C0492F", terminal: "perdido" as const },
    ],
    [stages],
  )

  const byCol = useMemo(() => {
    const m = new Map<string, CmDatasetLead[]>()
    for (const c of columns) m.set(c.key, [])
    for (const l of leads) {
      const bucket = m.get(l.etapa)
      // leads whose etapa isn't a known column (removed stage) are hidden here;
      // they still appear in the table view.
      if (bucket) bucket.push(l)
    }
    return m
  }, [leads, columns])

  const showMoreCol = useCallback((key: string) => setShownByCol((s) => ({ ...s, [key]: (s[key] ?? COL_CAP) + COL_CAP })), [])

  const onDragStart = useCallback((e: React.DragEvent, l: CmDatasetLead) => {
    e.dataTransfer.setData("text/plain", String(l.id))
    e.dataTransfer.effectAllowed = "move"
  }, [])
  const onDrop = (e: React.DragEvent, col: Column) => {
    e.preventDefault()
    setOver(null)
    const raw = e.dataTransfer.getData("text/plain")
    const id = raw ? Number(raw) : null
    const l = id != null ? leads.find((x) => x.id === id) : null
    if (!l || l.etapa === col.key) return
    if (col.terminal === "ganho") onConvert(l)
    else if (col.terminal === "perdido") onLose(l)
    else onMove(l.id, col.key)
  }

  return (
    <div style={{ display: "flex", gap: 10, height: "100%", paddingRight: 32, paddingBottom: 20, alignItems: "stretch" }}>
      {columns.map((c) => {
        const list = byCol.get(c.key) ?? []
        const sum = list.reduce((a, l) => a + (l.valorEstimadoCents || 0), 0)
        const isTerm = c.terminal != null
        const cor = c.cor ?? "#7C8AA5"
        const capHere = shownByCol[c.key] ?? COL_CAP
        const visList = list.slice(0, capHere)
        const remainingHere = list.length - visList.length
        return (
          <div
            key={c.key}
            onDragOver={(e) => { e.preventDefault(); setOver(c.key) }}
            onDragLeave={() => setOver((o) => (o === c.key ? null : o))}
            onDrop={(e) => onDrop(e, c)}
            style={{ width: 262, flexShrink: 0, display: "flex", flexDirection: "column", background: over === c.key ? "var(--accent-soft)" : "transparent", borderRadius: "var(--r-md)", transition: "background .12s", minHeight: 0, padding: "0 3px" }}
          >
            <div style={{ padding: "4px 6px 8px", flexShrink: 0, position: "sticky", top: 0, background: "var(--bg)", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", borderRadius: 6, fontSize: 12, fontWeight: 500, color: cor, background: cor + "20" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: cor }} />{c.nome}
                </span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-subtle)", fontFeatureSettings: '"tnum"' }}>{list.length}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>{cmCompact(sum)}</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "2px 3px 8px", display: "flex", flexDirection: "column", gap: 7, minHeight: 60 }}>
              {visList.map((l) => <CxKanbanCard key={l.id} l={l} score={scores.get(l.id)} campMap={campMap} userMap={userMap} onEdit={onEdit} onDragStart={onDragStart} />)}
              {list.length === 0 && <div style={{ fontSize: 11.5, color: "var(--text-subtle)", textAlign: "center", padding: "20px 8px", border: "1px dashed var(--border)", borderRadius: 8 }}>{isTerm ? `Arraste um cartão para ${c.nome.toLowerCase()}` : "Sem leads"}</div>}
              {remainingHere > 0 && (
                <button className="btn btn-secondary" onClick={() => showMoreCol(c.key)} style={{ height: 30, fontSize: 11.5, flexShrink: 0 }}>Mostrar mais ({remainingHere})</button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
