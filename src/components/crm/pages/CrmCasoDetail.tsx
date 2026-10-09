"use client"

// LexIA · CRM — página do CASO (/casos/[id]). O caso é a matéria do cliente: é
// aqui que ele se liga ao CLIENTE, ao CONTRATO (documento assinado) e aos
// HONORÁRIOS (fee-lançamentos no Financeiro). Processos (o que corre no tribunal)
// aparecem numa aba própria e só quando o módulo Processos está ligado.
//
// Cabeçalho: identidade + vínculos clicáveis (cliente/contrato/responsável — um
// vínculo ausente vira atalho para o formulário) + ações Editar/Novo processo/
// Excluir. "Fixadas" (do caso e do cliente) acima das abas: aparecem em todas
// as tarefas do caso. Abas: Honorários · Processos · Tarefas & agenda ·
// Documentos · Rateio · Notas. Mesmo visual da ficha do contato.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  CrmBadge,
  CrmCasoTipoPill,
  CrmContratoStatus,
  CrmEmpty,
  CrmLink,
  CrmPrazoFatalTag,
  CrmRow,
  CRM_TASK_STATUS,
  FxCardTitle,
  FxDirChip,
  FxFrame,
  FxModal,
  FxMoney,
  FxTabs,
  useCrmToast,
  type FxTabDef,
} from "../crm-kit"
import { Icon } from "../crm-icons"
import { crmDate, crmDateLong } from "../crm-fmt"
import { deleteCaso, fetchCasoDetail, setResponsaveis } from "../crm-api"
import { CrmInfoLine, CrmMoneyStat, CrmProcessoSubRow, CrmStat } from "./crm-detail-kit"
import { CrmCasoFormModal } from "./CrmCasoForm"
import { CrmFixadasSection, CrmNotaComposer, CrmNotaRow } from "./CrmFixadas"
import { CrmRateioSlider } from "./CrmRateioSlider"
import { LancamentosTable } from "@/components/financeiro/interativo/LancamentosTable"
import { ProcNovoProcessoModal } from "@/components/processos/ProcModals"
import { resolveAreaColor, resolveAreaLabel, useAreasStore } from "@/lib/areas/store"
import { PODE_CRIAR_CASO, casoStatusBucket, casoStatusLabel, type CasoTab } from "@/lib/casos/status"
import { processosHabilitado, useModulosStore } from "@/lib/modulos/store"
import { verFinanceiro } from "@/lib/users/types"
import type { CasoDetail, CrmDataset, CrmNav } from "../crm-types"

interface Props {
  casoId: number
  tab: CasoTab
  onTab: (t: CasoTab) => void
  dataset: CrmDataset
  nav: CrmNav
  onRefresh: () => void
  /** Chamado após excluir (a rota volta para a lista). */
  onDeleted: () => void
}

type Modal = { type: "editar" } | { type: "processo" } | { type: "excluir" } | null

const errMsg = (err: unknown) => (err instanceof Error ? err.message : "Erro")

export function CrmCasoDetail({ casoId, tab, onTab, dataset, nav, onRefresh, onDeleted }: Props) {
  const router = useRouter()
  const { toast } = useCrmToast()
  const role = dataset.role
  const verFin = verFinanceiro(role)
  const podeCriar = PODE_CRIAR_CASO.includes(role)
  const processosOk = processosHabilitado(useModulosStore((s) => s.modulos))
  const areas = useAreasStore((s) => s.areas)
  const [detail, setDetail] = useState<CasoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [busy, setBusy] = useState(false)

  // rateio (2 sócios ordenados por `ordem`; o slider guia o % do sócio A)
  const socios = useMemo(() => [...dataset.socios].sort((x, y) => x.ordem - y.ordem).slice(0, 2), [dataset.socios])
  const socioA = socios[0]
  const socioB = socios[1]
  const socioAId = socioA?.id
  const [rateio, setRateio] = useState(50)
  const [savedRateio, setSavedRateio] = useState(50)

  // Aplica um detalhe recém-buscado (também semeia o slider de rateio).
  const aplicar = useCallback(
    (d: CasoDetail) => {
      setDetail(d)
      const a = socioAId != null ? d.responsaveis.find((r) => r.contaId === socioAId) : undefined
      const r = a ? a.percentual : 50
      setRateio(r)
      setSavedRateio(r)
    },
    [socioAId],
  )

  // Recarga (após salvar/lançar): mantém o conteúdo na tela enquanto busca.
  const load = useCallback(async () => {
    try {
      aplicar(await fetchCasoDetail(casoId))
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    }
  }, [aplicar, casoId, toast])

  // 1ª carga. A rota remonta este componente por caso (key={casoId}).
  useEffect(() => {
    let vivo = true
    fetchCasoDetail(casoId)
      .then((d) => {
        if (vivo) aplicar(d)
      })
      .catch((err) => {
        if (vivo) toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
      })
      .finally(() => {
        if (vivo) setLoading(false)
      })
    return () => {
      vivo = false
    }
  }, [aplicar, casoId, toast])

  const reload = useCallback(() => {
    void load()
    onRefresh()
  }, [load, onRefresh])

  if (loading && !detail) {
    return <FxFrame><CrmEmpty icon="briefcase" title="Carregando…" sub="Buscando os dados do caso." /></FxFrame>
  }
  if (!detail) {
    return (
      <FxFrame>
        <CrmEmpty icon="briefcase" title="Caso não encontrado" sub="Ele pode ter sido excluído, ou você não tem acesso a ele." />
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={() => router.push("/casos")}>
            <Icon name="chevronLeft" size={14} />Voltar para Casos
          </button>
        </div>
      </FxFrame>
    )
  }

  const fin = detail.financeiro
  const totalCents = fin.recebidoCents + fin.abertoCents
  const statusB = casoStatusBucket(detail.status)
  const areaLabel = detail.area ? resolveAreaLabel(areas, detail.area) || detail.area : null
  const areaColor = detail.area ? resolveAreaColor(areas, detail.area) : null
  const tarefasAbertas = detail.tarefas.filter((t) => t.status !== "done").length
  const showRateio = verFin && !!socioA && !!socioB
  const hoje = new Date().toISOString().slice(0, 10)
  const sectionCard = (children: ReactNode) => <div className="card" style={{ overflow: "hidden" }}>{children}</div>
  const quem = { id: dataset.userId, role: dataset.role }
  const recarregarNotas = () => void load()

  const TABS: FxTabDef[] = [
    { id: "honorarios", label: "Honorários", icon: "receipt", badge: fin.lancamentos.length || null },
    ...(processosOk ? [{ id: "processos", label: "Processos", icon: "scale", badge: detail.processos.length || null } as FxTabDef] : []),
    { id: "tarefas", label: "Tarefas & agenda", icon: "listChecks", badge: detail.tarefas.length + detail.eventos.length || null },
    { id: "documentos", label: "Documentos", icon: "fileText", badge: detail.documentos.length || null },
    ...(showRateio ? [{ id: "rateio", label: "Rateio", icon: "percent" } as FxTabDef] : []),
    { id: "notas", label: "Notas", icon: "edit3", badge: detail.anotacoes.length || null },
  ]
  // aba pedida pode não existir (módulo desligado, sem permissão) → Honorários
  const activeTab: CasoTab = TABS.some((t) => t.id === tab) ? tab : "honorarios"

  const saveRateio = async () => {
    if (!socioA || !socioB) return
    setBusy(true)
    try {
      await setResponsaveis(casoId, [
        { contaId: socioA.id, percentual: rateio },
        { contaId: socioB.id, percentual: 100 - rateio },
      ])
      setSavedRateio(rateio)
      toast(`Rateio salvo: ${rateio}/${100 - rateio}`)
      reload()
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }

  const excluir = async () => {
    setBusy(true)
    try {
      await deleteCaso(casoId)
      toast("Caso excluído", { icon: "trash2" })
      setModal(null)
      onDeleted()
    } catch (err) {
      toast(errMsg(err), { tone: "neg", icon: "alertTriangle" })
    } finally {
      setBusy(false)
    }
  }

  const contratoLabel = detail.contrato
    ? detail.contrato.titulo ?? `Contrato de ${crmDate(detail.contrato.dataFechamento)}`
    : null

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* header */}
      <div style={{ padding: "24px 40px 0", maxWidth: 1240, margin: "0 auto", width: "100%" }}>
        <button
          className="btn btn-ghost"
          onClick={() => router.push("/casos")}
          style={{ height: 28, fontSize: 12, padding: "0 8px", marginLeft: -8, marginBottom: 10, color: "var(--text-muted)" }}
        >
          <Icon name="chevronLeft" size={13} />Casos
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
          <div
            style={{
              width: 58, height: 58, borderRadius: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--accent-soft)", color: "var(--accent)",
            }}
          >
            <Icon name="briefcase" size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--text)" }}>{detail.titulo}</h1>
              <CrmCasoTipoPill tipo={detail.tipo} />
              <CrmBadge tone={statusB === "arquivado" ? "neutral" : statusB === "suspenso" ? "gold" : "pos"} dot>
                {casoStatusLabel(detail.status)}
              </CrmBadge>
              {areaLabel && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: areaColor ?? "var(--text-subtle)" }} />
                  {areaLabel}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12 }}>
              <CrmInfoLine icon="user">
                {detail.clienteId != null && detail.cliente ? (
                  <CrmLink onClick={() => nav.openCliente(detail.clienteId!)}>{detail.cliente}</CrmLink>
                ) : (
                  <CrmLink onClick={() => setModal({ type: "editar" })}>Vincular cliente</CrmLink>
                )}
              </CrmInfoLine>
              <CrmInfoLine icon="receipt">
                {detail.contrato ? (
                  <CrmLink onClick={() => nav.openContrato(detail.contrato!.id)}>{contratoLabel}</CrmLink>
                ) : (
                  <CrmLink onClick={() => setModal({ type: "editar" })}>Vincular contrato</CrmLink>
                )}
              </CrmInfoLine>
              <CrmInfoLine icon="users">
                {detail.responsavelUser ?? detail.responsavel ?? (
                  <CrmLink onClick={() => setModal({ type: "editar" })}>Definir responsável</CrmLink>
                )}
              </CrmInfoLine>
              {detail.dataCriacao && <CrmInfoLine icon="calendar">Aberto em {crmDateLong(detail.dataCriacao)}</CrmInfoLine>}
              {detail.prazo && <CrmInfoLine icon="flag">Prazo final {crmDateLong(detail.prazo)}</CrmInfoLine>}
            </div>
            {detail.descricao && (
              <div style={{ marginTop: 10, maxWidth: 820, fontSize: 13, color: "var(--text-muted)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{detail.descricao}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={() => router.push(`/tarefas?caso=${detail.id}`)} title="Tarefas deste caso no quadro">
              <Icon name="kanban" size={14} />Abrir no quadro
            </button>
            {processosOk && podeCriar && (
              <button className="btn btn-secondary" onClick={() => setModal({ type: "processo" })}>
                <Icon name="scale" size={14} />Novo processo
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setModal({ type: "editar" })}>
              <Icon name="edit" size={14} />Editar caso
            </button>
            {podeCriar && (
              <button
                className="btn btn-ghost"
                onClick={() => setModal({ type: "excluir" })}
                title="Excluir caso"
                style={{ color: "var(--fin-neg,#C0492F)" }}
              >
                <Icon name="trash2" size={14} />Excluir
              </button>
            )}
          </div>
        </div>

        {/* numeric summary */}
        <div style={{ display: "flex", gap: 36, flexWrap: "wrap", padding: "20px 0 22px", marginTop: 18, borderTop: "1px solid var(--border)" }}>
          {verFin && <CrmMoneyStat label="Honorários" cents={totalCents} tone={null} />}
          {verFin && <CrmMoneyStat label="Recebido" cents={fin.recebidoCents} tone="pos" />}
          {verFin && <CrmMoneyStat label="Em aberto" cents={fin.abertoCents} tone={null} />}
          {processosOk && <CrmStat label="Processos" value={detail.processos.length} />}
          <CrmStat label="Tarefas abertas" value={tarefasAbertas} />
        </div>

        <CrmFixadasSection
          itens={[...detail.anotacoes.filter((a) => a.fixado), ...detail.fixadasCliente]}
          sub="Aparecem em todas as tarefas deste caso"
          quem={quem}
          onChanged={recarregarNotas}
          badgeDe={(i) => (i.ancora.tipo === "cliente" ? "Do cliente" : undefined)}
        />
      </div>

      {/* tabs */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--bg)" }}>
        <FxTabs tabs={TABS} active={activeTab} onChange={(id) => onTab(id as CasoTab)} />
      </div>

      <div style={{ padding: "22px 40px 48px", maxWidth: 1240, margin: "0 auto", width: "100%" }}>
        {activeTab === "honorarios" && (
          <>
            {verFin && detail.lancOptions ? (
              <>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>
                  Lançamentos deste caso — ficam no Financeiro vinculados ao caso
                  {detail.cliente ? <> e a <strong style={{ fontWeight: 500 }}>{detail.cliente}</strong></> : null}.
                  {!detail.cliente && " Vincule um cliente ao caso para que os honorários apareçam também na ficha do contato."}
                </div>
                <LancamentosTable
                  rows={fin.lancamentos}
                  options={detail.lancOptions}
                  embedded
                  onRefresh={reload}
                  lockCaso={{ id: detail.id, titulo: detail.titulo }}
                  lockCliente={detail.clienteId != null && detail.cliente ? { id: detail.clienteId, nome: detail.cliente } : null}
                />
              </>
            ) : (
              <>
                <FxCardTitle title="Honorários" sub={`${fin.lancamentos.length} lançamento(s) vinculados a este caso`} />
                {fin.lancamentos.length === 0
                  ? sectionCard(<CrmEmpty icon="receipt" title="Sem honorários lançados" />)
                  : sectionCard(fin.lancamentos.map((l, i) => (
                    <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                      <FxDirChip dir={l.dir} compact />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.desc}</span>
                      <span style={{ fontSize: 12, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>{crmDate(l.venc)}</span>
                      <CrmContratoStatus status={l.pago ? "recebido" : "lancado"} venc={l.venc} />
                      <span style={{ width: 100, textAlign: "right" }}><FxMoney cents={l.valorCents} dir={l.dir} /></span>
                    </div>
                  )))}
              </>
            )}
          </>
        )}

        {activeTab === "processos" && processosOk && (
          <>
            <FxCardTitle
              title="Processos"
              sub="O que corre no tribunal — nº CNJ, prazos e andamentos ficam na ficha do processo"
              right={
                podeCriar && (
                  <button className="btn btn-secondary" onClick={() => setModal({ type: "processo" })} style={{ height: 32 }}>
                    <Icon name="plus" size={14} />Novo processo
                  </button>
                )
              }
            />
            {detail.processos.length === 0
              ? sectionCard(<CrmEmpty icon="scale" title="Sem processos" sub="Consultivo, ou ainda não ajuizado." />)
              : sectionCard(detail.processos.map((p) => (
                <CrmProcessoSubRow key={p.id} p={p} hoje={hoje} onClick={() => nav.openProcesso(p.id)} />
              )))}
          </>
        )}

        {activeTab === "tarefas" && (
          <>
            <FxCardTitle
              title="Tarefas"
              sub="O quadro de Tarefas deste caso · cada tarefa abre no módulo Tarefas"
              right={
                <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/tarefas?caso=${detail.id}`)}>
                  <Icon name="kanban" size={13} />Abrir no quadro
                </button>
              }
            />
            {detail.tarefas.length === 0
              ? sectionCard(<CrmEmpty icon="listChecks" title="Sem tarefas" />)
              : sectionCard(detail.tarefas.map((t, i) => {
                const sm = CRM_TASK_STATUS[t.status] ?? CRM_TASK_STATUS.todo
                const resp = dataset.usuarios.find((u) => u.id === t.responsavelId)?.nome
                return (
                  <CrmRow key={t.id} onClick={() => router.push(`/tarefas?tarefa=${t.id}`)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                    {t.prazoFatal && <CrmPrazoFatalTag />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{t.titulo}</div>
                      <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>Prazo {crmDate(t.prazo)}{resp ? ` · ${resp}` : ""}</div>
                    </div>
                    <CrmBadge tone={sm.tone}>{sm.label}</CrmBadge>
                    <Icon name="chevronRight" size={15} style={{ color: "var(--text-subtle)" }} />
                  </CrmRow>
                )
              }))}
            <div style={{ height: 22 }} />
            <FxCardTitle title="Agenda" sub="Audiências, reuniões e compromissos deste caso" />
            {detail.eventos.length === 0
              ? sectionCard(<CrmEmpty icon="calendar" title="Sem eventos" />)
              : sectionCard(detail.eventos.map((e, i) => (
                <CrmRow key={e.id} onClick={() => router.push("/agenda")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <Icon name="calendar" size={15} style={{ color: "var(--text-subtle)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{e.titulo}</div>
                    <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>{crmDateLong(e.inicio)}{e.responsavel ? ` · ${e.responsavel}` : ""}</div>
                  </div>
                  {e.status === "cancelado" && <CrmBadge tone="neutral">Cancelado</CrmBadge>}
                </CrmRow>
              )))}
          </>
        )}

        {activeTab === "documentos" && (
          <>
            <FxCardTitle title="Documentos" sub="Gerados ou importados e vinculados a este caso" />
            {detail.documentos.length === 0
              ? sectionCard(<CrmEmpty icon="fileText" title="Sem documentos" />)
              : sectionCard(detail.documentos.map((d, i) => (
                <CrmRow key={d.id} onClick={() => router.push(`/documents/doc/${d.id}`)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <Icon name="fileText" size={15} style={{ color: "var(--text-subtle)" }} />
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{d.nome}</div>
                  <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{crmDate(d.createdAt)}</span>
                  <Icon name="chevronRight" size={15} style={{ color: "var(--text-subtle)" }} />
                </CrmRow>
              )))}
          </>
        )}

        {activeTab === "rateio" && showRateio && (
          <>
            <FxCardTitle title="Rateio entre sócios" sub="Divisão dos honorários deste caso. Pontos de atração em 0, 50 e 100%." />
            <div className="card" style={{ padding: "18px 18px 16px", maxWidth: 640 }}>
              <CrmRateioSlider value={rateio} onChange={setRateio} total={totalCents} nomeA={socioA!.nome} nomeB={socioB!.nome} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16 }}>
                <span style={{ fontSize: 12, color: rateio !== savedRateio ? "var(--accent)" : "var(--text-subtle)" }}>
                  {rateio !== savedRateio ? "Alteração de rateio não salva" : "Rateio atualizado"}
                </span>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-ghost" onClick={() => setRateio(savedRateio)} disabled={rateio === savedRateio || busy}>Descartar</button>
                  <button className="btn btn-primary" onClick={saveRateio} disabled={rateio === savedRateio || busy}>{busy ? "Salvando…" : "Salvar rateio"}</button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "notas" && (
          <>
            <FxCardTitle title="Notas" sub="Anotações do caso (inclui dados antigos importados do Astrea) · as fixadas aparecem em todas as tarefas do caso" />
            <CrmNotaComposer
              ancora={{ tipo: "caso", id: detail.id }}
              placeholder="Registre um combinado, uma particularidade ou um cuidado deste caso…"
              onCreated={recarregarNotas}
            />
            {detail.anotacoes.length === 0
              ? sectionCard(<CrmEmpty icon="edit3" title="Sem notas" sub="Fixe o que toda tarefa do caso precisa saber." />)
              : sectionCard(detail.anotacoes.map((a, i) => (
                <CrmNotaRow key={a.id} info={a} quem={quem} onChanged={recarregarNotas} first={i === 0} />
              )))}
          </>
        )}
      </div>

      {modal?.type === "editar" && (
        <CrmCasoFormModal
          dataset={dataset}
          caso={detail}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); reload() }}
        />
      )}
      {modal?.type === "processo" && (
        <ProcNovoProcessoModal
          casoOptions={dataset.casoOptions}
          responsaveis={dataset.usuarios}
          casoFixo={{ id: detail.id, nome: detail.titulo }}
          onClose={() => setModal(null)}
          onCreated={() => { setModal(null); reload(); onTab("processos") }}
        />
      )}
      {modal?.type === "excluir" && (
        <FxModal
          title="Excluir caso?"
          sub={detail.titulo}
          onClose={() => setModal(null)}
          width={480}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={busy}>Cancelar</button>
              <button className="btn btn-primary" onClick={excluir} disabled={busy} style={{ background: "var(--fin-neg,#C0492F)", borderColor: "var(--fin-neg,#C0492F)" }}>
                <Icon name="trash2" size={14} />{busy ? "Excluindo…" : "Excluir caso"}
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
            <div>O caso sai das listas{detail.contrato ? " e do contrato" : ""}. Junto com ele são arquivados:</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>{detail.processos.length} processo(s), com prazos, andamentos e publicações pendentes;</li>
              <li>os eventos da agenda vinculados (ficam cancelados).</li>
            </ul>
            {detail.tarefas.length > 0 && (
              <div>
                {detail.tarefas.length === 1
                  ? "A tarefa do caso continua no quadro, como \"Sem caso\"."
                  : `As ${detail.tarefas.length} tarefas do caso continuam no quadro, como "Sem caso".`}
              </div>
            )}
            <div>
              {fin.lancamentos.length > 0
                ? `Os ${fin.lancamentos.length} lançamento(s) financeiro(s) NÃO são apagados — continuam no Financeiro e na ficha do cliente.`
                : "Não há lançamentos financeiros vinculados."}
            </div>
          </div>
        </FxModal>
      )}
    </div>
  )
}
