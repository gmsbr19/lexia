"use client"

// Projetos & Tarefas — Templates: gallery + ordenable editor (sócio) + the
// instantiation wizard. The wizard PREVIEW computes deadlines client-side
// (weekends only); the authoritative CPC deadlines (holidays too) are recomputed
// server-side by /api/projetos/instanciar.
import { useMemo, useState, type CSSProperties } from "react"
import type { IdNome, TeamMember } from "@/lib/tarefas/types"
import { PRIO } from "@/lib/tarefas/types"
import type { TemplateBase, TemplateView } from "@/lib/projetos/types"
import { Icon, type TfIconName } from "@/components/tarefas/tf-icons"
import { AssigneeAvatar, Menu, MenuItem, PriorityFlag } from "@/components/tarefas/tf-kit"
import { TODAY } from "@/components/tarefas/tf-meta"
import { addBizDaysClient, dateFull } from "./pj-meta"
import {
  AreaTag,
  COLOR_CHOICES,
  ICON_CHOICES,
  ModalHeader,
  Overlay,
  PageFrame,
  PageHeader,
  useAreaOptions,
  fieldCol,
  fieldLbl,
  pickerStyle,
} from "./pj-kit"

// ── form value types (shared with the workspace) ─────────────────────────────
export interface TemplateItemForm {
  key: string
  titulo: string
  prio: number
  responsavelPlaceholder: string
  offsetDiasUteis: number
  base: TemplateBase
  dor: string[]
  dod: string[]
}
export interface TemplateFormValue {
  id?: number
  nome: string
  descricao: string
  area: string
  cor: string
  icone: string
  itens: TemplateItemForm[]
}
export interface InstanciarPayload {
  templateId: number
  nome: string
  dataInicio: string
  casoId: number | null
  clienteId: number | null
  responsavelId: number | null
  responsaveis: { ordem: number; responsavelId: number }[]
}

let _k = 0
const newKey = () => `it${++_k}`
const toForm = (tpl: TemplateView | null): TemplateFormValue => ({
  id: tpl?.id,
  nome: tpl?.nome ?? "",
  descricao: tpl?.descricao ?? "",
  area: tpl?.area ?? "soc",
  cor: tpl?.cor ?? "#1F3A6E",
  icone: tpl?.icone ?? "folder",
  itens: (tpl?.itens ?? []).map((it) => ({
    key: newKey(),
    titulo: it.titulo,
    prio: it.prio,
    responsavelPlaceholder: it.responsavelPlaceholder ?? "",
    offsetDiasUteis: it.offsetDiasUteis,
    base: it.base,
    dor: it.dor,
    dod: it.dod,
  })),
})

const miniSeg = (on: boolean): CSSProperties => ({
  height: 24,
  padding: "0 10px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  background: on ? "var(--surface)" : "transparent",
  color: on ? "var(--text)" : "var(--text-muted)",
  fontSize: 11.5,
  fontWeight: 500,
  boxShadow: on ? "var(--shadow-sm)" : "none",
  fontFamily: "var(--font-sans)",
})
const stepBtn: CSSProperties = { width: 28, height: 30, border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, lineHeight: 1 }

// ============================================================ GALLERY
function TemplateCard({ tpl, canEdit, onUse, onEdit }: { tpl: TemplateView; canEdit: boolean; onUse: () => void; onEdit: () => void }) {
  return (
    <div className="lift-card card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: `color-mix(in srgb, ${tpl.cor || "var(--accent)"} 16%, transparent)`, color: tpl.cor || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={(tpl.icone as TfIconName) || "folder"} size={20} strokeWidth={1.8} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{tpl.nome}</div>
          {tpl.area && <div style={{ marginTop: 5 }}><AreaTag area={tpl.area} /></div>}
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, minHeight: 38, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{tpl.descricao}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--text-subtle)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="listChecks" size={13} strokeWidth={1.85} />{tpl.itens.length} tarefas</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="copy" size={12} strokeWidth={1.85} />usado {tpl.usos}×</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
        <button className="btn btn-primary" onClick={onUse} style={{ flex: 1, height: 36, fontSize: 13 }}>Usar template</button>
        {canEdit && (
          <button className="btn btn-secondary" onClick={onEdit} style={{ width: 36, height: 36, padding: 0 }} title="Editar template">
            <Icon name="edit" size={15} />
          </button>
        )}
      </div>
    </div>
  )
}

export function TemplatesTab({
  templates,
  loading,
  canEdit,
  onUse,
  onEdit,
  onNew,
}: {
  templates: TemplateView[]
  loading: boolean
  canEdit: boolean
  onUse: (tpl: TemplateView) => void
  onEdit: (tpl: TemplateView) => void
  onNew: () => void
}) {
  return (
    <PageFrame>
      <PageHeader
        title="Templates"
        sub="Modelos de projeto reutilizáveis — instancie com prazos em dias úteis"
        right={canEdit ? <button className="btn btn-secondary" onClick={onNew} style={{ height: 38 }}><Icon name="plus" size={15} strokeWidth={2} />Novo template</button> : undefined}
      />
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-subtle)", fontSize: 13 }}>Carregando templates…</div>
      ) : !templates.length ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-subtle)", fontSize: 13 }}>Nenhum template ainda.{canEdit ? " Crie o primeiro." : ""}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {templates.map((t) => <TemplateCard key={t.id} tpl={t} canEdit={canEdit} onUse={() => onUse(t)} onEdit={() => onEdit(t)} />)}
        </div>
      )}
    </PageFrame>
  )
}

// ============================================================ EDITOR
function PrioMenu({ prio, onChange }: { prio: number; onChange: (n: number) => void }) {
  const p = PRIO[(prio as 1 | 2 | 3 | 4)] ?? PRIO[4]
  return (
    <Menu
      width={150}
      trigger={
        <span className="picker-mini" style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 9px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
          {p.short}
          <Icon name="chevronDown" size={12} />
        </span>
      }
    >
      {(close) => ([1, 2, 3, 4] as const).map((n) => <MenuItem key={n} dot={PRIO[n].color} label={`${PRIO[n].short} · ${PRIO[n].label}`} active={prio === n} onClick={() => { onChange(n); close() }} />)}
    </Menu>
  )
}

function CritEditor({ label, sub, items, onChange }: { label: string; sub: string; items: string[]; onChange: (arr: string[]) => void }) {
  const [v, setV] = useState("")
  const add = () => {
    if (!v.trim()) return
    onChange([...items, v.trim()])
    setV("")
  }
  return (
    <div style={{ flex: "1 1 240px", minWidth: 220 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 6 }}>
        {label} <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>· {sub}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--text-subtle)", flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{c}</span>
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ border: "none", background: "transparent", color: "var(--text-subtle)", cursor: "pointer", padding: 1 }}>
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
        <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add() }} placeholder={`+ adicionar ${label}`} style={{ border: "none", outline: "none", background: "transparent", fontSize: 12, color: "var(--text)", padding: "2px 0" }} />
      </div>
    </div>
  )
}

function TemplateItemRow({
  item,
  index,
  onChange,
  onRemove,
  dragHandlers,
  dragging,
}: {
  item: TemplateItemForm
  index: number
  onChange: (p: Partial<TemplateItemForm>) => void
  onRemove: () => void
  dragHandlers: { onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void; onDragEnd: () => void }
  dragging: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="tpl-item card" draggable {...dragHandlers} style={{ padding: 0, borderColor: "var(--border)", opacity: dragging ? 0.4 : 1, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
        <span className="tpl-grip" style={{ color: "var(--text-subtle)", flexShrink: 0, display: "flex" }}><Icon name="gripVertical" size={16} /></span>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", width: 18, fontFeatureSettings: '"tnum"', flexShrink: 0 }}>{index + 1}</span>
        <input value={item.titulo} onChange={(e) => onChange({ titulo: e.target.value })} placeholder="Título da tarefa" style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 13, fontWeight: 500, color: "var(--text)" }} />
        <PrioMenu prio={item.prio} onChange={(n) => onChange({ prio: n })} />
        <span className="tpl-prazo" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          <Icon name="flag" size={12} strokeWidth={1.85} />+{item.offsetDiasUteis}d · {item.base === "inicio" ? "início" : "anterior"}
        </span>
        <button onClick={() => setOpen((o) => !o)} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }} title="Detalhes">
          <Icon name="chevronDown" size={15} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
        <button onClick={onRemove} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0, color: "var(--text-subtle)" }} title="Remover">
          <Icon name="x" size={15} />
        </button>
      </div>
      {open && (
        <div style={{ padding: "4px 12px 14px 52px", display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--border)", background: "var(--bg-soft)" }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
            <label style={fieldCol}>
              <span style={fieldLbl}>Responsável (papel)</span>
              <input value={item.responsavelPlaceholder} onChange={(e) => onChange({ responsavelPlaceholder: e.target.value })} placeholder="ex.: Advogado responsável" className="input" style={{ height: 32, fontSize: 12.5, width: 220 }} />
            </label>
            <label style={fieldCol}>
              <span style={fieldLbl}>Prazo relativo (dias úteis)</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border-strong)", borderRadius: 8, background: "var(--surface)", height: 32 }}>
                  <button onClick={() => onChange({ offsetDiasUteis: Math.max(0, item.offsetDiasUteis - 1) })} style={stepBtn}>−</button>
                  <span style={{ width: 32, textAlign: "center", fontSize: 12.5, fontWeight: 500, fontFeatureSettings: '"tnum"' }}>{item.offsetDiasUteis}</span>
                  <button onClick={() => onChange({ offsetDiasUteis: item.offsetDiasUteis + 1 })} style={stepBtn}>+</button>
                </span>
                <div style={{ display: "flex", gap: 2, background: "var(--bg-soft)", borderRadius: 8, padding: 2, border: "1px solid var(--border)" }}>
                  <button onClick={() => onChange({ base: "inicio" })} style={miniSeg(item.base === "inicio")}>do início</button>
                  <button onClick={() => onChange({ base: "anterior" })} style={miniSeg(item.base === "anterior")}>após anterior</button>
                </div>
              </span>
            </label>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <CritEditor label="DoR" sub="pronto para começar" items={item.dor} onChange={(arr) => onChange({ dor: arr })} />
            <CritEditor label="DoD" sub="pronto para entregar" items={item.dod} onChange={(arr) => onChange({ dod: arr })} />
          </div>
        </div>
      )}
    </div>
  )
}

export function TemplateEditor({ tpl, onClose, onSave }: { tpl: TemplateView | null; onClose: () => void; onSave: (form: TemplateFormValue) => void }) {
  const isNew = !tpl
  const areaOpts = useAreaOptions()
  const [form, setForm] = useState<TemplateFormValue>(() => toForm(tpl))
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const set = (patch: Partial<TemplateFormValue>) => setForm((f) => ({ ...f, ...patch }))
  const setItem = (i: number, patch: Partial<TemplateItemForm>) => setForm((f) => ({ ...f, itens: f.itens.map((it, j) => (j === i ? { ...it, ...patch } : it)) }))
  const removeItem = (i: number) => setForm((f) => ({ ...f, itens: f.itens.filter((_, j) => j !== i) }))
  const addItem = () =>
    setForm((f) => ({
      ...f,
      itens: [...f.itens, { key: newKey(), titulo: "", prio: 3, responsavelPlaceholder: "", offsetDiasUteis: 2, base: f.itens.length ? "anterior" : "inicio", dor: [], dod: [] }],
    }))
  const reorder = (from: number, to: number) =>
    setForm((f) => {
      const a = [...f.itens]
      const [m] = a.splice(from, 1)
      a.splice(to, 0, m)
      return { ...f, itens: a }
    })
  const valid = form.nome.trim().length > 0

  return (
    <Overlay onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ModalHeader title={isNew ? "Novo template" : "Editar template"} sub="Estrutura reutilizável de tarefas com prazos relativos" onClose={onClose} />
        <div style={{ overflowY: "auto", padding: "18px 22px", flex: 1 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
            <label style={{ ...fieldCol, flex: "2 1 280px" }}>
              <span style={fieldLbl}>Nome do template</span>
              <input value={form.nome} onChange={(e) => set({ nome: e.target.value })} className="input" placeholder="ex.: Holding Patrimonial" />
            </label>
            <label style={{ ...fieldCol, flex: "1 1 160px" }}>
              <span style={fieldLbl}>Área</span>
              <Menu width={200} trigger={<span className="picker-btn" style={pickerStyle}>{areaOpts.find((a) => a.id === form.area)?.label ?? form.area ?? "—"}<Icon name="chevronDown" size={13} /></span>}>
                {(close) => areaOpts.map((a) => <MenuItem key={a.id} label={a.label} active={form.area === a.id} onClick={() => { set({ area: a.id }); close() }} />)}
              </Menu>
            </label>
          </div>
          <label style={{ ...fieldCol, marginBottom: 20 }}>
            <span style={fieldLbl}>Descrição</span>
            <textarea value={form.descricao} onChange={(e) => set({ descricao: e.target.value })} className="textarea" style={{ minHeight: 52, fontSize: 13 }} placeholder="Para que serve este template…" />
          </label>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 24 }}>
            <div>
              <span style={{ ...fieldLbl, display: "block", marginBottom: 8 }}>Cor</span>
              <div style={{ display: "flex", gap: 8 }}>
                {COLOR_CHOICES.map((c) => (
                  <button key={c} onClick={() => set({ cor: c })} style={{ width: 26, height: 26, borderRadius: 8, background: c, border: form.cor === c ? "2px solid var(--text)" : "2px solid transparent", cursor: "pointer", boxShadow: form.cor === c ? "0 0 0 2px var(--bg)" : "none" }} />
                ))}
              </div>
            </div>
            <div>
              <span style={{ ...fieldLbl, display: "block", marginBottom: 8 }}>Ícone</span>
              <div style={{ display: "flex", gap: 6 }}>
                {ICON_CHOICES.map((ic) => (
                  <button key={ic} onClick={() => set({ icone: ic })} style={{ width: 32, height: 32, borderRadius: 8, background: form.icone === ic ? "var(--accent-soft)" : "var(--surface)", color: form.icone === ic ? "var(--accent)" : "var(--text-muted)", border: `1px solid ${form.icone === ic ? "var(--border-gold)" : "var(--border-strong)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={ic} size={16} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon name="listChecks" size={16} strokeWidth={1.9} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>Tarefas do template</span>
            <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{form.itens.length}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>arraste para reordenar</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {form.itens.map((it, i) => (
              <TemplateItemRow
                key={it.key}
                item={it}
                index={i}
                dragging={dragIdx === i}
                onChange={(p) => setItem(i, p)}
                onRemove={() => removeItem(i)}
                dragHandlers={{
                  onDragStart: (e) => {
                    e.dataTransfer.effectAllowed = "move"
                    setDragIdx(i)
                  },
                  onDragOver: (e) => {
                    e.preventDefault()
                    if (dragIdx !== null && dragIdx !== i) {
                      reorder(dragIdx, i)
                      setDragIdx(i)
                    }
                  },
                  onDragEnd: () => setDragIdx(null),
                }}
              />
            ))}
          </div>
          <button onClick={addItem} className="btn btn-secondary" style={{ marginTop: 10, height: 36, fontSize: 13 }}>
            <Icon name="plus" size={15} strokeWidth={2} />
            Adicionar tarefa
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-soft)" }}>
          <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{form.itens.length} tarefas · prazos em dias úteis</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} className="btn btn-ghost" style={{ height: 36 }}>Cancelar</button>
          <button onClick={() => valid && onSave(form)} disabled={!valid} className="btn btn-primary" style={{ height: 36, opacity: valid ? 1 : 0.5 }}>Salvar template</button>
        </div>
      </div>
    </Overlay>
  )
}

// ============================================================ WIZARD
const WIZARD_STEPS = ["Data de início", "Responsáveis", "Vínculo", "Prévia"]
type VinculoSel = { tipo: "caso" | "cliente"; id: number; nome: string }

export function InstantiateWizard({
  tpl,
  socios,
  casos,
  clientes,
  onClose,
  onCreate,
}: {
  tpl: TemplateView
  socios: TeamMember[]
  casos: IdNome[]
  clientes: IdNome[]
  onClose: () => void
  onCreate: (payload: InstanciarPayload) => void
}) {
  const [step, setStep] = useState(0)
  const [start, setStart] = useState(addBizDaysClient(TODAY(), 0))
  const placeholders = useMemo(() => [...new Set(tpl.itens.map((i) => i.responsavelPlaceholder).filter((s): s is string => !!s))], [tpl])
  const [mapping, setMapping] = useState<Record<string, number>>({})
  const [vinculo, setVinculo] = useState<VinculoSel | null>(null)

  const generated = useMemo(() => {
    let prev = start
    return tpl.itens.map((it) => {
      const base = it.base === "inicio" ? start : prev
      const due = addBizDaysClient(base, it.offsetDiasUteis)
      prev = due
      const assignee = it.responsavelPlaceholder ? mapping[it.responsavelPlaceholder] ?? null : null
      return { ...it, prazo: due, assignee }
    })
  }, [tpl, start, mapping])

  const next = () => setStep((s) => Math.min(3, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  const submit = () => {
    const responsaveis = generated.filter((g) => g.assignee != null).map((g) => ({ ordem: g.ordem, responsavelId: g.assignee as number }))
    const lead = responsaveis[0]?.responsavelId ?? null
    onCreate({
      templateId: tpl.id,
      nome: tpl.nome,
      dataInicio: start,
      casoId: vinculo?.tipo === "caso" ? vinculo.id : null,
      clienteId: vinculo?.tipo === "cliente" ? vinculo.id : null,
      responsavelId: lead,
      responsaveis,
    })
  }

  const vincList: VinculoSel[] = [
    ...casos.map((c) => ({ tipo: "caso" as const, id: c.id, nome: c.nome })),
    ...clientes.map((c) => ({ tipo: "cliente" as const, id: c.id, nome: c.nome })),
  ]

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Usar template · ${tpl.nome}`} sub={`${tpl.itens.length} tarefas serão criadas com prazos em dias úteis`} onClose={onClose} />
      <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
        {WIZARD_STEPS.map((s, i) => (
          <span key={s} style={{ display: "contents" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFeatureSettings: '"tnum"',
                  background: i < step ? "var(--accent)" : i === step ? "var(--accent-soft)" : "var(--bg-sunken)",
                  color: i < step ? "var(--brand-navy)" : i === step ? "var(--accent)" : "var(--text-subtle)",
                  border: i === step ? "1px solid var(--border-gold)" : "none",
                }}
              >
                {i < step ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: i === step ? 500 : 400, color: i <= step ? "var(--text)" : "var(--text-subtle)" }}>{s}</span>
            </span>
            {i < WIZARD_STEPS.length - 1 && <span style={{ flex: 1, height: 1, background: i < step ? "var(--accent)" : "var(--border)", margin: "0 12px" }} />}
          </span>
        ))}
      </div>

      <div style={{ overflowY: "auto", padding: "20px 22px", flex: 1, minHeight: 240 }}>
        {step === 0 && (
          <div>
            <div style={fieldLbl}>Data de início do projeto</div>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value || TODAY())} className="dt-input" style={{ height: 40, fontSize: 14, marginTop: 8, width: 200 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "10px 12px", background: "var(--accent-soft)", borderRadius: 10, fontSize: 12.5, color: "var(--text-muted)" }}>
              <Icon name="calendar" size={15} strokeWidth={1.85} style={{ color: "var(--accent)", flexShrink: 0 }} />
              Os prazos são calculados em <strong style={{ fontWeight: 500, color: "var(--text)" }}>&nbsp;dias úteis&nbsp;</strong>, pulando fins de semana e feriados nacionais.
            </div>
          </div>
        )}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>Mapeie cada papel do template para um membro real da equipe.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {placeholders.map((ph) => {
                const m = mapping[ph] != null ? socios.find((x) => x.id === mapping[ph]) : null
                return (
                  <div key={ph} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flex: 1, fontSize: 13, color: "var(--text)" }}>
                      <Icon name="user" size={14} strokeWidth={1.85} style={{ color: "var(--text-subtle)" }} />
                      {ph}
                    </span>
                    <Icon name="arrowRight" size={15} style={{ color: "var(--text-subtle)" }} />
                    <Menu
                      align="right"
                      width={220}
                      trigger={
                        <span className="picker-btn" style={{ ...pickerStyle, height: 36, width: 220, fontSize: 13 }}>
                          {m ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                              <AssigneeAvatar id={m.id} size={18} title={false} />
                              {m.nome}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-subtle)" }}>Selecionar membro</span>
                          )}
                          <Icon name="chevronDown" size={13} />
                        </span>
                      }
                    >
                      {(close) => socios.map((mm) => <MenuItem key={mm.id} label={mm.nome} sub={mm.role} active={mapping[ph] === mm.id} onClick={() => { setMapping((x) => ({ ...x, [ph]: mm.id })); close() }} right={<AssigneeAvatar id={mm.id} size={18} title={false} />} />)}
                    </Menu>
                  </div>
                )
              })}
              {!placeholders.length && <div style={{ fontSize: 13, color: "var(--text-subtle)" }}>Este template não define papéis.</div>}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
              Vincule o projeto a um caso ou cliente <span style={{ color: "var(--text-subtle)" }}>(opcional)</span>.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {vincList.map((l) => {
                const on = vinculo?.tipo === l.tipo && vinculo?.id === l.id
                return (
                  <button
                    key={`${l.tipo}-${l.id}`}
                    onClick={() => setVinculo(on ? null : l)}
                    className="lift-card"
                    style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 10, cursor: "pointer", textAlign: "left", background: on ? "var(--accent-soft)" : "var(--surface)", border: `1px solid ${on ? "var(--border-gold)" : "var(--border)"}` }}
                  >
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-sunken)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name={l.tipo === "caso" ? "briefcase" : "user"} size={15} />
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{l.nome}</span>
                      <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{l.tipo}</span>
                    </span>
                    {on && <Icon name="check" size={16} strokeWidth={2.4} style={{ color: "var(--accent)" }} />}
                  </button>
                )
              })}
              {!vincList.length && <div style={{ fontSize: 13, color: "var(--text-subtle)" }}>Nenhum caso/cliente disponível.</div>}
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 12.5, color: "var(--text-muted)" }}>
              <Icon name="sparkles" size={14} strokeWidth={1.9} style={{ color: "var(--accent)" }} />
              {generated.length} tarefas · início {dateFull(start)} · prazos em dias úteis
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {generated.map((g, i) => (
                <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: 11, color: "var(--text-subtle)", width: 16, fontFeatureSettings: '"tnum"', flexShrink: 0 }}>{i + 1}</span>
                  <PriorityFlag prio={g.prio} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.titulo}</span>
                  {g.assignee != null ? <AssigneeAvatar id={g.assignee} size={20} /> : <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>—</span>}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)", width: 86, justifyContent: "flex-end", fontFeatureSettings: '"tnum"' }}>
                    <Icon name="flag" size={11} strokeWidth={1.9} />
                    {dateFull(g.prazo).replace(/ \d{4}$/, "")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-soft)" }}>
        {step > 0 ? (
          <button onClick={back} className="btn btn-ghost" style={{ height: 38 }}><Icon name="chevronLeft" size={15} />Voltar</button>
        ) : (
          <button onClick={onClose} className="btn btn-ghost" style={{ height: 38 }}>Cancelar</button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>Passo {step + 1} de 4</span>
        {step < 3 ? (
          <button onClick={next} className="btn btn-primary" style={{ height: 38 }}>Continuar<Icon name="arrowRight" size={15} strokeWidth={2} /></button>
        ) : (
          <button onClick={submit} className="btn btn-primary" style={{ height: 38 }}><Icon name="plus" size={15} strokeWidth={2.2} />Criar projeto</button>
        )}
      </div>
    </Overlay>
  )
}
