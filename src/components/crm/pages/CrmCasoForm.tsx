"use client"

// LexIA · CRM — formulário do CASO (criar e editar). Um caso é a matéria do
// cliente: título, cliente, contrato (documento assinado — só do MESMO cliente),
// tipo, área, status e advogado responsável — e a etiqueta do caso no quadro de
// Tarefas (nome curto, cor, prazo final, descrição). Dados de processo (nº,
// tribunal, vara…) NÃO ficam aqui — moram no Processo (módulo Processos).
import { useMemo, useState } from "react"
import { FxInput, FxLabel, FxModal, FxSegmented, FxSelect, FxTextarea, useCrmToast } from "../crm-kit"
import { Icon } from "../crm-icons"
import { crmDate } from "../crm-fmt"
import { createCaso, createCliente, patchCaso, type CasoInput } from "../crm-api"
import { Combobox } from "@/components/ui/Combobox"
import { DateField } from "@/components/ui/DatePicker"
import { toAreaOptions, useAreasStore } from "@/lib/areas/store"
import { CASO_STATUS_OPTS, casoStatusBucket, casoStatusCanonico } from "@/lib/casos/status"
import { CORES_CASO } from "@/lib/tarefas/types"
import type { CasoDetail, CrmDataset } from "../crm-types"

const errMsg = (err: unknown) => (err instanceof Error ? err.message : "Erro")

interface Props {
  dataset: CrmDataset
  /** Editar este caso (ausente = criar). */
  caso?: CasoDetail | null
  /** Criar já vinculado a este cliente (ex.: a partir da ficha do contato). */
  clienteInicial?: { id: number; nome: string } | null
  onClose: () => void
  onSaved: (id: number) => void
}

export function CrmCasoFormModal({ dataset, caso = null, clienteInicial = null, onClose, onSaved }: Props) {
  const { toast } = useCrmToast()
  const editing = !!caso
  const areas = useAreasStore((s) => s.areas)
  const areaOpts = useMemo(
    () => [{ value: "", label: "— Nenhuma —" }, ...toAreaOptions(areas).map((a) => ({ value: a.id, label: a.label }))],
    [areas],
  )

  const [titulo, setTitulo] = useState(caso?.titulo ?? "")
  const [clienteId, setClienteId] = useState<string>(
    caso?.clienteId != null ? String(caso.clienteId) : clienteInicial ? String(clienteInicial.id) : "",
  )
  const [contratoId, setContratoId] = useState<string>(caso?.contrato ? String(caso.contrato.id) : "")
  const [tipo, setTipo] = useState<string>(caso?.tipo ?? "consultivo")
  const [area, setArea] = useState(caso?.area ?? "")
  const [status, setStatus] = useState(casoStatusCanonico(caso?.status))
  const [responsavelId, setResponsavelId] = useState<string>(caso?.responsavelUserId != null ? String(caso.responsavelUserId) : "")
  const [nomeCurto, setNomeCurto] = useState(caso?.nomeCurto ?? "")
  const [cor, setCor] = useState<string | null>(caso?.cor ?? null)
  const [prazo, setPrazo] = useState<string | null>(caso?.prazo ?? null)
  const [descricao, setDescricao] = useState(caso?.descricao ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  // clientes criados aqui (ainda fora do dataset) — p/ o combobox exibir o recém-criado
  const [extraClientes, setExtraClientes] = useState<{ id: number; nome: string }[]>(() => {
    const seed: { id: number; nome: string }[] = []
    if (clienteInicial) seed.push(clienteInicial)
    if (caso?.clienteId != null && caso.cliente) seed.push({ id: caso.clienteId, nome: caso.cliente })
    return seed
  })

  const clienteNum = clienteId ? Number(clienteId) : null

  const clienteOptions = useMemo(() => {
    const known = new Set(dataset.clienteOptions.map((c) => c.id))
    const extra = extraClientes.filter((e) => !known.has(e.id)).map((e) => ({ value: String(e.id), label: e.nome }))
    return [...extra, ...dataset.clienteOptions.map((c) => ({ value: String(c.id), label: c.nome }))]
  }, [dataset.clienteOptions, extraClientes])

  // Contratos elegíveis: os do cliente escolhido (+ contratos sem cliente). O
  // contrato atual do caso sempre aparece, para não sumir da tela.
  const contratoOptions = useMemo(() => {
    const elegiveis = dataset.contratos.filter(
      (c) => c.clienteId == null || (clienteNum != null && c.clienteId === clienteNum) || String(c.id) === contratoId,
    )
    return [
      { value: "", label: clienteNum == null ? "— Sem contrato —" : elegiveis.length ? "— Sem contrato —" : "— Nenhum contrato deste cliente —" },
      ...elegiveis.map((c) => ({
        value: String(c.id),
        label: `${c.titulo}${c.dataFechamento ? ` · ${crmDate(c.dataFechamento)}` : ""}`,
      })),
    ]
  }, [dataset.contratos, clienteNum, contratoId])

  const statusOpts = CASO_STATUS_OPTS.map((o) => ({ value: o.value, label: o.label }))
  const userOpts = [{ value: "", label: "— Ninguém —" }, ...dataset.usuarios.map((u) => ({ value: String(u.id), label: u.nome }))]

  const trocarCliente = (v: string | null) => {
    setClienteId(v ?? "")
    // contrato de outro cliente não pode ficar (o servidor recusa) — solta
    const atual = dataset.contratos.find((c) => String(c.id) === contratoId)
    if (atual && atual.clienteId != null && String(atual.clienteId) !== (v ?? "")) setContratoId("")
  }

  const criarCliente = async (nome: string) => {
    try {
      const r = (await createCliente({ nome })) as { id: number; nome?: string }
      setExtraClientes((prev) => [...prev, { id: r.id, nome: r.nome ?? nome }])
      trocarCliente(String(r.id))
      toast("Contato criado")
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    }
  }

  const salvar = async () => {
    if (!titulo.trim()) {
      setError("Dê um título ao caso (ex.: “Cobrança — Condomínio X”).")
      return
    }
    setSaving(true)
    setError("")
    const body: CasoInput = {
      titulo: titulo.trim(),
      clientePrincipalId: clienteNum,
      contratoId: contratoId ? Number(contratoId) : null,
      tipo,
      area: area || null,
      status,
      responsavelUserId: responsavelId ? Number(responsavelId) : null,
      nomeCurto: nomeCurto.trim() || null,
      cor,
      prazo,
      descricao: descricao.trim() || null,
    }
    try {
      if (editing && caso) {
        await patchCaso(caso.id, body)
        toast("Caso atualizado", { icon: "briefcase" })
        onSaved(caso.id)
      } else {
        const r = await createCaso(body)
        toast("Caso criado", { icon: "briefcase" })
        onSaved(r.id)
      }
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as const

  return (
    <FxModal
      title={editing ? "Editar caso" : "Novo caso"}
      sub={
        editing
          ? "Identidade do caso. Os dados do processo (nº, tribunal, vara) ficam no Processo."
          : "A matéria do cliente — depois vincule honorários, contrato e processos."
      }
      onClose={onClose}
      width={600}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar} disabled={saving}>
            <Icon name={editing ? "check" : "plus"} size={14} />
            {saving ? "Salvando…" : editing ? "Salvar" : "Criar caso"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FxLabel>Título</FxLabel>
          <FxInput
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Ação de despejo — Imóvel Rua X"
            autoFocus
          />
        </div>
        <div style={grid2}>
          <div>
            <FxLabel>Cliente</FxLabel>
            <Combobox
              options={clienteOptions}
              value={clienteId || null}
              onChange={trocarCliente}
              placeholder="Buscar contato…"
              panelWidth="content"
              onCreate={criarCliente}
              createLabel={(q) => `Criar contato "${q}"`}
            />
          </div>
          <div>
            <FxLabel hint="documento assinado">Contrato</FxLabel>
            <FxSelect options={contratoOptions} value={contratoId} onChange={(e) => setContratoId(e.target.value)} />
          </div>
        </div>
        <div style={grid2}>
          <div>
            <FxLabel>Tipo</FxLabel>
            <FxSegmented
              options={[
                { value: "consultivo", label: "Consultivo" },
                { value: "litigio", label: "Litígio" },
              ]}
              value={tipo}
              onChange={setTipo}
            />
          </div>
          <div>
            <FxLabel>Área do direito</FxLabel>
            <FxSelect options={areaOpts} value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
        </div>
        <div style={grid2}>
          <div>
            <FxLabel>Status</FxLabel>
            <FxSelect
              options={statusOpts}
              value={CASO_STATUS_OPTS.find((o) => o.bucket === casoStatusBucket(status))?.value ?? "Ativo"}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>
          <div>
            <FxLabel hint="quem conduz">Responsável</FxLabel>
            <FxSelect options={userOpts} value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} />
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={grid2}>
            <div>
              <FxLabel hint="aparece nas tarefas">Nome curto</FxLabel>
              <FxInput value={nomeCurto} maxLength={24} onChange={(e) => setNomeCurto(e.target.value)} placeholder="Ex.: Despejo Rua X" />
            </div>
            <div>
              <FxLabel>Prazo final</FxLabel>
              <DateField value={prazo} onChange={(iso) => setPrazo(iso ?? null)} placeholder="Sem prazo" />
            </div>
          </div>
          <div>
            <FxLabel hint="etiqueta no quadro">Cor</FxLabel>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {CORES_CASO.map((c) => (
                <button
                  type="button"
                  key={c}
                  title={c}
                  aria-label="Cor"
                  aria-pressed={cor === c}
                  onClick={() => setCor(cor === c ? null : c)}
                  style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: "none", cursor: "pointer", boxShadow: cor === c ? "0 0 0 2px var(--bg-elevated), 0 0 0 4px var(--text)" : "none" }}
                />
              ))}
              {!cor && <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>Sem cor: usa a cor da área</span>}
            </div>
          </div>
          <div>
            <FxLabel>Descrição</FxLabel>
            <FxTextarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que é este trabalho, em poucas linhas" />
          </div>
        </div>
        {error && <div style={{ fontSize: 12.5, color: "var(--fin-neg,#C0492F)" }}>{error}</div>}
      </div>
    </FxModal>
  )
}
