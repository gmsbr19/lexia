"use client"

// LexIA · CRM — quick-create modals (Novo cliente / Nova tarefa / Novo lançamento)
// + Anonimizar cliente (LGPD). Ported from the prototype's CrmQuick* with the
// mock store swapped for the real backend via the crm-api wrappers. Money is
// integer centavos; statuses follow the real vocab.
import { useMemo, useState } from "react"
import { apiSend } from "@/lib/client/api"
import { parseBRLToCents } from "@/lib/finance/money"
import {
  CRM_TODAY,
  FxInput,
  FxLabel,
  FxModal,
  FxSegmented,
  FxSelect,
  useCrmToast,
} from "../crm-kit"
import { Icon } from "../crm-icons"
import {
  anonimizarCliente,
  createCliente,
  createLancamento,
  mesclarClientes,
} from "../crm-api"
import type { CrmDataset } from "../crm-types"
import { ORIGEM_LABEL } from "@/lib/comercial/types"

const errMsg = (err: unknown) => (err instanceof Error ? err.message : "Erro")
/** Options for the cliente origem picker — reuses the Lead origem vocabulary. */
export const ORIGEM_OPTS = Object.entries(ORIGEM_LABEL).map(([value, label]) => ({ value, label }))

// ───────────────────────── Novo cliente ─────────────────────────
interface QuickClienteProps {
  onClose: () => void
  onRefresh: () => void
}
export function CrmQuickCliente({ onClose, onRefresh }: QuickClienteProps) {
  const { toast } = useCrmToast()
  const [tipo, setTipo] = useState<"pf" | "pj">("pf")
  const [classe, setClasse] = useState<"cliente" | "lead">("cliente")
  const [nome, setNome] = useState("")
  const [cpfCnpj, setCpfCnpj] = useState("")
  const [cidadeUf, setCidadeUf] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [origem, setOrigem] = useState("")
  const [saving, setSaving] = useState(false)

  const isPJ = tipo === "pj"

  const save = async () => {
    if (saving) return
    if (!nome.trim()) {
      toast("Informe o nome do cliente", { tone: "neg", icon: "alertTriangle" })
      return
    }
    // "São Paulo/SP" → cidade "São Paulo", uf "SP"
    const [cidadeRaw, ufRaw] = cidadeUf.split("/")
    const cidade = cidadeRaw?.trim() || null
    const uf = ufRaw?.trim().toUpperCase() || null
    setSaving(true)
    try {
      await createCliente({
        nome: nome.trim(),
        tipo,
        classificacao: classe,
        cpfCnpj: cpfCnpj.trim() || null,
        cidade,
        uf,
        emails: email.trim() ? [email.trim()] : [],
        telefones: telefone.trim() ? [telefone.trim()] : [],
        origem: origem || null,
      })
      toast("Cliente cadastrado")
      onRefresh()
      onClose()
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FxModal
      title="Novo contato"
      sub="Cadastro de pessoa física ou jurídica"
      onClose={onClose}
      width={520}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>Salvar</button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FxLabel>Tipo</FxLabel>
            <FxSegmented
              options={[{ value: "pf", label: "Pessoa física" }, { value: "pj", label: "Pessoa jurídica" }]}
              value={tipo}
              onChange={(v) => setTipo(v as "pf" | "pj")}
            />
          </div>
          <div>
            <FxLabel>Classificação</FxLabel>
            <FxSegmented
              options={[{ value: "cliente", label: "Cliente" }, { value: "lead", label: "Lead" }]}
              value={classe}
              onChange={(v) => setClasse(v as "cliente" | "lead")}
            />
          </div>
        </div>
        <div>
          <FxLabel>Nome {isPJ ? "/ Razão social" : ""}</FxLabel>
          <FxInput
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={isPJ ? "Empresa Ltda" : "Nome completo"}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FxLabel>{isPJ ? "CNPJ" : "CPF"}</FxLabel>
            <FxInput
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder={isPJ ? "00.000.000/0000-00" : "000.000.000-00"}
            />
          </div>
          <div>
            <FxLabel>Cidade/UF</FxLabel>
            <FxInput value={cidadeUf} onChange={(e) => setCidadeUf(e.target.value)} placeholder="São Paulo/SP" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FxLabel>E-mail</FxLabel>
            <FxInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@dominio.com" />
          </div>
          <div>
            <FxLabel>Telefone</FxLabel>
            <FxInput value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 90000-0000" />
          </div>
        </div>
        <div>
          <FxLabel>Origem</FxLabel>
          <FxSelect value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="— Não informada —" options={ORIGEM_OPTS} />
        </div>
      </div>
    </FxModal>
  )
}

// ───────────────────────── Nova tarefa ─────────────────────────
interface QuickTarefaProps {
  dataset: CrmDataset
  clienteId: number | null
  onClose: () => void
  onRefresh: () => void
}
export function CrmQuickTarefa({ dataset, clienteId, onClose, onRefresh }: QuickTarefaProps) {
  const { toast } = useCrmToast()
  const cli = useMemo(
    () => (clienteId != null ? dataset.clientes.find((c) => c.id === clienteId) : undefined),
    [dataset.clientes, clienteId],
  )
  const [titulo, setTitulo] = useState("")
  const [prio, setPrio] = useState("P2")
  const [prazo, setPrazo] = useState(CRM_TODAY)
  const [responsavelId, setResponsavelId] = useState<string>(
    dataset.socios[0] ? String(dataset.socios[0].id) : "",
  )
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (saving) return
    if (!titulo.trim()) {
      toast("Informe o título da tarefa", { tone: "neg", icon: "alertTriangle" })
      return
    }
    setSaving(true)
    try {
      const r = await apiSend<{ ok: boolean; result: unknown }>("/api/tarefas", "POST", {
        titulo: titulo.trim(),
        prio: Number(prio.replace("P", "")) || 4,
        prazo,
        responsavelId: responsavelId ? Number(responsavelId) : null,
        clienteId: clienteId ?? null,
      })
      void r.result
      toast("Tarefa criada")
      onRefresh()
      onClose()
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FxModal
      title="Nova tarefa"
      sub={cli ? `Vinculada a ${cli.nome}` : "Criar tarefa"}
      onClose={onClose}
      width={500}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>Criar</button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FxLabel>Título</FxLabel>
          <FxInput value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que precisa ser feito?" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <FxLabel>Prioridade</FxLabel>
            <FxSelect options={["P1", "P2", "P3", "P4"]} value={prio} onChange={(e) => setPrio(e.target.value)} />
          </div>
          <div>
            <FxLabel>Prazo</FxLabel>
            <FxInput type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <div>
            <FxLabel>Responsável</FxLabel>
            <FxSelect
              options={dataset.socios.map((u) => ({ value: String(u.id), label: u.nome }))}
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
            />
          </div>
        </div>
      </div>
    </FxModal>
  )
}

// ───────────────────────── Novo lançamento ─────────────────────────
interface QuickLancamentoProps {
  dataset: CrmDataset
  onClose: () => void
  onRefresh: () => void
}
export function CrmQuickLancamento({ dataset, onClose, onRefresh }: QuickLancamentoProps) {
  const { toast } = useCrmToast()
  const [dir, setDir] = useState<"in" | "out">("in")
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [vencimento, setVencimento] = useState(CRM_TODAY)
  const [clienteNome, setClienteNome] = useState("")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (saving) return
    if (!descricao.trim()) {
      toast("Informe a descrição", { tone: "neg", icon: "alertTriangle" })
      return
    }
    const valorCents = parseBRLToCents(valor)
    if (valorCents <= 0) {
      toast("Informe um valor válido", { tone: "neg", icon: "alertTriangle" })
      return
    }
    setSaving(true)
    try {
      await createLancamento({
        dir,
        desc: descricao.trim(),
        valorCents,
        venc: vencimento,
        party: clienteNome || null,
      })
      toast("Lançamento criado")
      onRefresh()
      onClose()
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FxModal
      title="Novo lançamento"
      sub="Honorário a receber ou despesa"
      onClose={onClose}
      width={500}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>Salvar</button>
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
        <div>
          <FxLabel>Descrição</FxLabel>
          <FxInput value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do lançamento" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FxLabel>Valor</FxLabel>
            <FxInput value={valor} onChange={(e) => setValor(e.target.value)} placeholder="R$ 0,00" />
          </div>
          <div>
            <FxLabel>Vencimento</FxLabel>
            <FxInput type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </div>
        </div>
        <div>
          <FxLabel>Cliente</FxLabel>
          <FxSelect
            options={dataset.clienteOptions.map((c) => ({ value: c.nome, label: c.nome }))}
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            placeholder="—"
          />
        </div>
      </div>
    </FxModal>
  )
}

// ───────────────────────── Mesclar clientes (dedup) ─────────────────────────
interface MesclarProps {
  dataset: CrmDataset
  /** The survivor — the client whose page we came from (kept). */
  alvoId: number
  onClose: () => void
  onRefresh: () => void
}
export function CrmMesclarClientes({ dataset, alvoId, onClose, onRefresh }: MesclarProps) {
  const { toast } = useCrmToast()
  const [pick, setPick] = useState("")
  const [txt, setTxt] = useState("")
  const [saving, setSaving] = useState(false)

  const alvo = useMemo(() => dataset.clientes.find((c) => c.id === alvoId), [dataset.clientes, alvoId])
  const dup = useMemo(() => dataset.clientes.find((c) => String(c.id) === pick), [dataset.clientes, pick])
  // confirm by typing the duplicate's name (it is the record being removed)
  const ok = !!dup && dup.id !== alvoId && txt.trim().toUpperCase() === dup.nome.toUpperCase()

  const confirm = async () => {
    if (saving || !ok || !dup) return
    setSaving(true)
    try {
      await mesclarClientes(alvoId, dup.id)
      toast("Clientes mesclados", { icon: "checkCircle" })
      onRefresh()
      onClose()
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FxModal
      title="Mesclar clientes"
      sub={alvo ? `Absorve um cliente duplicado em ${alvo.nome}. Irreversível.` : "Mesclar clientes duplicados."}
      onClose={onClose}
      width={520}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={!ok || saving}
            onClick={confirm}
            style={ok ? { background: "var(--fin-neg,#C0492F)", color: "#fff" } : {}}
          >
            Mesclar
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, background: "var(--accent-soft)", fontSize: 12, color: "var(--text-muted)" }}>
          <Icon name="sparkles" size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span>Todos os casos, honorários, lançamentos, tarefas, eventos, documentos, leads e notas do cliente duplicado passam para <strong style={{ color: "var(--text)" }}>{alvo?.nome ?? "este cliente"}</strong>. Campos vazios deste são preenchidos com os do duplicado.</span>
        </div>
        <div>
          <FxLabel>Cliente duplicado (será removido)</FxLabel>
          <FxSelect
            options={dataset.clientes.filter((c) => c.id !== alvoId).map((x) => ({ value: String(x.id), label: x.nome }))}
            value={pick}
            onChange={(e) => { setPick(e.target.value); setTxt("") }}
            placeholder="Selecione o duplicado…"
          />
        </div>
        {dup && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, background: "rgba(192,73,47,0.08)", color: "var(--fin-neg,#C0492F)", fontSize: 12 }}>
              <Icon name="alertTriangle" size={18} />
              <span>O cadastro de <strong>{dup.nome}</strong> será excluído após a migração dos vínculos.</span>
            </div>
            <div>
              <FxLabel>Digite o nome do cliente duplicado para confirmar</FxLabel>
              <FxInput value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={dup.nome} />
            </div>
          </>
        )}
      </div>
    </FxModal>
  )
}

// ───────────────────────── Anonimizar cliente (LGPD) ─────────────────────────
interface AnonimizarProps {
  dataset: CrmDataset
  clienteId?: number
  onClose: () => void
  onRefresh: () => void
}
export function CrmAnonimizar({ dataset, clienteId, onClose, onRefresh }: AnonimizarProps) {
  const { toast } = useCrmToast()
  const [pick, setPick] = useState<string>(clienteId != null ? String(clienteId) : "")
  const [txt, setTxt] = useState("")
  const [saving, setSaving] = useState(false)

  const selected = useMemo(
    () => dataset.clientes.find((x) => String(x.id) === pick),
    [dataset.clientes, pick],
  )
  const ok = !!selected && txt.trim().toUpperCase() === selected.nome.toUpperCase()

  const confirm = async () => {
    if (saving || !ok || !selected) return
    setSaving(true)
    try {
      await anonimizarCliente(selected.id)
      toast("Cliente excluído (dados pessoais apagados; financeiro mantido)", { icon: "checkCircle" })
      onRefresh()
      onClose()
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FxModal
      title="Excluir cliente"
      sub="Apaga os dados pessoais (LGPD) e mantém todo o histórico financeiro. Irreversível."
      onClose={onClose}
      width={500}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={!ok || saving}
            onClick={confirm}
            style={ok ? { background: "var(--fin-neg,#C0492F)", color: "#fff" } : {}}
          >
            Excluir cliente
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {clienteId == null && (
          <div>
            <FxLabel>Cliente</FxLabel>
            <FxSelect
              options={dataset.clientes.map((x) => ({ value: String(x.id), label: x.nome }))}
              value={pick}
              onChange={(e) => { setPick(e.target.value); setTxt("") }}
              placeholder="Selecione…"
            />
          </div>
        )}
        {selected && (
          <>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 10,
                background: "rgba(192,73,47,0.08)", color: "var(--fin-neg,#C0492F)", fontSize: 12,
              }}
            >
              <Icon name="alertTriangle" size={18} />
              <span>Nome, documentos e contatos de <strong>{selected.nome}</strong> serão apagados.</span>
            </div>
            <div>
              <FxLabel>Digite o nome do cliente para confirmar</FxLabel>
              <FxInput value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={selected.nome} />
            </div>
          </>
        )}
      </div>
    </FxModal>
  )
}
