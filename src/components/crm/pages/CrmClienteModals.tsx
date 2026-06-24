"use client"

// LexIA · CRM — cliente-scoped create/edit modals used by the Cliente detail
// page. Each is PRE-LINKED to the cliente and calls onSaved() so the detail
// re-fetches (the detail is client-fetched, so router.refresh alone won't show
// the change). Tarefa supports create + edit + delete; the others are creates.
import { useState } from "react"
import { parseBRLToCents } from "@/lib/finance/money"
import { emptyDoc } from "@/lib/documents/model/types"
import { FxInput, FxLabel, FxModal, FxSegmented, FxSelect, FxTextarea, useCrmToast } from "../crm-kit"
import { Icon } from "../crm-icons"
import {
  createDocumento,
  createEvento,
  createLancamento,
  createTarefa,
  deleteEvento,
  deleteTarefa,
  patchEvento,
  patchTarefa,
} from "../crm-api"
import { crmTodayISO } from "../crm-fmt"
import type { ClienteTarefaRow, EventoRow, EventoTipo, IdNome, SocioConta } from "../crm-types"

const pad = (n: number) => String(n).padStart(2, "0")
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Erro ao salvar")

const STATUS_OPTS = [
  { value: "todo", label: "A fazer" },
  { value: "doing", label: "Fazendo" },
  { value: "review", label: "Revisão" },
  { value: "done", label: "Concluída" },
]
const PRIO_OPTS = [
  { value: "1", label: "P1 · Urgente" },
  { value: "2", label: "P2 · Alta" },
  { value: "3", label: "P3 · Média" },
  { value: "4", label: "P4 · Normal" },
]
const TIPO_OPTS: { value: EventoTipo; label: string }[] = [
  { value: "audiencia", label: "Audiência" },
  { value: "prazo", label: "Prazo" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Outro" },
]

function socioOpts(socios: SocioConta[]) {
  return socios.map((s) => ({ value: String(s.id), label: s.nome }))
}

// ───────────────────────── Tarefa (create + edit) ─────────────────────────
export function CrmTarefaModal({
  clienteId,
  tarefa,
  socios,
  onClose,
  onSaved,
}: {
  clienteId: number
  tarefa?: ClienteTarefaRow | null
  socios: SocioConta[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useCrmToast()
  const editing = !!tarefa
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "")
  const [status, setStatus] = useState(tarefa?.status ?? "todo")
  const [prio, setPrio] = useState(String(tarefa?.prio ?? 3))
  const [prazo, setPrazo] = useState(tarefa?.prazo?.slice(0, 10) ?? "")
  const [resp, setResp] = useState(tarefa?.responsavelId != null ? String(tarefa.responsavelId) : "")
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!titulo.trim()) {
      toast("Informe o título", { tone: "neg", icon: "alertTriangle" })
      return
    }
    setBusy(true)
    try {
      const base = {
        titulo: titulo.trim(),
        status,
        prio: Number(prio),
        prazo: prazo || null,
        responsavelId: resp ? Number(resp) : null,
      }
      if (editing) await patchTarefa(tarefa.id, base)
      else await createTarefa({ ...base, clienteId })
      toast(editing ? "Tarefa atualizada" : "Tarefa criada")
      onSaved()
      onClose()
    } catch (e) {
      toast(errMsg(e), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    if (!tarefa) return
    setBusy(true)
    try {
      await deleteTarefa(tarefa.id)
      toast("Tarefa excluída")
      onSaved()
      onClose()
    } catch (e) {
      toast(errMsg(e), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <FxModal
      title={editing ? "Editar tarefa" : "Nova tarefa"}
      sub="Vinculada a este cliente"
      onClose={onClose}
      width={520}
      footer={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          {editing ? (
            <button className="btn btn-ghost" onClick={remove} disabled={busy} style={{ color: "var(--fin-neg,#C0492F)" }}>
              <Icon name="trash2" size={14} />Excluir
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Salvando…" : editing ? "Salvar" : "Criar"}</button>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FxLabel>Título</FxLabel>
          <FxInput value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que precisa ser feito?" autoFocus />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FxLabel>Status</FxLabel><FxSelect options={STATUS_OPTS} value={status} onChange={(e) => setStatus(e.target.value)} /></div>
          <div><FxLabel>Prioridade</FxLabel><FxSelect options={PRIO_OPTS} value={prio} onChange={(e) => setPrio(e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FxLabel>Prazo</FxLabel><FxInput type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
          <div><FxLabel>Responsável</FxLabel><FxSelect options={socioOpts(socios)} value={resp} onChange={(e) => setResp(e.target.value)} placeholder="—" /></div>
        </div>
      </div>
    </FxModal>
  )
}

// ───────────────────────── Lançamento (create, pre-linked) ─────────────────────────
export function CrmLancamentoModal({
  clienteNome,
  onClose,
  onSaved,
}: {
  clienteNome: string
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useCrmToast()
  const [dir, setDir] = useState<"in" | "out">("in")
  const [desc, setDesc] = useState("")
  const [valor, setValor] = useState("")
  const [venc, setVenc] = useState(crmTodayISO())
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const valorCents = parseBRLToCents(valor)
    if (!desc.trim()) return toast("Informe a descrição", { tone: "neg", icon: "alertTriangle" })
    if (valorCents <= 0) return toast("Informe um valor", { tone: "neg", icon: "alertTriangle" })
    setBusy(true)
    try {
      await createLancamento({ dir, desc: desc.trim(), valorCents, venc, party: clienteNome })
      toast("Lançamento criado")
      onSaved()
      onClose()
    } catch (e) {
      toast(errMsg(e), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <FxModal
      title="Novo lançamento"
      sub={`Vinculado a ${clienteNome}`}
      onClose={onClose}
      width={500}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FxLabel>Direção</FxLabel>
          <FxSegmented
            options={[{ value: "in", label: "A receber" }, { value: "out", label: "A pagar" }]}
            value={dir}
            onChange={(v) => setDir(v as "in" | "out")}
          />
        </div>
        <div><FxLabel>Descrição</FxLabel><FxInput value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição do lançamento" autoFocus /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FxLabel hint="R$">Valor</FxLabel><FxInput value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" /></div>
          <div><FxLabel>Vencimento</FxLabel><FxInput type="date" value={venc} onChange={(e) => setVenc(e.target.value)} /></div>
        </div>
      </div>
    </FxModal>
  )
}

// ───────────────────────── Evento (create + edit, pre-linked) ─────────────────────────
export function CrmEventoModal({
  clienteId,
  evento,
  socios,
  casoOptions,
  onClose,
  onSaved,
}: {
  clienteId: number
  evento?: EventoRow | null
  socios: SocioConta[]
  casoOptions: IdNome[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useCrmToast()
  const editing = !!evento
  const seed = evento ? new Date(evento.inicio) : null
  const seedFim = evento?.fim ? new Date(evento.fim) : null
  const [titulo, setTitulo] = useState(evento?.titulo ?? "")
  const [tipo, setTipo] = useState<EventoTipo>(evento?.tipo ?? "reuniao")
  const [dia, setDia] = useState(seed ? `${seed.getFullYear()}-${pad(seed.getMonth() + 1)}-${pad(seed.getDate())}` : crmTodayISO())
  const [allDay, setAllDay] = useState(evento?.diaInteiro ?? false)
  const [hIni, setHIni] = useState(seed && !evento?.diaInteiro ? `${pad(seed.getHours())}:${pad(seed.getMinutes())}` : "09:00")
  const [hFim, setHFim] = useState(seedFim ? `${pad(seedFim.getHours())}:${pad(seedFim.getMinutes())}` : "10:00")
  const [local, setLocal] = useState(evento?.local ?? "")
  const [descricao, setDescricao] = useState(evento?.descricao ?? "")
  const [resp, setResp] = useState(evento?.responsavelId != null ? String(evento.responsavelId) : "")
  const [caso, setCaso] = useState(evento?.casoId != null ? String(evento.casoId) : "")
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!titulo.trim()) return toast("Informe o título", { tone: "neg", icon: "alertTriangle" })
    setBusy(true)
    try {
      const body = {
        titulo: titulo.trim(),
        tipo,
        dataInicio: allDay ? dia : `${dia}T${hIni}`,
        dataFim: allDay ? null : `${dia}T${hFim}`,
        diaInteiro: allDay,
        local: local.trim() || null,
        descricao: descricao.trim() || null,
        responsavelId: resp ? Number(resp) : null,
        casoId: caso ? Number(caso) : null,
        clienteId,
        status: evento?.status ?? "confirmado",
      }
      if (editing) await patchEvento(evento.id, body)
      else await createEvento(body)
      toast(editing ? "Evento atualizado" : "Evento criado")
      onSaved()
      onClose()
    } catch (e) {
      toast(errMsg(e), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    if (!evento) return
    setBusy(true)
    try {
      await deleteEvento(evento.id)
      toast("Evento excluído")
      onSaved()
      onClose()
    } catch (e) {
      toast(errMsg(e), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <FxModal
      title={editing ? "Editar evento" : "Novo evento"}
      sub="Vinculado a este cliente"
      onClose={onClose}
      width={540}
      footer={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          {editing ? (
            <button className="btn btn-ghost" onClick={remove} disabled={busy} style={{ color: "var(--fin-neg,#C0492F)" }}>
              <Icon name="trash2" size={14} />Excluir
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Salvando…" : editing ? "Salvar" : "Criar"}</button>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FxLabel>Título</FxLabel><FxInput value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Audiência, reunião, prazo…" autoFocus /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FxLabel>Tipo</FxLabel><FxSelect options={TIPO_OPTS} value={tipo} onChange={(e) => setTipo(e.target.value as EventoTipo)} /></div>
          <div><FxLabel>Data</FxLabel><FxInput type="date" value={dia} onChange={(e) => setDia(e.target.value)} /></div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          Dia inteiro
        </label>
        {!allDay && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><FxLabel>Início</FxLabel><FxInput type="time" value={hIni} onChange={(e) => setHIni(e.target.value)} /></div>
            <div><FxLabel>Término</FxLabel><FxInput type="time" value={hFim} onChange={(e) => setHFim(e.target.value)} /></div>
          </div>
        )}
        <div><FxLabel>Local ou link</FxLabel><FxInput value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Fórum / sala / link de vídeo" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FxLabel>Responsável</FxLabel><FxSelect options={socioOpts(socios)} value={resp} onChange={(e) => setResp(e.target.value)} placeholder="—" /></div>
          <div><FxLabel>Caso</FxLabel><FxSelect options={casoOptions.map((k) => ({ value: String(k.id), label: k.nome }))} value={caso} onChange={(e) => setCaso(e.target.value)} placeholder="—" /></div>
        </div>
        <div><FxLabel>Descrição</FxLabel><FxTextarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} placeholder="Detalhes do compromisso" /></div>
      </div>
    </FxModal>
  )
}

// ───────────────────────── Documento (create rascunho, pre-linked) ─────────────────────────
export function CrmDocumentoModal({
  clienteId,
  onClose,
  onSaved,
}: {
  clienteId: number
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useCrmToast()
  const [nome, setNome] = useState("Documento sem título")
  const [busy, setBusy] = useState(false)

  const save = async (openEditor: boolean) => {
    if (!nome.trim()) return toast("Informe o nome", { tone: "neg", icon: "alertTriangle" })
    setBusy(true)
    try {
      const created = (await createDocumento({
        nome: nome.trim(),
        template: "livre",
        status: "rascunho",
        conteudo: emptyDoc(),
        clienteId,
      })) as { id: number }
      toast("Documento criado (rascunho)")
      onSaved()
      onClose()
      if (openEditor) window.open(`/documents/doc/${created.id}`, "_blank")
    } catch (e) {
      toast(errMsg(e), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <FxModal
      title="Novo documento"
      sub="Cria um rascunho em branco vinculado ao cliente; o conteúdo é escrito no editor."
      onClose={onClose}
      width={500}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn btn-secondary" onClick={() => save(false)} disabled={busy}>Salvar rascunho</button>
          <button className="btn btn-primary" onClick={() => save(true)} disabled={busy}>
            <Icon name="edit" size={14} />{busy ? "…" : "Criar e abrir editor"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FxLabel>Nome</FxLabel><FxInput value={nome} onChange={(e) => setNome(e.target.value)} autoFocus /></div>
      </div>
    </FxModal>
  )
}
