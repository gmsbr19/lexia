"use client"

// Contencioso · Captura — monitoramento automático via fontes públicas do CNJ:
//  • Comunica/DJEN → intimações por OAB (entram como Publicação a triar)
//  • DataJud      → andamentos por número CNJ (metadados; NÃO conta prazo)
// Mostra status da última rodada por fonte, ALERTA de falha de captura, as OABs
// monitoradas (add/ativar/remover) e o histórico de execuções. "Rodar agora" e
// "Pré-visualizar (dry-run)" disparam a captura manual. Tudo é apoio à decisão —
// o prazo só nasce na triagem humana.
import { useState } from "react"
import { ApiError } from "@/lib/client/api"
import { CrmEmpty, FxFrame, FxInput, FxLabel, FxModal, useCrmToast } from "@/components/crm/crm-kit"
import { crmDate } from "@/components/crm/crm-fmt"
import { Icon } from "@/components/crm/crm-icons"
import {
  createOab,
  deleteOab,
  runCaptura,
  updateOab,
  type CapturaFonteStatusC,
  type CapturaStatusResponse,
  type ExecucaoCapturaRowC,
  type OabRowC,
} from "../proc-api"
import { ProcSecTitle, ProcStat } from "../proc-kit"

function dataHora(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return `${crmDate(iso)} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
}

const STATUS_LABEL: Record<string, string> = { ok: "ok", erro: "erro", "dry-run": "simulação", parcial: "parcial" }
function statusCor(status: string): { fg: string; soft: string } {
  if (status === "erro") return { fg: "var(--crit)", soft: "var(--crit-soft)" }
  if (status === "dry-run") return { fg: "var(--text-muted)", soft: "var(--bg-sunken)" }
  return { fg: "var(--ok)", soft: "var(--ok-soft)" }
}

function StatusPill({ status }: { status: string }) {
  const c = statusCor(status)
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 20, padding: "0 8px", borderRadius: 6,
        background: c.soft, color: c.fg, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function FonteCard({ titulo, sub, fonte }: { titulo: string; sub: string; fonte: CapturaFonteStatusC }) {
  const u = fonte.ultima
  const erro = u?.status === "erro" || fonte.falhasRecentes.length > 0
  return (
    <ProcStat
      label={titulo}
      value={u ? dataHora(u.iniciadoEm) : "nunca"}
      icon={erro ? "alertTriangle" : "checkCircle"}
      tone={erro ? "neg" : u ? "pos" : null}
      sub={u ? `${u.criados} novo(s) · ${STATUS_LABEL[u.status] ?? u.status} · ${sub}` : sub}
    />
  )
}

export function ProcCaptura({
  status,
  loading,
  reload,
}: {
  status: CapturaStatusResponse | null
  loading: boolean
  reload: () => void
}) {
  const { toast } = useCrmToast()
  const [busy, setBusy] = useState<"run" | "dry" | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const oabs = status?.oabs ?? []
  const falhas = [...(status?.comunica.falhasRecentes ?? []), ...(status?.datajud.falhasRecentes ?? [])]
  const ultimaComErro = status?.comunica.ultima?.status === "erro" || status?.datajud.ultima?.status === "erro"

  const run = async (dryRun: boolean) => {
    setBusy(dryRun ? "dry" : "run")
    try {
      const r = await runCaptura({ fonte: "ambas", dryRun })
      const int = r.intimacoes
      const msg = int
        ? `${dryRun ? "Simulação: " : ""}${int.criados} intimação(ões) nova(s), ${int.falhas} falha(s)`
        : "Rodada concluída"
      toast(msg, { icon: dryRun ? "search" : "checkCircle" })
      reload()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao rodar a captura", { icon: "alertTriangle" })
    } finally {
      setBusy(null)
    }
  }

  const toggleOab = async (o: OabRowC) => {
    try {
      await updateOab(o.id, { ativo: !o.ativo })
      reload()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao atualizar a OAB", { icon: "alertTriangle" })
    }
  }
  const removeOab = async (o: OabRowC) => {
    try {
      await deleteOab(o.id)
      toast("OAB removida")
      reload()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao remover a OAB", { icon: "alertTriangle" })
    }
  }

  return (
    <FxFrame pad="24px 40px 56px">
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Contencioso</span>
          <h1 style={{ margin: "6px 0 0", fontSize: 25, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--text)" }}>Captura automática</h1>
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 5 }}>Fontes públicas e gratuitas do CNJ · Comunica/DJEN (intimações) + DataJud (andamentos)</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => run(true)} disabled={busy !== null}>
            <Icon name="search" size={15} />{busy === "dry" ? "Simulando…" : "Pré-visualizar"}
          </button>
          <button className="btn btn-primary" onClick={() => run(false)} disabled={busy !== null}>
            <Icon name="refreshCw" size={15} />{busy === "run" ? "Capturando…" : "Rodar agora"}
          </button>
        </div>
      </div>

      {/* aviso: apoio à decisão */}
      <div className="card" style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "12px 16px", marginBottom: 16, background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
        <Icon name="alertCircle" size={16} style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
          A captura é <strong style={{ color: "var(--text)" }}>apoio à decisão</strong>, não substitui a conferência do advogado. Intimações entram como
          publicações <strong style={{ color: "var(--text)" }}>a triar</strong> — o prazo só é gerado quando você confirma a peça e a quantidade de dias.
          Os prazos calculados <strong style={{ color: "var(--text)" }}>devem sempre ser conferidos</strong>.
        </div>
      </div>

      {/* alerta de falha de captura */}
      {(ultimaComErro || falhas.length > 0) && (
        <div className="card" style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "12px 16px", marginBottom: 16, background: "var(--crit-soft)", borderColor: "var(--crit)" }}>
          <Icon name="alertTriangle" size={16} style={{ color: "var(--crit)", marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.5 }}>
            <strong>Falha na última captura.</strong>{" "}
            <span style={{ color: "var(--text-muted)" }}>
              {falhas.slice(0, 3).map((f) => `${f.fonte} (${f.escopo})`).join(", ")}
              {falhas.length > 3 ? ` e mais ${falhas.length - 3}` : ""}. Verifique a conexão e, para andamentos, a DATAJUD_API_KEY; depois rode novamente.
            </span>
          </div>
        </div>
      )}

      {/* status por fonte */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {status ? (
          <>
            <FonteCard titulo="Comunica / DJEN (intimações)" sub="por OAB" fonte={status.comunica} />
            <FonteCard titulo="DataJud (andamentos)" sub="requer DATAJUD_API_KEY" fonte={status.datajud} />
          </>
        ) : (
          <div style={{ gridColumn: "1 / -1", fontSize: 13, color: "var(--text-subtle)", padding: 8 }}>{loading ? "Carregando status…" : "—"}</div>
        )}
      </div>

      {/* OABs monitoradas */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <ProcSecTitle
            icon="bell"
            title="OABs monitoradas"
            sub={oabs.length ? `${oabs.filter((o) => o.ativo).length} ativa(s)` : undefined}
            right={<button className="btn btn-secondary btn-sm" onClick={() => setAddOpen(true)} style={{ fontSize: 12 }}><Icon name="plus" size={13} />Adicionar OAB</button>}
          />
        </div>
        {oabs.length === 0 ? (
          <CrmEmpty icon="bell" title="Nenhuma OAB monitorada" sub="Cadastre as OABs do escritório para capturar as intimações do Comunica/DJEN." />
        ) : (
          oabs.map((o, i) => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderTop: i ? "1px solid var(--border)" : "none", opacity: o.ativo ? 1 : 0.55 }}>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", fontVariantNumeric: "tabular-nums", minWidth: 110 }}>{o.numero}/{o.uf}</span>
              <span style={{ flex: 1, fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.advogadoNome ?? "—"}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => toggleOab(o)} style={{ fontSize: 12 }}>{o.ativo ? "Pausar" : "Ativar"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => removeOab(o)} title="Remover" style={{ color: "var(--crit)" }}><Icon name="trash2" size={14} /></button>
            </div>
          ))
        )}
      </div>

      {/* histórico de execuções */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <ProcSecTitle icon="refreshCw" title="Execuções recentes" />
        </div>
        {!status || status.execucoes.length === 0 ? (
          <CrmEmpty icon="refreshCw" title="Sem execuções" sub="Nenhuma rodada de captura registrada ainda." />
        ) : (
          status.execucoes.slice(0, 20).map((e: ExecucaoCapturaRowC, i) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderTop: i ? "1px solid var(--border)" : "none", fontSize: 12.5 }}>
              <span style={{ minWidth: 72, color: "var(--text-muted)", fontWeight: 500 }}>{e.fonte}</span>
              <span style={{ minWidth: 92, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{e.escopo}</span>
              <span style={{ flex: 1, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.erro ? e.erro : `${e.encontrados} encontrado(s) · ${e.criados} novo(s) · ${e.ignorados} repetido(s)`}
              </span>
              <span style={{ color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{dataHora(e.iniciadoEm)}</span>
              <StatusPill status={e.status} />
            </div>
          ))
        )}
      </div>

      {addOpen && <OabModal onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); reload() }} />}
    </FxFrame>
  )
}

// ── modal: adicionar OAB ──────────────────────────────────────────────────────
function OabModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useCrmToast()
  const [numero, setNumero] = useState("")
  const [uf, setUf] = useState("SP")
  const [nome, setNome] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const podeSalvar = /\d/.test(numero) && uf.trim().length === 2

  const save = async () => {
    if (!podeSalvar) return
    setSaving(true)
    setError("")
    try {
      await createOab({ numero: numero.replace(/\D/g, ""), uf: uf.toUpperCase().slice(0, 2), advogadoNome: nome.trim() || undefined })
      toast("OAB adicionada ao monitoramento", { icon: "bell" })
      onSaved()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao adicionar a OAB")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FxModal
      title="Adicionar OAB"
      sub="O Comunica/DJEN é consultado por número + UF da OAB."
      onClose={onClose}
      width={460}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !podeSalvar}>
            <Icon name="plus" size={14} />{saving ? "Salvando…" : "Adicionar"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12 }}>
          <div><FxLabel hint="só números">Número da OAB</FxLabel><FxInput value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123456" inputMode="numeric" /></div>
          <div><FxLabel>UF</FxLabel><FxInput value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} /></div>
        </div>
        <div><FxLabel hint="opcional">Advogado(a)</FxLabel><FxInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do(a) advogado(a)" /></div>
        {error && <div style={{ fontSize: 12, color: "var(--crit)" }}>{error}</div>}
      </div>
    </FxModal>
  )
}
