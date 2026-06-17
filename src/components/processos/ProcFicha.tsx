"use client"

// Contencioso · Ficha consolidada do processo. Cabeçalho de identificação fixo +
// conteúdo em ABAS (alternável p/ seções em rolagem). Consome o ProcessoDetail
// (server-fetched); mutações via apiSend + refresh.
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { FxMoney, CrmAvatar, CrmBadge, CrmEmpty, FxTextarea, useCrmToast } from "@/components/crm/crm-kit"
import { crmDate, crmMoney } from "@/components/crm/crm-fmt"
import { Icon, type CrmIconName } from "@/components/crm/crm-icons"
import { limparTextoPublicacao } from "@/lib/processos/texto"
import type { ProcessoDetail, PublicacaoRow } from "@/lib/processos/types"
import type { ResumoProcesso, SituacaoProcesso } from "@/lib/processos/resumo-ai"
import {
  ProcCNJ, ProcFaseTag, ProcFonte, ProcMovIcon, ProcResp, ProcSecTitle, ProcSemaforo, ProcStatus, sistemaLabel,
} from "./proc-kit"
import { createAnotacao, cumprirPrazo, getResumo, regenerarResumo } from "./proc-api"

const FICHA_TABS: { id: string; label: string; icon: CrmIconName }[] = [
  { id: "resumo", label: "Resumo", icon: "layoutGrid" },
  { id: "timeline", label: "Linha do tempo", icon: "history" },
  { id: "prazos", label: "Prazos", icon: "flag" },
  { id: "publicacoes", label: "Publicações", icon: "scroll" },
  { id: "docs", label: "Documentos", icon: "fileText" },
  { id: "fin", label: "Financeiro", icon: "wallet" },
  { id: "partes", label: "Partes", icon: "users" },
  { id: "notas", label: "Anotações", icon: "feather" },
]

function Field({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, fontVariantNumeric: mono ? "tabular-nums" : "normal" }}>{value}</div>
    </div>
  )
}

const STATUS_TRIAGEM: Record<string, { label: string; tone: "neutral" | "gold" | "pos" }> = {
  pendente: { label: "A triar", tone: "gold" },
  triada: { label: "Relevante", tone: "pos" },
  descartada: { label: "Cartorário", tone: "neutral" },
}

const SITUACAO_UI: Record<SituacaoProcesso, { label: string; tone: "pos" | "gold" | "neg" | "neutral" }> = {
  em_dia: { label: "Em dia", tone: "pos" },
  atencao: { label: "Atenção", tone: "gold" },
  critico: { label: "Crítico", tone: "neg" },
  parado: { label: "Parado", tone: "neutral" },
}

export function ProcFicha({
  detail, hoje, onBack, openCliente, onLancarPrazo, onTriar, refresh, onEditar, onExcluir,
}: {
  detail: ProcessoDetail
  hoje: string
  onBack: () => void
  openCliente: (id: number) => void
  onLancarPrazo: () => void
  onTriar: (pub: PublicacaoRow) => void
  refresh: () => void
  onEditar?: () => void
  onExcluir?: () => void
}) {
  const { toast } = useCrmToast()
  const [layout, setLayout] = useState<"abas" | "secoes">("abas")
  const [tab, setTab] = useState("resumo")
  const [nota, setNota] = useState("")
  const [savingNota, setSavingNota] = useState(false)

  // Resumo inteligente (IA) — carregado client-side, como o capturaStatus do ProcessosApp.
  const [resumo, setResumo] = useState<ResumoProcesso | null>(null)
  const [resumoLoading, setResumoLoading] = useState(true)
  const [resumoErro, setResumoErro] = useState(false)
  const [regenerando, setRegenerando] = useState(false)

  useEffect(() => {
    let vivo = true
    setResumoLoading(true)
    setResumoErro(false)
    getResumo(detail.id)
      .then((r) => { if (vivo) setResumo(r) })
      .catch(() => { if (vivo) setResumoErro(true) })
      .finally(() => { if (vivo) setResumoLoading(false) })
    return () => { vivo = false }
  }, [detail.id])

  const regenerar = async () => {
    setRegenerando(true)
    try {
      const r = await regenerarResumo(detail.id)
      setResumo(r)
      setResumoErro(false)
    } catch {
      toast("Não foi possível gerar o resumo", { tone: "neg" })
    } finally {
      setRegenerando(false)
    }
  }

  const nosso = useMemo(() => detail.partes.find((p) => p.ehCliente) ?? detail.partes[0] ?? null, [detail.partes])
  const contraria = useMemo(() => detail.partes.find((p) => !p.ehCliente) ?? null, [detail.partes])
  // Título Astrea-style "Autor × Réu" — cai para a classe quando não há partes.
  const tituloPartes = useMemo(() => {
    const a = nosso?.nome
    const b = contraria?.nome
    if (a && b) return `${a} × ${b}`
    if (a || b) return (a ?? b) as string
    return detail.classe ?? "Processo"
  }, [nosso, contraria, detail.classe])
  const subtitulo = useMemo(() => {
    // Quando o título mostra as partes, classe·assunto vira subtítulo.
    const usaPartes = !!(nosso?.nome || contraria?.nome)
    if (!usaPartes) return detail.assunto ?? null
    return [detail.classe, detail.assunto].filter(Boolean).join(" · ") || null
  }, [nosso, contraria, detail.classe, detail.assunto])
  const prazosPend = detail.prazos.filter((p) => p.status === "pendente")
  const prazosProp = detail.prazos.filter((p) => p.status === "proposto")
  const prazoProx = prazosPend[0] ?? null
  // 'proposto' (rascunho da IA) NÃO é pendente nem histórico — confirma-se na aba Prazos.
  const prazosHist = detail.prazos.filter((p) => p.status !== "pendente" && p.status !== "proposto")
  const fin = detail.financeiro

  const tabs = FICHA_TABS.filter((t) => t.id !== "fin" || !!fin)

  const protocolar = async (id: number) => {
    try {
      await cumprirPrazo(id)
      toast("Prazo protocolado", { icon: "checkCircle" })
      refresh()
    } catch {
      toast("Não foi possível protocolar", { tone: "neg" })
    }
  }
  const addNota = async () => {
    if (!nota.trim()) return
    setSavingNota(true)
    try {
      await createAnotacao({ processoId: detail.id, conteudo: nota.trim(), interno: true })
      setNota("")
      toast("Anotação salva")
      refresh()
    } catch {
      toast("Não foi possível salvar a anotação", { tone: "neg" })
    } finally {
      setSavingNota(false)
    }
  }

  // ── section renderers ──
  const Timeline = () =>
    detail.andamentos.length === 0 ? (
      <CrmEmpty icon="history" title="Sem movimentações" sub="Nenhum andamento registrado neste processo." />
    ) : (
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 15, top: 8, bottom: 8, width: 2, background: "var(--border)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {detail.andamentos.map((a) => (
            <div key={a.id} style={{ display: "flex", gap: 14, padding: "10px 0", position: "relative" }}>
              <div style={{ position: "relative", zIndex: 1 }}><ProcMovIcon tipo={a.tipo} active={a.relevante} /></div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{a.tipo ?? "Andamento"}</span>
                  {a.relevante && <CrmBadge tone="gold" dot>relevante</CrmBadge>}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>{a.descricao}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7 }}>
                  <ProcFonte fonte={a.fonte} />
                  <span style={{ fontSize: 12, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>{crmDate(a.data)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )

  const Prazos = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {prazosProp.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-gold)", background: "var(--accent-soft)", fontSize: 12.5, color: "var(--text-muted)" }}>
          <Icon name="sparkles" size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
          {prazosProp.length} prazo{prazosProp.length === 1 ? "" : "s"} proposto{prazosProp.length === 1 ? "" : "s"} pela IA aguardando confirmação — confirme na aba <strong style={{ color: "var(--text)" }}>Prazos</strong>.
        </div>
      )}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)", fontSize: 12, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Prazos abertos</div>
        {prazosPend.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: "var(--text-subtle)" }}>Nenhum prazo em aberto.</div>
        ) : (
          prazosPend.map((x, i) => (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 4, alignSelf: "stretch", borderRadius: 3, background: x.urgencia?.faixa === "vermelho" ? "var(--crit)" : x.urgencia?.faixa === "ambar" ? "var(--warn)" : "var(--ok)", margin: "2px 0" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{x.descricao}</div>
                <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 2 }}>fatal {crmDate(x.dataFatal)} · interno {crmDate(x.dataInterna)}</div>
              </div>
              <ProcResp nome={x.responsavel} showName={false} />
              <ProcSemaforo urgencia={x.urgencia} />
              <button className="btn btn-ghost btn-sm" onClick={() => protocolar(x.id)} style={{ fontSize: 12 }}><Icon name="check" size={13} />Protocolar</button>
            </div>
          ))
        )}
      </div>
      {prazosHist.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Histórico</div>
          <div className="card" style={{ overflow: "hidden" }}>
            {prazosHist.map((x, i) => (
              <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: i ? "1px solid var(--border)" : "none", opacity: 0.78 }}>
                <Icon name="checkCircle" size={15} style={{ color: "var(--ok)" }} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{x.descricao}</span>
                <span style={{ fontSize: 12, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>{crmDate(x.dataFatal)}</span>
                <CrmBadge tone={x.status === "cumprido" ? "pos" : "neutral"}>{x.status === "cumprido" ? "Cumprido" : x.status}</CrmBadge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const Publicacoes = () =>
    detail.publicacoes.length === 0 ? (
      <CrmEmpty icon="scroll" title="Sem publicações" sub="Nenhuma publicação vinculada a este processo." />
    ) : (
      <div className="card" style={{ overflow: "hidden" }}>
        {detail.publicacoes.map((pub, i) => {
          const st = STATUS_TRIAGEM[pub.statusTriagem] ?? STATUS_TRIAGEM.pendente
          return (
            <div key={pub.id} style={{ display: "flex", gap: 13, padding: "13px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <ProcMovIcon tipo="publicacao" active={pub.statusTriagem === "pendente"} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{pub.diario ?? "Publicação"}</span>
                  <CrmBadge tone={st.tone} dot>{st.label}</CrmBadge>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{limparTextoPublicacao(pub.conteudo)}</div>
                <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 6 }}>{crmDate(pub.dataPublicacao ?? pub.dataDisponibilizacao ?? pub.createdAt)}</div>
              </div>
              {pub.statusTriagem === "pendente" && (
                <button className="btn btn-secondary btn-sm" onClick={() => onTriar(pub)} style={{ fontSize: 12, flexShrink: 0, alignSelf: "center" }}><Icon name="flag" size={13} />Triar</button>
              )}
            </div>
          )
        })}
      </div>
    )

  const Docs = () =>
    detail.documentos.length === 0 ? (
      <CrmEmpty icon="fileText" title="Sem documentos vinculados" />
    ) : (
      <div className="card" style={{ overflow: "hidden" }}>
        {detail.documentos.map((d, i) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--bg-sunken)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="fileText" size={16} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.nome}</div>
              <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>{[d.tipo, d.formato].filter(Boolean).join(" · ") || "—"} · {crmDate(d.createdAt)}</div>
            </div>
            {d.versoes > 0 && <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", background: "var(--bg-sunken)", padding: "2px 8px", borderRadius: 6, fontVariantNumeric: "tabular-nums" }}>v{d.versoes}</span>}
            <CrmBadge tone={d.status === "finalizado" || d.status === "final" ? "pos" : "neutral"}>{d.status}</CrmBadge>
          </div>
        ))}
      </div>
    )

  const Financeiro = () => {
    if (!fin) return <CrmEmpty icon="wallet" title="Sem visão financeira" sub="Seu perfil não tem acesso ao financeiro do processo." />
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          <div className="card" style={{ padding: "15px 17px" }}><div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Recebido</div><FxMoney cents={fin.recebidoCents} dir="in" size={22} /></div>
          <div className="card" style={{ padding: "15px 17px" }}><div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Em aberto</div><span style={{ fontSize: 22, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>{crmMoney(fin.abertoCents)}</span></div>
          <div className="card" style={{ padding: "15px 17px" }}><div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Total honorários</div><span style={{ fontSize: 22, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>{crmMoney(fin.recebidoCents + fin.abertoCents)}</span></div>
        </div>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)", fontSize: 12, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Lançamentos do processo</div>
          {fin.lancamentos.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: "var(--text-subtle)" }}>Nenhum lançamento vinculado.</div>
          ) : (
            fin.lancamentos.map((l, i) => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <span style={{ flex: 1, fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.desc}</span>
                {l.pago ? <CrmBadge tone="pos">pago</CrmBadge> : <CrmBadge tone="neutral">em aberto</CrmBadge>}
                <span style={{ width: 110, textAlign: "right" }}><FxMoney cents={l.valorCents} dir={l.dir} /></span>
              </div>
            ))
          )}
        </div>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)", fontSize: 12, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Honorários conectados</div>
          {fin.honorarios.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: "var(--text-subtle)" }}>Nenhum honorário conectado a este processo. A LexIA pode conectar (“conecte o honorário X a este processo”).</div>
          ) : (
            fin.honorarios.map((h, i) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <span style={{ flex: 1, fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.descricao}</span>
                {h.status === "recebido" ? <CrmBadge tone="pos">recebido</CrmBadge> : <CrmBadge tone="neutral">{h.status ?? "lançado"}</CrmBadge>}
                <span style={{ width: 110, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>{crmMoney(h.valorCents)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  const Partes = () =>
    detail.partes.length === 0 ? (
      <CrmEmpty icon="users" title="Sem partes cadastradas" />
    ) : (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {detail.partes.map((x) => (
          <div key={x.id} className="card" style={{ padding: 16, display: "flex", gap: 13, alignItems: "flex-start", borderColor: x.ehCliente ? "var(--border-gold)" : "var(--border)" }}>
            <CrmAvatar name={x.nome} size={42} tipo={x.tipo} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <CrmBadge tone={x.ehCliente ? "gold" : "neutral"} dot>{x.papel}</CrmBadge>
                {x.ehCliente && <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>nosso cliente</span>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>{x.nome}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{x.tipo.toUpperCase()}{x.documento ? ` · ${x.documento}` : ""}</div>
              {x.ehCliente && x.clienteId && (
                <button className="btn btn-ghost btn-sm" onClick={() => openCliente(x.clienteId as number)} style={{ fontSize: 12, marginTop: 8, padding: "0 8px", height: 28 }}><Icon name="externalLink" size={12} />Abrir cadastro</button>
              )}
            </div>
          </div>
        ))}
      </div>
    )

  const Notas = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-subtle)" }}>
        <Icon name="eye" size={14} /><span>Notas internas — não visíveis ao cliente.</span>
      </div>
      <div className="card" style={{ padding: 14 }}>
        <FxTextarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Anotação de estratégia, instrução ou lembrete…" style={{ minHeight: 64, marginBottom: 10 }} />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary btn-sm" disabled={!nota.trim() || savingNota} onClick={addNota}><Icon name="plus" size={13} />{savingNota ? "Salvando…" : "Adicionar nota"}</button>
        </div>
      </div>
      {detail.anotacoes.map((n) => (
        <div key={n.id} className="card" style={{ padding: 14, background: "var(--bg-soft)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <ProcResp nome={n.autor} />
            <span style={{ fontSize: 12, color: "var(--text-subtle)", marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{crmDate(n.createdAt)}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>{n.conteudo}</div>
        </div>
      ))}
    </div>
  )

  // ── Resumo (visão geral, Astrea-style) ──
  const RailCard = ({ icon, title, action, children }: { icon: CrmIconName; title: string; action?: ReactNode; children: ReactNode }) => (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon name={icon} size={14} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</span>
        {action && <div style={{ marginLeft: "auto" }}>{action}</div>}
      </div>
      {children}
    </div>
  )

  const Resumo = () => {
    const sit = resumo ? SITUACAO_UI[resumo.situacao] : null
    return (
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(280px,1fr)", gap: 20, alignItems: "start" }}>
        {/* LEFT — Dados do processo */}
        <div className="card" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Icon name="layoutGrid" size={15} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Dados do processo</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 22px" }}>
            <Field label="Tribunal" value={detail.tribunal ?? "—"} />
            <Field label="Comarca / foro" value={detail.comarca ?? "—"} />
            <Field label="Vara / órgão" value={detail.vara ?? "—"} />
            <Field label="Instância" value={detail.instancia ?? "—"} />
            <Field label="Valor da causa" value={crmMoney(detail.valorCausaCents)} mono />
            <Field label="Distribuição" value={detail.dataDistribuicao ? crmDate(detail.dataDistribuicao) : "—"} mono />
            <Field label="Sistema" value={sistemaLabel(detail.sistema)} />
            <Field label="Caso" value={detail.caso ?? "—"} />
            {detail.cliente ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500, marginBottom: 3 }}>Cliente</div>
                <button
                  onClick={() => openCliente(detail.cliente!.id)}
                  title="Abrir cadastro"
                  style={{ background: "transparent", border: "none", padding: 0, textAlign: "left", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--accent)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {detail.cliente.nome}
                </button>
              </div>
            ) : (
              <Field label="Cliente" value="—" />
            )}
          </div>
        </div>

        {/* RIGHT RAIL */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* AI card */}
          <div className="card" style={{ padding: 16, border: "1px solid var(--border-gold)", background: "var(--accent-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Icon name="sparkles" size={15} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Resumo inteligente</span>
              {sit && <span style={{ marginLeft: "auto" }}><CrmBadge tone={sit.tone} dot>{sit.label}</CrmBadge></span>}
            </div>
            {resumoLoading ? (
              <div style={{ fontSize: 13, color: "var(--text-subtle)" }}>Gerando resumo…</div>
            ) : resumoErro || !resumo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 13, color: "var(--text-subtle)" }}>Não foi possível carregar o resumo agora.</div>
                <button className="btn btn-secondary btn-sm" onClick={regenerar} disabled={regenerando} style={{ fontSize: 12, alignSelf: "flex-start" }}>
                  <Icon name="refreshCw" size={13} />{regenerando ? "Gerando…" : "Tentar novamente"}
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>{resumo.resumo}</div>
                {resumo.proximoPasso && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-gold)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Próximo passo</div>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, lineHeight: 1.5 }}>{resumo.proximoPasso}</div>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>{resumo.fonte === "ia" ? "Gerado por IA" : "Resumo determinístico"}</span>
                  <button className="btn btn-ghost btn-sm" onClick={regenerar} disabled={regenerando} style={{ fontSize: 12, marginLeft: "auto", padding: "0 8px", height: 28 }}>
                    <Icon name="refreshCw" size={13} />{regenerando ? "Gerando…" : "Regenerar"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Prazos propostos pela IA */}
          {prazosProp.length > 0 && (
            <RailCard icon="sparkles" title="Prazos propostos pela IA">
              <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 10 }}>
                {prazosProp.length} prazo{prazosProp.length === 1 ? "" : "s"} aguardando confirmação.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {prazosProp.slice(0, 3).map((p) => (
                  <div key={p.id} style={{ fontSize: 12.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 7 }}>
                    <Icon name="flag" size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.descricao}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setTab("prazos")} style={{ fontSize: 12, marginTop: 12 }}>
                <Icon name="flag" size={13} />Revisar na aba Prazos
              </button>
            </RailCard>
          )}

          {/* Próximas atividades */}
          <RailCard icon="flag" title="Próximas atividades">
            {prazoProx ? (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Próximo prazo</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", marginTop: 3 }}>{prazoProx.descricao}</div>
                  <div style={{ fontSize: 12, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>fatal {crmDate(prazoProx.dataFatal)}</div>
                </div>
                <ProcSemaforo urgencia={prazoProx.urgencia} />
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-subtle)" }}>Nenhum prazo em aberto.</div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onLancarPrazo} style={{ fontSize: 12, marginTop: 12, padding: "0 8px", height: 28 }}>
              <Icon name="plus" size={13} />Lançar prazo
            </button>
          </RailCard>

          {/* Financeiro mini */}
          {fin && (
            <RailCard icon="wallet" title="Financeiro" action={<button className="btn btn-ghost btn-sm" onClick={() => setTab("fin")} style={{ fontSize: 11, padding: "0 6px", height: 24 }}>ver tudo</button>}>
              <div style={{ display: "flex", gap: 18 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-subtle)", marginBottom: 4 }}>Recebido</div>
                  <FxMoney cents={fin.recebidoCents} dir="in" size={17} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-subtle)", marginBottom: 4 }}>Em aberto</div>
                  <span style={{ fontSize: 17, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>{crmMoney(fin.abertoCents)}</span>
                </div>
              </div>
            </RailCard>
          )}

          {/* Documentos */}
          <RailCard icon="fileText" title="Documentos" action={detail.documentos.length > 0 ? <button className="btn btn-ghost btn-sm" onClick={() => setTab("docs")} style={{ fontSize: 11, padding: "0 6px", height: 24 }}>ver tudo</button> : undefined}>
            {detail.documentos.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--text-subtle)" }}>Nenhum documento vinculado.</div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 10 }}>{detail.documentos.length} arquivo{detail.documentos.length === 1 ? "" : "s"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {detail.documentos.slice(0, 3).map((d) => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <Icon name="fileText" size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.nome}</span>
                      <span style={{ fontSize: 11, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>{crmDate(d.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </RailCard>

          {/* Últimos históricos */}
          <RailCard icon="history" title="Últimos históricos" action={detail.andamentos.length > 0 ? <button className="btn btn-ghost btn-sm" onClick={() => setTab("timeline")} style={{ fontSize: 11, padding: "0 6px", height: 24 }}>ver tudo</button> : undefined}>
            {detail.andamentos.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--text-subtle)" }}>Sem movimentações.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {detail.andamentos.slice(0, 5).map((a) => (
                  <div key={a.id} style={{ display: "flex", gap: 10 }}>
                    <Icon name="circleDot" size={8} style={{ color: a.relevante ? "var(--accent)" : "var(--text-subtle)", marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.descricao || a.tipo || "Andamento"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{crmDate(a.data)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </RailCard>
        </div>
      </div>
    )
  }

  const SECTIONS: Record<string, { title: string; icon: CrmIconName; sub?: string; body: () => ReactNode }> = {
    resumo: { title: "Resumo", icon: "layoutGrid", body: Resumo },
    timeline: { title: "Linha do tempo", icon: "history", sub: `${detail.andamentos.length} movimentações`, body: Timeline },
    prazos: { title: "Prazos", icon: "flag", sub: `${prazosPend.length} em aberto`, body: Prazos },
    publicacoes: { title: "Publicações", icon: "scroll", sub: `${detail.publicacoes.length}`, body: Publicacoes },
    docs: { title: "Documentos", icon: "fileText", sub: `${detail.documentos.length} arquivos`, body: Docs },
    fin: { title: "Financeiro do caso", icon: "wallet", body: Financeiro },
    partes: { title: "Partes & contatos", icon: "users", body: Partes },
    notas: { title: "Anotações / estratégia", icon: "feather", body: Notas },
  }

  const activeBody = SECTIONS[tabs.some((t) => t.id === tab) ? tab : "resumo"].body

  return (
    <div>
      {/* cabeçalho de identificação */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 40px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ padding: "0 8px" }}><Icon name="chevronLeft" size={15} />Processos</button>
            <ProcCNJ numero={detail.numeroCnj} size={15} copy />
            <ProcStatus status={detail.status} />
            {detail.faseAtual && <ProcFaseTag fase={detail.faseAtual} />}
            {detail.segredoJustica && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-subtle)" }}><Icon name="eye" size={13} />Segredo de justiça</span>}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {onEditar && <button className="btn btn-ghost btn-sm" onClick={onEditar} style={{ fontSize: 12 }}><Icon name="edit" size={13} />Editar</button>}
              {onExcluir && <button className="btn btn-ghost btn-sm" onClick={onExcluir} title="Excluir processo" style={{ fontSize: 12, color: "var(--crit)" }}><Icon name="trash2" size={13} />Excluir</button>}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}>{tituloPartes}</h1>
              {subtitulo && <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 3 }}>{subtitulo}</div>}
              {nosso && (
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9, fontSize: 13, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 7px", borderRadius: 5, fontWeight: 500, textTransform: "capitalize" }}>{nosso.papel}</span>
                  <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>nosso cliente: {nosso.nome}</span>
                </div>
              )}
            </div>
            {prazoProx && (
              <div className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, background: "var(--bg-soft)" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Próximo prazo</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginTop: 2 }}>{prazoProx.descricao}</div>
                  <div style={{ fontSize: 12, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>fatal {crmDate(prazoProx.dataFatal)}</div>
                </div>
                <ProcSemaforo urgencia={prazoProx.urgencia} big />
              </div>
            )}
          </div>

          {/* meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "12px 18px", padding: "16px 0" }}>
            <Field label="Tribunal" value={detail.tribunal ?? "—"} />
            <Field label="Comarca / foro" value={detail.comarca ?? "—"} />
            <Field label="Vara / órgão" value={detail.vara ?? "—"} />
            <Field label="Instância" value={detail.instancia ?? "—"} />
            <Field label="Valor da causa" value={crmMoney(detail.valorCausaCents)} mono />
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500 }}>Responsável</div>
              <ProcResp nome={detail.responsavel} />
            </div>
            <Field label="Distribuição" value={detail.dataDistribuicao ? crmDate(detail.dataDistribuicao) : "—"} mono />
            <Field label="Sistema" value={sistemaLabel(detail.sistema)} />
            <Field label="Caso" value={detail.caso ?? "—"} />
            {detail.cliente ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500 }}>Cliente</div>
                <button
                  onClick={() => openCliente(detail.cliente!.id)}
                  title="Abrir cadastro"
                  style={{ background: "transparent", border: "none", padding: 0, textAlign: "left", cursor: "pointer", fontSize: 13.5, fontWeight: 500, color: "var(--accent)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {detail.cliente.nome}
                </button>
              </div>
            ) : (
              <Field label="Cliente" value="—" />
            )}
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="btn btn-secondary btn-sm" onClick={onLancarPrazo} style={{ fontSize: 12 }}><Icon name="flag" size={13} />Lançar prazo</button>
            </div>
          </div>

          {/* abas + alternador de layout */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: layout === "abas" ? 0 : 14 }}>
            {layout === "abas" ? (
              <div style={{ display: "flex", gap: 2, overflowX: "auto", flex: 1, scrollbarWidth: "none" }}>
                {tabs.map((t) => {
                  const on = tab === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 7, padding: "0 13px", height: 40, cursor: "pointer", border: "none",
                        background: "transparent", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 500,
                        color: on ? "var(--text)" : "var(--text-muted)", letterSpacing: "-0.01em",
                        borderBottom: on ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1, whiteSpace: "nowrap", flexShrink: 0,
                      }}
                    >
                      <Icon name={t.icon} size={14} />{t.label}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-subtle)" }}>Todas as seções, em rolagem contínua.</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingBottom: layout === "abas" ? 7 : 0 }}>
              <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>Layout</span>
              <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunken)", borderRadius: 8, padding: 3 }}>
                {(["abas", "secoes"] as const).map((v) => (
                  <button key={v} onClick={() => setLayout(v)} style={{ height: 28, padding: "0 12px", borderRadius: 6, border: "none", cursor: "pointer", background: layout === v ? "var(--surface)" : "transparent", color: layout === v ? "var(--text)" : "var(--text-muted)", fontSize: 12, fontWeight: 500, fontFamily: "var(--font-sans)", boxShadow: layout === v ? "var(--shadow-sm)" : "none" }}>
                    {v === "abas" ? "Abas" : "Seções"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* conteúdo */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 40px 56px" }}>
        {layout === "abas" ? (
          activeBody()
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
            {tabs.map((t) => {
              const S = SECTIONS[t.id]
              return (
                <section key={t.id}>
                  <ProcSecTitle icon={S.icon} title={S.title} sub={S.sub} />
                  {S.body()}
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
