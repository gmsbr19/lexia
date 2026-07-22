"use client"

// LexIA · CRM — Agenda. Ported from the design prototype page-agenda.jsx, wired
// to the real backend: fetches the visible window via fetchAgenda(de, ate)
// (eventos + scheduled tarefas) and re-fetches after every mutation. Views:
// Mês / Semana / Dia / Lista, filters by responsável + tipo, create/edit/delete
// events (FxModal), drag-to-reschedule in Semana/Dia. Dates are ISO; events are
// coloured by their unaccented `tipo` via CRM_EVT. Money is not involved here.
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  CRM_EVT,
  CRM_TODAY,
  CrmBadge,
  CrmEmpty,
  CrmPrioTag,
  FxCheck,
  FxInput,
  FxLabel,
  FxModal,
  FxSegmented,
  FxSelect,
  FxTextarea,
  useCrmToast,
  type EvtTipo,
} from "../crm-kit"
import { CRM_MON, CRM_MON_FULL } from "../crm-fmt"
import { Icon } from "../crm-icons"
import {
  createEvento,
  deleteEvento,
  fetchAgenda,
  patchEvento,
} from "../crm-api"
import type {
  AgendaDataset,
  AgendaTarefaRow,
  CrmDataset,
  CrmNav,
  EventoRow,
  EventoTipo,
  Role,
  SocioConta,
} from "../crm-types"

interface Props {
  dataset: CrmDataset
  role: Role
  nav: CrmNav
}

// ───────────────────────── local date helpers ─────────────────────────
const CRM_WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const CRM_WD_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const pad = (n: number) => String(n).padStart(2, "0")
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseISO = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
const hourToMin = (h: string | null) => {
  if (!h) return 0
  const [a, b] = h.split(":").map(Number)
  return a * 60 + (b || 0)
}
const minToHour = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`

/** Local "YYYY-MM-DD" day key for an event datetime ISO. */
const dayOf = (iso: string) => isoOf(new Date(iso))
/** Local "HH:MM" for an event datetime ISO (null for date-only / midday-stored). */
const timeOf = (iso: string | null): string | null => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const TIPO_OPTS: { value: EventoTipo; label: string }[] = [
  { value: "audiencia", label: "Audiência" },
  { value: "prazo", label: "Prazo" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Outro" },
]
const FILTER_TIPOS: ("todos" | EventoTipo)[] = ["todos", "audiencia", "prazo", "reuniao", "outro"]

// ───────────────────────── event form model ─────────────────────────
interface EvtForm {
  id?: number
  titulo: string
  tipo: EventoTipo
  dia: string // "YYYY-MM-DD"
  hIni: string // "HH:MM"
  hFim: string // "HH:MM"
  allDay: boolean
  responsavelId: number | null
  local: string
  descricao: string
  clienteId: number | null
  casoId: number | null
  leadId: number | null
  status: "confirmado" | "cancelado"
}

function evtToForm(e: EventoRow): EvtForm {
  const ini = timeOf(e.inicio)
  const fim = timeOf(e.fim)
  return {
    id: e.id,
    titulo: e.titulo,
    tipo: e.tipo,
    dia: dayOf(e.inicio),
    hIni: ini || "09:00",
    hFim: fim || (ini ? minToHour(hourToMin(ini) + 60) : "10:00"),
    allDay: e.diaInteiro,
    responsavelId: e.responsavelId,
    local: e.local || "",
    descricao: e.descricao || "",
    clienteId: e.clienteId,
    casoId: e.casoId,
    leadId: e.leadId,
    status: e.status,
  }
}

// ───────────────────────── event chip ─────────────────────────
function CrmEvtChip({
  titulo,
  tipo,
  hIni,
  allDay,
  onClick,
  compact,
}: {
  titulo: string
  tipo: EvtTipo
  hIni: string | null
  allDay: boolean
  onClick: () => void
  compact?: boolean
}) {
  const m = CRM_EVT[tipo]
  return (
    <button
      onClick={(ev) => {
        ev.stopPropagation()
        onClick()
      }}
      style={{
        display: "flex", alignItems: "center", gap: 5, width: "100%", textAlign: "left", border: "none",
        cursor: "pointer", background: m.soft, color: m.color, borderRadius: 6,
        padding: compact ? "2px 6px" : "4px 7px", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
        letterSpacing: "-0.01em", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
        borderLeft: `1px solid ${m.color}`,
      }}
    >
      {hIni && !allDay && <span style={{ opacity: 0.85, fontVariantNumeric: "tabular-nums" }}>{hIni}</span>}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</span>
    </button>
  )
}

// ───────────────────────── create/edit modal ─────────────────────────
function CrmEventoModal({
  form,
  dataset,
  socios,
  leads,
  onClose,
  onSave,
  onDelete,
}: {
  form: EvtForm
  dataset: CrmDataset
  socios: SocioConta[]
  leads: { id: number; nome: string }[]
  onClose: () => void
  onSave: (f: EvtForm) => void | Promise<void>
  onDelete?: () => void | Promise<void>
}) {
  const [f, setF] = useState<EvtForm>(form)
  const set = <K extends keyof EvtForm>(k: K, v: EvtForm[K]) => setF((p) => ({ ...p, [k]: v }))
  const editing = form.id != null
  const clienteOpts = [{ value: "", label: "—" }, ...dataset.clienteOptions.map((c) => ({ value: String(c.id), label: c.nome }))]
  const casoOpts = [{ value: "", label: "—" }, ...dataset.casoOptions.map((k) => ({ value: String(k.id), label: k.nome }))]
  const respOpts = [{ value: "", label: "—" }, ...socios.map((s) => ({ value: String(s.id), label: s.nome }))]
  const leadOpts = [{ value: "", label: "—" }, ...leads.map((l) => ({ value: String(l.id), label: l.nome }))]

  return (
    <FxModal
      title={editing ? "Editar evento" : "Novo evento"}
      sub="Audiência, prazo, reunião ou outro"
      onClose={onClose}
      width={520}
      footer={
        <>
          {editing && onDelete && (
            <button
              className="btn btn-ghost"
              onClick={() => onDelete()}
              style={{ marginRight: "auto", color: "var(--fin-neg,#C0492F)" }}
            >
              <Icon name="trash2" size={14} />
              Excluir
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={() => onSave(f)}>
            Salvar
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FxLabel>Título</FxLabel>
          <FxInput value={f.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex.: Audiência de instrução" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FxLabel>Tipo</FxLabel>
            <FxSelect options={TIPO_OPTS} value={f.tipo} onChange={(e) => set("tipo", e.target.value as EventoTipo)} />
          </div>
          <div>
            <FxLabel>Responsável</FxLabel>
            <FxSelect
              options={respOpts}
              value={f.responsavelId != null ? String(f.responsavelId) : ""}
              onChange={(e) => set("responsavelId", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 12 }}>
          <div>
            <FxLabel>Data</FxLabel>
            <FxInput type="date" value={f.dia} onChange={(e) => set("dia", e.target.value)} />
          </div>
          <div>
            <FxLabel>Início</FxLabel>
            <FxInput type="time" value={f.hIni} disabled={f.allDay} onChange={(e) => set("hIni", e.target.value)} />
          </div>
          <div>
            <FxLabel>Fim</FxLabel>
            <FxInput type="time" value={f.hFim} disabled={f.allDay} onChange={(e) => set("hFim", e.target.value)} />
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
          <FxCheck checked={f.allDay} onChange={() => set("allDay", !f.allDay)} /> Dia inteiro
        </label>
        <div>
          <FxLabel>Local ou link</FxLabel>
          <FxInput value={f.local} onChange={(e) => set("local", e.target.value)} placeholder="Fórum, sala ou link de vídeo" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FxLabel>Cliente (opcional)</FxLabel>
            <FxSelect
              options={clienteOpts}
              value={f.clienteId != null ? String(f.clienteId) : ""}
              onChange={(e) => set("clienteId", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <FxLabel>Caso (opcional)</FxLabel>
            <FxSelect
              options={casoOpts}
              value={f.casoId != null ? String(f.casoId) : ""}
              onChange={(e) => set("casoId", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </div>
        <div>
          <FxLabel>Oportunidade (opcional)</FxLabel>
          <FxSelect
            options={leadOpts}
            value={f.leadId != null ? String(f.leadId) : ""}
            onChange={(e) => set("leadId", e.target.value ? Number(e.target.value) : null)}
          />
        </div>
        <div>
          <FxLabel>Observações (opcional)</FxLabel>
          <FxTextarea value={f.descricao} onChange={(e) => set("descricao", e.target.value)} rows={2} placeholder="Notas internas sobre o compromisso" />
        </div>
      </div>
    </FxModal>
  )
}

// ───────────────────────── timeline constants ─────────────────────────
const CRM_HOURS: number[] = []
for (let h = 8; h <= 20; h++) CRM_HOURS.push(h)
const HOUR_PX = 52
const DAY_START_MIN = 8 * 60
const DAY_END_MIN = 20 * 60

interface DragState {
  id: number
  dur: number
  grab: number
  gridTop: number
}

// ───────────────────────── main ─────────────────────────
export function CrmAgendaPage({ dataset, role: _role, nav }: Props) {
  void _role
  const { toast } = useCrmToast()
  const [view, setView] = useState<"mes" | "semana" | "dia" | "lista">("mes")
  const [cursor, setCursor] = useState(() => parseISO(CRM_TODAY))
  const [fResp, setFResp] = useState<"todos" | number>("todos")
  const [fTipo, setFTipo] = useState<"todos" | EventoTipo>("todos")
  const [modal, setModal] = useState<EvtForm | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  const [data, setData] = useState<AgendaDataset>({
    eventos: [],
    tarefas: [],
    socios: [],
    clientes: dataset.clienteOptions,
    casos: dataset.casoOptions,
    leads: [],
  })

  // Window to fetch: pad the visible range so adjacent month/week edges are covered.
  const window = useMemo(() => {
    const y = cursor.getFullYear()
    const mo = cursor.getMonth()
    if (view === "mes") {
      const de = new Date(y, mo, 1)
      de.setDate(de.getDate() - de.getDay() - 1)
      const ate = new Date(y, mo + 1, 0)
      ate.setDate(ate.getDate() + (6 - ate.getDay()) + 1)
      return { de: isoOf(de), ate: isoOf(ate) }
    }
    if (view === "lista") {
      // Upcoming list reaches forward; cover ~4 months from today.
      const de = new Date(y, mo, cursor.getDate())
      const ate = new Date(de)
      ate.setMonth(ate.getMonth() + 4)
      return { de: CRM_TODAY < isoOf(de) ? CRM_TODAY : isoOf(de), ate: isoOf(ate) }
    }
    if (view === "semana") {
      const ws = new Date(cursor)
      ws.setDate(ws.getDate() - ws.getDay())
      const we = new Date(ws)
      we.setDate(we.getDate() + 6)
      return { de: isoOf(ws), ate: isoOf(we) }
    }
    return { de: isoOf(cursor), ate: isoOf(cursor) }
  }, [view, cursor])

  const reqRef = useRef(0)
  const load = useCallback(async () => {
    const seq = ++reqRef.current
    try {
      const d = await fetchAgenda(window.de, window.ate)
      if (seq === reqRef.current) setData(d)
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao carregar a agenda", { tone: "neg", icon: "alertTriangle" })
    }
  }, [window.de, window.ate, toast])

  useEffect(() => {
    void load()
  }, [load])

  // ── filtered slices ──
  const evFiltered = useMemo(
    () =>
      data.eventos.filter(
        (e) =>
          (fResp === "todos" || e.responsavelId === fResp) &&
          (fTipo === "todos" || e.tipo === fTipo),
      ),
    [data.eventos, fResp, fTipo],
  )
  const tasksWithDate = useMemo(
    () => data.tarefas.filter((t) => t.data && (fResp === "todos" || t.responsavelId === fResp)),
    [data.tarefas, fResp],
  )
  const evByDay = useCallback((iso: string) => evFiltered.filter((e) => dayOf(e.inicio) === iso), [evFiltered])
  const tasksByDay = useCallback(
    (iso: string) => (fTipo === "todos" || fTipo === "prazo" ? tasksWithDate.filter((t) => t.data === iso) : []),
    [tasksWithDate, fTipo],
  )

  // ── navigation ──
  const shift = (n: number) => {
    const d = new Date(cursor)
    if (view === "mes") d.setMonth(d.getMonth() + n)
    else if (view === "semana") d.setDate(d.getDate() + 7 * n)
    else d.setDate(d.getDate() + n)
    setCursor(d)
  }
  const title = useMemo(() => {
    if (view === "mes") return `${CRM_MON_FULL[cursor.getMonth()]} ${cursor.getFullYear()}`
    if (view === "dia") return `${cursor.getDate()} de ${CRM_MON_FULL[cursor.getMonth()]}`
    if (view === "lista") return "Próximos compromissos"
    const ws = new Date(cursor)
    ws.setDate(ws.getDate() - ws.getDay())
    const we = new Date(ws)
    we.setDate(we.getDate() + 6)
    return `${ws.getDate()} ${CRM_MON[ws.getMonth()]} – ${we.getDate()} ${CRM_MON[we.getMonth()]}`
  }, [view, cursor])

  // ── modal openers ──
  const openEvt = (e: EventoRow) => setModal(evtToForm(e))
  const newAt = (dia: string, hIni?: string) =>
    setModal({
      titulo: "",
      tipo: "reuniao",
      dia,
      hIni: hIni || "09:00",
      hFim: hIni ? minToHour(hourToMin(hIni) + 60) : "10:00",
      allDay: false,
      responsavelId: data.socios[0]?.id ?? null,
      local: "",
      descricao: "",
      clienteId: null,
      casoId: null,
      leadId: null,
      status: "confirmado",
    })

  // ── persistence ──
  const buildBody = (f: EvtForm) => ({
    titulo: f.titulo,
    tipo: f.tipo,
    dataInicio: f.allDay ? f.dia : `${f.dia}T${f.hIni}`,
    dataFim: f.allDay ? null : `${f.dia}T${f.hFim}`,
    diaInteiro: f.allDay,
    local: f.local || null,
    descricao: f.descricao || null,
    status: f.status,
    responsavelId: f.responsavelId,
    clienteId: f.clienteId,
    casoId: f.casoId,
    leadId: f.leadId,
  })

  const saveEvt = async (f: EvtForm) => {
    if (!f.titulo.trim()) {
      toast("Informe um título", { tone: "neg", icon: "alertTriangle" })
      return
    }
    try {
      if (f.id != null) await patchEvento(f.id, buildBody(f))
      else await createEvento(buildBody(f))
      setModal(null)
      toast(f.id != null ? "Evento atualizado" : "Evento criado")
      await load()
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
    }
  }

  const removeEvt = async (id: number) => {
    try {
      await deleteEvento(id)
      setModal(null)
      toast("Evento excluído")
      await load()
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
    }
  }

  const moveEvt = async (id: number, dia: string, hIni: string, hFim: string) => {
    try {
      await patchEvento(id, { dataInicio: `${dia}T${hIni}`, dataFim: `${dia}T${hFim}` })
      toast("Evento remarcado")
      await load()
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", { tone: "neg", icon: "alertTriangle" })
    }
  }

  // ── month grid ──
  const renderMonth = () => {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const first = new Date(y, m, 1)
    const start = new Date(y, m, 1 - first.getDay())
    const cells: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      cells.push(d)
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {CRM_WD.map((w) => (
            <div key={w} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {w}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridAutoRows: "1fr", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--surface)" }}>
          {cells.map((d, i) => {
            const iso = isoOf(d)
            const inMonth = d.getMonth() === m
            const isToday = iso === CRM_TODAY
            const evs = evByDay(iso)
            const tks = tasksByDay(iso)
            return (
              <div
                key={i}
                onClick={() => newAt(iso)}
                style={{
                  borderRight: i % 7 !== 6 ? "1px solid var(--border)" : "none",
                  borderBottom: i < 35 ? "1px solid var(--border)" : "none",
                  padding: 6, minHeight: 92, background: inMonth ? "transparent" : "var(--bg-soft)",
                  cursor: "pointer", display: "flex", flexDirection: "column", gap: 3, overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span
                    style={{
                      width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 500, fontVariantNumeric: "tabular-nums",
                      background: isToday ? "var(--accent-strong)" : "transparent",
                      color: isToday ? "#020D25" : inMonth ? "var(--text)" : "var(--text-subtle)",
                    }}
                  >
                    {d.getDate()}
                  </span>
                </div>
                {evs.slice(0, 3).map((e) => (
                  <CrmEvtChip key={e.id} titulo={e.titulo} tipo={e.tipo} hIni={timeOf(e.inicio)} allDay={e.diaInteiro} onClick={() => openEvt(e)} compact />
                ))}
                {tks.slice(0, 1).map((t) => (
                  <div
                    key={t.id}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      if (t.casoId) nav.openCaso(t.casoId)
                      else if (t.clienteId) nav.openCliente(t.clienteId)
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)", padding: "1px 4px", cursor: "pointer" }}
                  >
                    <Icon name="listChecks" size={11} style={{ color: "var(--text-subtle)" }} />
                    <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{t.titulo}</span>
                  </div>
                ))}
                {evs.length + tks.length > 4 && <div style={{ fontSize: 11, color: "var(--text-subtle)", paddingLeft: 4 }}>+{evs.length + tks.length - 4} mais</div>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── timeline (week / day) with drag-to-reschedule ──
  const renderTimeline = (days: Date[]) => {
    const onDrop = (clientY: number, colDate: Date) => {
      if (!drag) return
      const rel = clientY - drag.gridTop - drag.grab
      let mins = Math.round(((rel / HOUR_PX) * 60) / 30) * 30 + DAY_START_MIN
      mins = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, mins))
      void moveEvt(drag.id, isoOf(colDate), minToHour(mins), minToHour(mins + drag.dur))
      setDrag(null)
    }
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--surface)" }}>
        {/* all-day row */}
        <div style={{ display: "grid", gridTemplateColumns: `52px repeat(${days.length},1fr)`, borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}>
          <div style={{ fontSize: 11, color: "var(--text-subtle)", padding: "7px 6px", textAlign: "right" }}>dia todo</div>
          {days.map((d, i) => {
            const iso = isoOf(d)
            const isToday = iso === CRM_TODAY
            const allDayEvs = evByDay(iso).filter((e) => e.diaInteiro)
            const tks = tasksByDay(iso)
            return (
              <div key={i} style={{ borderLeft: "1px solid var(--border)", padding: 6, minHeight: 38, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: isToday ? "var(--accent)" : "var(--text-muted)", marginBottom: 2 }}>
                  {CRM_WD[d.getDay()]} {d.getDate()}
                  {isToday ? " · hoje" : ""}
                </div>
                {allDayEvs.map((e) => (
                  <CrmEvtChip key={e.id} titulo={e.titulo} tipo={e.tipo} hIni={null} allDay onClick={() => openEvt(e)} compact />
                ))}
                {tks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (t.casoId) nav.openCaso(t.casoId)
                      else if (t.clienteId) nav.openCliente(t.clienteId)
                    }}
                    style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}
                  >
                    <Icon name="flag" size={10} style={{ color: CRM_EVT.prazo.color }} />
                    {t.titulo}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        {/* hours grid */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: `52px repeat(${days.length},1fr)`, position: "relative" }}>
            <div>
              {CRM_HOURS.map((h) => (
                <div key={h} style={{ height: HOUR_PX, fontSize: 11, color: "var(--text-subtle)", textAlign: "right", paddingRight: 7, transform: "translateY(-6px)" }}>
                  {h}:00
                </div>
              ))}
            </div>
            {days.map((d, ci) => {
              const iso = isoOf(d)
              const timed = evByDay(iso).filter((e) => !e.diaInteiro && timeOf(e.inicio))
              return (
                <div
                  key={ci}
                  onMouseUp={(e) => {
                    if (drag) onDrop(e.clientY, d)
                  }}
                  onClick={(e) => {
                    if (drag) return
                    const r = e.currentTarget.getBoundingClientRect()
                    const mins = Math.round((((e.clientY - r.top) / HOUR_PX) * 60) / 30) * 30 + DAY_START_MIN
                    newAt(iso, minToHour(Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, mins))))
                  }}
                  style={{ position: "relative", borderLeft: "1px solid var(--border)", cursor: "pointer" }}
                >
                  {CRM_HOURS.map((h) => (
                    <div key={h} style={{ height: HOUR_PX, borderBottom: "1px solid var(--border)" }} />
                  ))}
                  {timed.map((e) => {
                    const ini = timeOf(e.inicio) as string
                    const fim = timeOf(e.fim)
                    const top = ((hourToMin(ini) - DAY_START_MIN) / 60) * HOUR_PX
                    const dur = Math.max(30, hourToMin(fim || minToHour(hourToMin(ini) + 60)) - hourToMin(ini))
                    const m = CRM_EVT[e.tipo]
                    const dragging = drag?.id === e.id
                    return (
                      <div
                        key={e.id}
                        onMouseDown={(ev) => {
                          ev.stopPropagation()
                          const grid = (ev.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
                          setDrag({ id: e.id, dur, grab: ev.clientY - (grid.top + top), gridTop: grid.top })
                        }}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          if (!drag) openEvt(e)
                        }}
                        style={{
                          position: "absolute", top: top + 1, left: 3, right: 3, height: (dur / 60) * HOUR_PX - 2,
                          background: m.soft, borderLeft: `1px solid ${m.color}`, borderRadius: 6, padding: "4px 7px",
                          overflow: "hidden", cursor: "grab", opacity: dragging ? 0.6 : 1,
                          boxShadow: dragging ? "var(--shadow-md)" : "none", zIndex: dragging ? 5 : 1,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 500, color: m.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.titulo}</div>
                        <div style={{ fontSize: 11, color: m.color, opacity: 0.8, fontVariantNumeric: "tabular-nums" }}>
                          {ini}
                          {fim ? `–${fim}` : ""}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const weekDays = useMemo(() => {
    const ws = new Date(cursor)
    ws.setDate(ws.getDate() - ws.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws)
      d.setDate(ws.getDate() + i)
      return d
    })
  }, [cursor])

  // ── list view ──
  const renderList = () => {
    const upcoming = evFiltered
      .filter((e) => dayOf(e.inicio) >= CRM_TODAY)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
    type ListItem =
      | { kind: "evt"; e: EventoRow }
      | { kind: "task"; t: AgendaTarefaRow }
    const byDay: Record<string, ListItem[]> = {}
    upcoming.forEach((e) => {
      const iso = dayOf(e.inicio)
      ;(byDay[iso] = byDay[iso] || []).push({ kind: "evt", e })
    })
    if (fTipo === "todos" || fTipo === "prazo") {
      tasksWithDate
        .filter((t) => t.data >= CRM_TODAY)
        .forEach((t) => {
          ;(byDay[t.data] = byDay[t.data] || []).push({ kind: "task", t })
        })
    }
    const days = Object.keys(byDay).sort()
    if (days.length === 0)
      return (
        <div className="card">
          <CrmEmpty
            icon="calendar"
            title="Nenhum compromisso futuro"
            sub="Crie um evento para começar."
            cta={
              <button className="btn btn-primary" onClick={() => newAt(CRM_TODAY)}>
                <Icon name="plus" size={14} />
                Novo evento
              </button>
            }
          />
        </div>
      )
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }}>
        {days.map((iso) => {
          const d = parseISO(iso)
          const isToday = iso === CRM_TODAY
          return (
            <div key={iso}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 9 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{isToday ? "Hoje" : CRM_WD_FULL[d.getDay()]}</span>
                <span style={{ fontSize: 12, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>
                  {d.getDate()} {CRM_MON[d.getMonth()]}
                </span>
              </div>
              <div className="card" style={{ overflow: "hidden" }}>
                {byDay[iso].map((item, i) => {
                  if (item.kind === "task") {
                    const t = item.t
                    return (
                      <div
                        key={`t${t.id}`}
                        onClick={() => {
                          if (t.casoId) nav.openCaso(t.casoId)
                          else if (t.clienteId) nav.openCliente(t.clienteId)
                        }}
                        className="crm-row"
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid var(--border)" : "none", cursor: "pointer" }}
                      >
                        <div style={{ width: 52, flexShrink: 0, fontSize: 12, fontWeight: 500, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{t.hora || "dia"}</div>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--bg-sunken)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon name="listChecks" size={15} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{t.titulo}</div>
                          <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>
                            Tarefa{t.caso ? ` · ${t.caso}` : t.cliente ? ` · ${t.cliente}` : ""}
                          </div>
                        </div>
                        <CrmPrioTag p={t.prio} />
                      </div>
                    )
                  }
                  const e = item.e
                  const m = CRM_EVT[e.tipo]
                  const ini = timeOf(e.inicio)
                  return (
                    <div
                      key={`e${e.id}`}
                      onClick={() => openEvt(e)}
                      className="crm-row"
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid var(--border)" : "none", cursor: "pointer" }}
                    >
                      <div style={{ width: 52, flexShrink: 0, fontSize: 12, fontWeight: 500, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{e.diaInteiro || !ini ? "dia" : ini}</div>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: m.soft, color: m.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name={m.icon} size={15} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{e.titulo}</div>
                        <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>
                          {m.label}
                          {e.local ? ` · ${e.local}` : ""}
                          {e.responsavel ? ` · ${e.responsavel}` : ""}
                        </div>
                      </div>
                      <CrmBadge tone="neutral">{m.label}</CrmBadge>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ padding: "20px 32px 0", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--text)" }}>Agenda</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button className="btn btn-ghost" onClick={() => shift(-1)} style={{ width: 30, height: 30, padding: 0 }} aria-label="Anterior">
              <Icon name="chevronLeft" size={16} />
            </button>
            <div style={{ minWidth: 180, textAlign: "center", fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em", textTransform: "capitalize" }}>{title}</div>
            <button className="btn btn-ghost" onClick={() => shift(1)} style={{ width: 30, height: 30, padding: 0 }} aria-label="Próximo">
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
          <button className="btn btn-secondary" onClick={() => setCursor(parseISO(CRM_TODAY))} style={{ height: 30, fontSize: 12 }}>
            Hoje
          </button>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <button className="btn btn-primary" onClick={() => newAt(CRM_TODAY)}>
              <Icon name="plus" size={14} />
              Novo evento
            </button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <FxSegmented
            options={[
              { value: "mes", label: "Mês" },
              { value: "semana", label: "Semana" },
              { value: "dia", label: "Dia" },
              { value: "lista", label: "Lista" },
            ]}
            value={view}
            onChange={(v) => setView(v as typeof view)}
          />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <FxSelect
              options={[{ value: "todos", label: "Todos" }, ...data.socios.map((s) => ({ value: String(s.id), label: s.nome }))]}
              value={fResp === "todos" ? "todos" : String(fResp)}
              onChange={(e) => setFResp(e.target.value === "todos" ? "todos" : Number(e.target.value))}
            />
            <div style={{ display: "flex", gap: 4 }}>
              {FILTER_TIPOS.map((t) => {
                const on = fTipo === t
                const m = t === "todos" ? null : CRM_EVT[t]
                return (
                  <button
                    key={t}
                    onClick={() => setFTipo(t)}
                    style={{
                      height: 32, padding: "0 11px", borderRadius: 8, cursor: "pointer", fontFamily: "var(--font-sans)",
                      fontSize: 12, fontWeight: 500,
                      border: `1px solid ${on ? (m ? m.color : "var(--accent)") : "var(--border-strong)"}`,
                      background: on ? (m ? m.soft : "var(--accent-soft)") : "var(--surface)",
                      color: on ? (m ? m.color : "var(--accent)") : "var(--text-muted)",
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    {m && <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }} />}
                    {t === "todos" ? "Todos" : m!.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: "16px 32px 28px", display: "flex", flexDirection: "column" }}>
        {view === "mes" && renderMonth()}
        {view === "semana" && renderTimeline(weekDays)}
        {view === "dia" && renderTimeline([cursor])}
        {view === "lista" && <div style={{ overflowY: "auto" }}>{renderList()}</div>}
      </div>
      {modal && (
        <CrmEventoModal
          form={modal}
          dataset={dataset}
          socios={data.socios}
          leads={data.leads}
          onClose={() => setModal(null)}
          onSave={saveEvt}
          onDelete={modal.id != null ? () => removeEvt(modal.id as number) : undefined}
        />
      )}
    </div>
  )
}
