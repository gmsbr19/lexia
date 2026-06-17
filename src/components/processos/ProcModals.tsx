"use client"

// Processos (Contencioso) — modals: lançar prazo (server-computed preview via the
// real CPC engine), triagem de publicação (relevante→gera prazo / descartar), and
// novo processo. Ported from proc-modals.jsx but wired to the live routes.
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { ApiError } from "@/lib/client/api"
import { FxInput, FxLabel, FxModal, FxSegmented, FxSelect, FxTextarea, CrmBadge, useCrmToast } from "@/components/crm/crm-kit"
import { Icon } from "@/components/crm/crm-icons"
import { crmDate } from "@/components/crm/crm-fmt"
import { limparTextoPublicacao } from "@/lib/processos/texto"
import type { TriagemSugestao } from "@/lib/processos/triagem-ai"
import type { IdNome } from "@/lib/finance/types"
import type { AndamentoRow, PrazoRow, ProcessoRow, PublicacaoRow } from "@/lib/processos/types"
import type { UsuarioOption } from "@/lib/processos/dataset"
import { ProcFonte, ProcMovIcon, ProcSemaforo, urgenciaCalc } from "./proc-kit"
import {
  confirmarPrazo,
  createCaso,
  createPrazo,
  createProcesso,
  createPublicacao,
  gerarPrazoAndamento,
  getMovimentosNovos,
  previewPrazo,
  revisarAndamento,
  revisarProcessoMovimentos,
  sugestaoTriagem,
  sugestaoVinculo,
  triarPublicacao,
  updateProcesso,
  vincularPublicacao,
  type PrazoPreviewResult,
  type SugestaoVinculoC,
} from "./proc-api"

export const PROC_PECAS = [
  "Contestação", "Réplica", "Manifestação", "Manifestação sobre embargos", "Manifestação sobre informações",
  "Especificação de provas", "Recurso de apelação", "Agravo de instrumento", "Embargos de declaração",
  "Razões finais / Memoriais", "Contrarrazões", "Cumprimento de sentença", "Petição", "Últimas declarações",
]

const userOptions = (us: UsuarioOption[]) => [{ value: "", label: "—" }, ...us.map((u) => ({ value: String(u.id), label: u.nome }))]

// Shared preview card (interno × fatal + semáforo) used by both prazo flows.
function PreviewCard({ result, hoje }: { result: PrazoPreviewResult | null; hoje: string }) {
  const urg = result ? urgenciaCalc(result.dataFatal, result.dataInterna, hoje) : null
  return (
    <div className="card" style={{ background: "var(--bg-soft)", padding: 14, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Prazo interno</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{result ? crmDate(result.dataInterna) : "—"}</div>
        <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>margem de segurança</div>
      </div>
      <Icon name="arrowRight" size={16} style={{ color: "var(--text-subtle)" }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "var(--crit)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Prazo fatal</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{result ? crmDate(result.dataFatal) : "—"}</div>
        <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>limite legal · dias úteis</div>
      </div>
      {urg && <ProcSemaforo urgencia={urg} big />}
    </div>
  )
}

// ── Lançar prazo (manual) ────────────────────────────────────────────────────────
export function ProcPrazoModal({
  processos, responsaveis, hoje, preset, confirmarPrazoRow, onClose, onSaved,
}: {
  processos: ProcessoRow[]
  responsaveis: UsuarioOption[]
  hoje: string
  preset?: { processoId?: number; descricao?: string; quantidadeDias?: number; responsavelUserId?: number | null }
  /** Quando presente, o modal CONFIRMA um prazo proposto pela IA (editável) em vez de criar. */
  confirmarPrazoRow?: PrazoRow
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useCrmToast()
  const cp = confirmarPrazoRow
  const [processoId, setProcessoId] = useState<number | "">(cp?.processoId ?? preset?.processoId ?? processos[0]?.id ?? "")
  const [descricao, setDescricao] = useState(cp?.descricao ?? preset?.descricao ?? "Manifestação")
  const [dias, setDias] = useState(String(cp?.quantidadeDias ?? preset?.quantidadeDias ?? 15))
  const [margem, setMargem] = useState(String(cp?.diasMargem ?? 3))
  const [base, setBase] = useState(cp ? (cp.dataPublicacao ?? cp.dataInicio) : hoje)
  const [baseMode, setBaseMode] = useState<"publicacao" | "inicio">(cp ? (cp.dataPublicacao ? "publicacao" : "inicio") : "publicacao")
  const [respId, setRespId] = useState(
    cp?.responsavelUserId ? String(cp.responsavelUserId) : preset?.responsavelUserId ? String(preset.responsavelUserId) : "",
  )
  const [preview, setPreview] = useState<PrazoPreviewResult | null>(null)
  const [previewErr, setPreviewErr] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const qd = Number(dias)
  const pecasOptions = PROC_PECAS.includes(descricao) ? PROC_PECAS : [descricao, ...PROC_PECAS]

  useEffect(() => {
    if (!processoId || !Number.isInteger(qd) || qd <= 0 || !base) {
      setPreview(null)
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const body = {
          quantidadeDias: qd,
          diasMargem: Number(margem) || 0,
          [baseMode === "publicacao" ? "dataPublicacao" : "dataInicio"]: base,
        }
        const r = await previewPrazo(processoId as number, body)
        if (!cancelled) { setPreview(r); setPreviewErr("") }
      } catch (e) {
        if (!cancelled) { setPreview(null); setPreviewErr(e instanceof ApiError ? e.message : "Não foi possível calcular o prazo") }
      }
    }, 280)
    return () => { cancelled = true; clearTimeout(t) }
  }, [processoId, qd, margem, base, baseMode])

  const save = async () => {
    if (!processoId || !descricao.trim() || !Number.isInteger(qd) || qd <= 0) return
    setSaving(true)
    setError("")
    try {
      if (cp) {
        // confirma o prazo proposto pela IA (com as edições) → vira pendente + agenda
        await confirmarPrazo(cp.id, {
          descricao: descricao.trim(),
          tipo: descricao.split(" ")[0],
          quantidadeDias: qd,
          diasMargem: Number(margem) || 0,
          responsavelUserId: respId ? Number(respId) : null,
          [baseMode === "publicacao" ? "dataPublicacao" : "dataInicio"]: base,
        })
        toast("Prazo confirmado e lançado na agenda", { icon: "flag" })
      } else {
        await createPrazo(processoId as number, {
          descricao: descricao.trim(),
          tipo: descricao.split(" ")[0],
          quantidadeDias: qd,
          diasMargem: Number(margem) || 0,
          responsavelUserId: respId ? Number(respId) : undefined,
          [baseMode === "publicacao" ? "dataPublicacao" : "dataInicio"]: base,
        })
        toast("Prazo lançado na agenda", { icon: "flag" })
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar o prazo")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FxModal
      title={cp ? "Confirmar prazo proposto" : "Lançar novo prazo"}
      sub={cp ? "Revise a peça e o prazo sugeridos pela IA; ao confirmar, vira definitivo e entra na agenda." : "Contagem em dias úteis (CPC/2015), descontando feriados forenses e suspensões."}
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !processoId || !descricao.trim() || qd <= 0}>
            <Icon name="flag" size={14} />{saving ? "Salvando…" : cp ? "Confirmar prazo" : "Lançar prazo"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FxLabel>Processo</FxLabel>
          <FxSelect
            options={processos.map((p) => ({ value: String(p.id), label: `${p.numeroCnj ?? "sem número"} · ${p.caso ?? p.classe ?? ""}` }))}
            value={String(processoId)}
            onChange={(e) => setProcessoId(e.target.value ? Number(e.target.value) : "")}
            placeholder="Selecione o processo"
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
          <div><FxLabel>Peça / providência</FxLabel><FxSelect options={pecasOptions} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          <div><FxLabel>Responsável</FxLabel><FxSelect options={userOptions(responsaveis)} value={respId} onChange={(e) => setRespId(e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div><FxLabel hint="data-base">Data</FxLabel><FxInput type="date" value={base} onChange={(e) => setBase(e.target.value)} /></div>
          <div><FxLabel hint="dias úteis">Prazo legal</FxLabel><FxInput type="number" min={1} value={dias} onChange={(e) => setDias(e.target.value)} /></div>
          <div><FxLabel hint="du antes do fatal">Margem</FxLabel><FxInput type="number" min={0} value={margem} onChange={(e) => setMargem(e.target.value)} /></div>
        </div>
        <div>
          <FxLabel hint="da publicação conta-se +1 dia útil (art. 224)">Contar a partir de</FxLabel>
          <FxSegmented
            options={[{ value: "publicacao", label: "Publicação / intimação" }, { value: "inicio", label: "Início imediato" }]}
            value={baseMode}
            onChange={(v) => setBaseMode(v as "publicacao" | "inicio")}
          />
        </div>

        <PreviewCard result={preview} hoje={hoje} />
        {previewErr && <div style={{ fontSize: 12, color: "var(--crit)" }}>{previewErr}</div>}
        {error && <div style={{ fontSize: 12, color: "var(--crit)" }}>{error}</div>}
      </div>
    </FxModal>
  )
}

// ── Triagem de publicação ─────────────────────────────────────────────────────────
export function ProcTriagemModal({
  pub, responsaveis, hoje, onClose, onDone,
}: {
  pub: PublicacaoRow
  responsaveis: UsuarioOption[]
  hoje: string
  onClose: () => void
  onDone: () => void
}) {
  const { toast } = useCrmToast()
  const [descricao, setDescricao] = useState("Manifestação")
  const [dias, setDias] = useState("15")
  const [margem, setMargem] = useState("3")
  const [respId, setRespId] = useState("")
  const [preview, setPreview] = useState<PrazoPreviewResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const qd = Number(dias)
  const baseDate = pub.dataPublicacao ?? pub.dataDisponibilizacao
  const baseField = pub.dataPublicacao ? "dataPublicacao" : "dataDisponibilizacao"
  const podeGerar = !!pub.processoId && !!baseDate
  const pecasOptions = PROC_PECAS.includes(descricao) ? PROC_PECAS : [descricao, ...PROC_PECAS]

  useEffect(() => {
    if (!podeGerar || !Number.isInteger(qd) || qd <= 0) { setPreview(null); return }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const r = await previewPrazo(pub.processoId as number, {
          quantidadeDias: qd, diasMargem: Number(margem) || 0, [baseField]: baseDate as string,
        })
        if (!cancelled) setPreview(r)
      } catch {
        if (!cancelled) setPreview(null)
      }
    }, 280)
    return () => { cancelled = true; clearTimeout(t) }
  }, [qd, margem])

  const run = async (acao: "relevante" | "descartar") => {
    setBusy(true)
    setError("")
    try {
      await triarPublicacao(pub.id, {
        acao,
        ...(acao === "relevante"
          ? { prazo: { descricao: descricao.trim(), tipo: descricao.split(" ")[0], quantidadeDias: qd, diasMargem: Number(margem) || 0, responsavelUserId: respId ? Number(respId) : undefined } }
          : {}),
      })
      toast(acao === "relevante" ? "Prazo gerado a partir da publicação" : "Publicação descartada", { icon: acao === "relevante" ? "flag" : "checkCircle" })
      onDone()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao triar a publicação")
    } finally {
      setBusy(false)
    }
  }

  return (
    <FxModal
      title="Triagem de publicação"
      sub={pub.numeroCnj ? `${pub.numeroCnj}` : "Publicação ainda não vinculada a um processo"}
      onClose={onClose}
      width={580}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => run("descartar")} disabled={busy}><Icon name="circleDot" size={14} />Descartar (cartorário)</button>
          <button className="btn btn-primary" onClick={() => run("relevante")} disabled={busy || !podeGerar || !descricao.trim() || qd <= 0}><Icon name="flag" size={14} />Gerar prazo</button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <ProcFonte fonte={pub.diario ? "dje" : null} />
          <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{pub.diario ?? "Publicação"} · {crmDate(pub.dataPublicacao ?? pub.dataDisponibilizacao)}</span>
        </div>
        <div className="card" style={{ background: "var(--bg-soft)", padding: "12px 14px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, maxHeight: 160, overflowY: "auto" }}>{limparTextoPublicacao(pub.conteudo)}</div>

        {!pub.processoId && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--warn)", background: "var(--warn-soft)", padding: "9px 12px", borderRadius: 8 }}>
            <Icon name="alertCircle" size={15} />Vincule a publicação a um processo (na ficha) para gerar o prazo. Você ainda pode descartá-la.
          </div>
        )}

        {podeGerar && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
              <div><FxLabel>Peça / providência</FxLabel><FxSelect options={pecasOptions} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
              <div><FxLabel>Responsável</FxLabel><FxSelect options={userOptions(responsaveis)} value={respId} onChange={(e) => setRespId(e.target.value)} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><FxLabel hint="dias úteis">Prazo legal</FxLabel><FxInput type="number" min={1} value={dias} onChange={(e) => setDias(e.target.value)} /></div>
              <div><FxLabel hint="du antes do fatal">Margem interna</FxLabel><FxInput type="number" min={0} value={margem} onChange={(e) => setMargem(e.target.value)} /></div>
            </div>
            <PreviewCard result={preview} hoje={hoje} />
          </>
        )}
        {error && <div style={{ fontSize: 12, color: "var(--crit)" }}>{error}</div>}
      </div>
    </FxModal>
  )
}

// ── Revisão de movimentos (andamentos capturados) por processo ─────────────────
// Sub-form inline para gerar um prazo a partir de um movimento (data-base = data do
// movimento → +1 dia útil), pré-preenchido pela sugestão da IA.
function MovPrazoForm({
  processoId, andamento, sugestao, responsaveis, hoje, onCancel, onDone,
}: {
  processoId: number
  andamento: AndamentoRow
  sugestao: TriagemSugestao | null
  responsaveis: UsuarioOption[]
  hoje: string
  onCancel: () => void
  onDone: () => void
}) {
  const { toast } = useCrmToast()
  const sug = sugestao?.prazoSugerido ?? null
  const [descricao, setDescricao] = useState(sug?.descricao ?? "Manifestação")
  const [dias, setDias] = useState(String(sug?.quantidadeDias ?? 15))
  const [margem, setMargem] = useState("3")
  const [respId, setRespId] = useState("")
  const [preview, setPreview] = useState<PrazoPreviewResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const qd = Number(dias)
  const pecasOptions = PROC_PECAS.includes(descricao) ? PROC_PECAS : [descricao, ...PROC_PECAS]

  useEffect(() => {
    if (!Number.isInteger(qd) || qd <= 0) { setPreview(null); return }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const r = await previewPrazo(processoId, { quantidadeDias: qd, diasMargem: Number(margem) || 0, dataPublicacao: andamento.data })
        if (!cancelled) setPreview(r)
      } catch {
        if (!cancelled) setPreview(null)
      }
    }, 280)
    return () => { cancelled = true; clearTimeout(t) }
  }, [qd, margem])

  const gerar = async () => {
    if (!descricao.trim() || qd <= 0) return
    setBusy(true)
    setError("")
    try {
      await gerarPrazoAndamento(andamento.id, {
        descricao: descricao.trim(),
        tipo: descricao.split(" ")[0],
        quantidadeDias: qd,
        diasMargem: Number(margem) || 0,
        responsavelUserId: respId ? Number(respId) : undefined,
        usarDataDoAndamento: true,
        criarEvento: true,
      })
      onDone()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao gerar o prazo")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
      <div style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>
        Data-base = data do movimento ({crmDate(andamento.data)}) → conta +1 dia útil (art. 224 CPC). Confira sempre.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
        <div><FxLabel>Peça / providência</FxLabel><FxSelect options={pecasOptions} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
        <div><FxLabel>Responsável</FxLabel><FxSelect options={userOptions(responsaveis)} value={respId} onChange={(e) => setRespId(e.target.value)} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><FxLabel hint="dias úteis">Prazo legal</FxLabel><FxInput type="number" min={1} value={dias} onChange={(e) => setDias(e.target.value)} /></div>
        <div><FxLabel hint="du antes do fatal">Margem interna</FxLabel><FxInput type="number" min={0} value={margem} onChange={(e) => setMargem(e.target.value)} /></div>
      </div>
      <PreviewCard result={preview} hoje={hoje} />
      {error && <div style={{ fontSize: 12, color: "var(--crit)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className="btn btn-primary btn-sm" onClick={gerar} disabled={busy || !descricao.trim() || qd <= 0}>
          <Icon name="flag" size={13} />{busy ? "Gerando…" : "Gerar prazo"}
        </button>
      </div>
    </div>
  )
}

export function ProcMovimentoReviewModal({
  processoId, titulo, responsaveis, hoje, onClose, onDone,
}: {
  processoId: number
  titulo: string
  responsaveis: UsuarioOption[]
  hoje: string
  onClose: () => void
  onDone: () => void
}) {
  const { toast } = useCrmToast()
  const [movs, setMovs] = useState<AndamentoRow[] | null>(null)
  const [expandido, setExpandido] = useState<number | null>(null)
  const [sug, setSug] = useState<Record<number, TriagemSugestao | "loading">>({})
  const [prazoFor, setPrazoFor] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    getMovimentosNovos(processoId).then(setMovs).catch(() => setMovs([]))
  }, [processoId])
  useEffect(() => load(), [load])

  const remover = (id: number) => setMovs((m) => (m ? m.filter((x) => x.id !== id) : m))

  const expandir = async (a: AndamentoRow) => {
    const next = expandido === a.id ? null : a.id
    setExpandido(next)
    setPrazoFor(null)
    if (next != null && !sug[a.id]) {
      setSug((s) => ({ ...s, [a.id]: "loading" }))
      try {
        const r = await sugestaoTriagem(a.id)
        setSug((s) => ({ ...s, [a.id]: r }))
      } catch {
        setSug((s) => {
          const c = { ...s }
          delete c[a.id]
          return c
        })
      }
    }
  }

  const semPrazo = async (id: number) => {
    try {
      await revisarAndamento(id)
      remover(id)
      onDone()
    } catch {
      toast("Não foi possível marcar como revisado", { tone: "neg" })
    }
  }

  const marcarTodos = async () => {
    setBusy(true)
    try {
      await revisarProcessoMovimentos(processoId)
      toast("Movimentos marcados como revisados", { icon: "checkCircle" })
      onDone()
      onClose()
    } catch {
      toast("Erro ao marcar os movimentos", { tone: "neg" })
    } finally {
      setBusy(false)
    }
  }

  const prazoGerado = (id: number) => {
    remover(id)
    onDone()
    toast("Movimento revisado — prazo na agenda", { icon: "flag" })
  }

  return (
    <FxModal
      title="Revisar movimentos"
      sub={titulo}
      onClose={onClose}
      width={680}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
          <button className="btn btn-secondary" onClick={marcarTodos} disabled={busy || !movs?.length}>
            <Icon name="checkCircle" size={14} />Marcar todos revisados
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-muted)", background: "var(--accent-soft)", borderRadius: 8, padding: "9px 12px" }}>
          <Icon name="sparkles" size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
          Abra um movimento para a LexIA classificar a relevância e sugerir o prazo. Apoio à decisão — o prazo exige conferência.
        </div>
        {movs == null ? (
          <div style={{ fontSize: 13, color: "var(--text-subtle)", padding: 8 }}>Carregando movimentos…</div>
        ) : movs.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-subtle)", padding: 8 }}>Nenhum movimento a revisar neste processo.</div>
        ) : (
          movs.map((a) => {
            const aberto = expandido === a.id
            const s = sug[a.id]
            return (
              <div key={a.id} className="card" style={{ overflow: "hidden", borderColor: a.relevante ? "var(--border-gold)" : "var(--border)" }}>
                <button onClick={() => expandir(a)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "12px 14px", display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}><ProcMovIcon tipo={a.tipo ?? "andamento"} active={a.relevante} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{a.tipo ?? "Movimento"}</span>
                      {a.relevante && <CrmBadge tone="gold" dot>relevante</CrmBadge>}
                      {a.prazoId && <CrmBadge tone="pos" dot>com prazo</CrmBadge>}
                      <span style={{ fontSize: 12, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>{crmDate(a.data)}</span>
                    </span>
                    <span style={{ display: "block", fontSize: 12.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5, ...(aberto ? {} : { WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }) }}>{limparTextoPublicacao(a.descricao)}</span>
                  </span>
                  <Icon name={aberto ? "chevronDown" : "chevronRight"} size={15} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
                </button>
                {aberto && (
                  <div style={{ padding: "0 14px 14px 49px" }}>
                    {s === "loading" ? (
                      <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>Analisando com a LexIA…</div>
                    ) : s ? (
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)", display: "flex", gap: 7, alignItems: "flex-start" }}>
                        <Icon name={s.relevante ? "alertTriangle" : "circleDot"} size={14} style={{ color: s.relevante ? "var(--warn)" : "var(--text-subtle)", marginTop: 1, flexShrink: 0 }} />
                        <span>
                          {s.motivo || (s.relevante ? "Parece exigir providência." : "Parece cartorário/rotina.")}
                          {s.prazoSugerido ? ` Sugestão: ${s.prazoSugerido.descricao} (${s.prazoSugerido.quantidadeDias} dias).` : ""}
                          <span style={{ color: "var(--text-subtle)" }}> · {s.fonte === "ia" ? "LexIA" : "heurística"}</span>
                        </span>
                      </div>
                    ) : null}
                    {prazoFor === a.id ? (
                      <MovPrazoForm processoId={processoId} andamento={a} sugestao={s && s !== "loading" ? s : null} responsaveis={responsaveis} hoje={hoje} onCancel={() => setPrazoFor(null)} onDone={() => prazoGerado(a.id)} />
                    ) : (
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => setPrazoFor(a.id)} style={{ fontSize: 12 }}><Icon name="flag" size={13} />Gerar prazo</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => semPrazo(a.id)} style={{ fontSize: 12 }}><Icon name="checkCircle" size={13} />Sem prazo (revisado)</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </FxModal>
  )
}

// ── Novo processo ──────────────────────────────────────────────────────────────
const SISTEMA_OPTS = [
  { value: "", label: "—" },
  { value: "pje", label: "PJe" },
  { value: "esaj", label: "e-SAJ" },
  { value: "projudi", label: "Projudi" },
  { value: "eproc", label: "eproc" },
  { value: "outro", label: "Outro" },
]
function reaisToCents(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
const STATUS_OPTS = [
  { value: "ativo", label: "Ativo" },
  { value: "suspenso", label: "Suspenso" },
  { value: "arquivado", label: "Arquivado" },
  { value: "baixado", label: "Baixado" },
]
const centsToReais = (c: number | null | undefined): string =>
  c ? (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""

/**
 * Criar OU editar um processo. Em CRIAÇÃO, o caso pode ser escolhido OU criado
 * inline (digitando um título) — destrava o cadastro quando ainda não há casos.
 * Em EDIÇÃO (`processo` presente), os campos vêm preenchidos e o caso é fixo.
 */
export function ProcProcessoModal({
  casoOptions, responsaveis, processo, onClose, onSaved,
}: {
  casoOptions: IdNome[]
  responsaveis: UsuarioOption[]
  processo?: ProcessoRow | null
  onClose: () => void
  onSaved: (id: number) => void
}) {
  const { toast } = useCrmToast()
  const editing = !!processo
  const [f, setF] = useState({
    casoId: "",
    novoCaso: "",
    numeroCnj: processo?.numeroCnj ?? "",
    classe: processo?.classe ?? "",
    assunto: processo?.assunto ?? "",
    tribunal: processo?.tribunal ?? "",
    comarca: processo?.comarca ?? "",
    vara: processo?.vara ?? "",
    instancia: processo?.instancia ?? "1ª instância",
    sistema: processo?.sistema ?? "",
    uf: processo?.uf ?? "SP",
    valor: centsToReais(processo?.valorCausaCents),
    responsavelUserId: processo?.responsavelUserId ? String(processo.responsavelUserId) : "",
    distribuicao: processo?.dataDistribuicao?.slice(0, 10) ?? "",
    segredo: processo?.segredoJustica ?? false,
    status: processo?.status ?? "ativo",
  })
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const campos = () => ({
    numeroCnj: f.numeroCnj.trim() || null,
    classe: f.classe.trim() || null,
    assunto: f.assunto.trim() || null,
    tribunal: f.tribunal.trim() || null,
    comarca: f.comarca.trim() || null,
    vara: f.vara.trim() || null,
    instancia: f.instancia.trim() || null,
    sistema: f.sistema || null,
    uf: f.uf.trim() || null,
    valorCausaCents: reaisToCents(f.valor),
    responsavelUserId: f.responsavelUserId ? Number(f.responsavelUserId) : null,
    dataDistribuicao: f.distribuicao || null,
    segredoJustica: f.segredo,
  })

  const save = async () => {
    setSaving(true)
    setError("")
    try {
      if (editing) {
        await updateProcesso(processo.id, { ...campos(), status: f.status })
        toast("Processo atualizado", { icon: "scale" })
        onSaved(processo.id)
      } else {
        let casoId = f.casoId ? Number(f.casoId) : 0
        if (!casoId && f.novoCaso.trim()) {
          const caso = await createCaso({ titulo: f.novoCaso.trim() })
          casoId = caso.id
        }
        if (!casoId) {
          setError("Selecione um caso existente ou digite o título de um novo caso.")
          setSaving(false)
          return
        }
        const r = await createProcesso({ casoId, ...campos() })
        toast("Processo cadastrado", { icon: "scale" })
        onSaved(r.id)
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar o processo")
    } finally {
      setSaving(false)
    }
  }

  const G = ({ children }: { children: ReactNode }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>

  return (
    <FxModal
      title={editing ? "Editar processo" : "Novo processo"}
      sub={editing ? "Atualize os dados do processo." : "Cadastre um processo e vincule-o a um caso (escolha ou crie um novo)."}
      onClose={onClose}
      width={620}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}><Icon name={editing ? "checkCircle" : "plus"} size={14} />{saving ? "Salvando…" : editing ? "Salvar" : "Cadastrar"}</button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!editing && (
          <G>
            <div><FxLabel>Caso</FxLabel><FxSelect options={[{ value: "", label: casoOptions.length ? "Selecione…" : "Nenhum caso ainda" }, ...casoOptions.map((c) => ({ value: String(c.id), label: c.nome }))]} value={f.casoId} onChange={(e) => { set("casoId", e.target.value); if (e.target.value) set("novoCaso", "") }} /></div>
            <div><FxLabel hint="ou crie um novo">Novo caso (título)</FxLabel><FxInput value={f.novoCaso} onChange={(e) => { set("novoCaso", e.target.value); if (e.target.value) set("casoId", "") }} placeholder="Ex.: Cobrança — Cliente X" /></div>
          </G>
        )}
        <G>
          <div><FxLabel hint="opcional">Número CNJ</FxLabel><FxInput value={f.numeroCnj} onChange={(e) => set("numeroCnj", e.target.value)} placeholder="0000000-00.0000.0.00.0000" /></div>
          {editing
            ? <div><FxLabel>Status</FxLabel><FxSelect options={STATUS_OPTS} value={f.status} onChange={(e) => set("status", e.target.value)} /></div>
            : <div><FxLabel>Classe</FxLabel><FxInput value={f.classe} onChange={(e) => set("classe", e.target.value)} placeholder="Procedimento Comum Cível" /></div>}
        </G>
        {editing && <div><FxLabel>Classe</FxLabel><FxInput value={f.classe} onChange={(e) => set("classe", e.target.value)} placeholder="Procedimento Comum Cível" /></div>}
        <div><FxLabel>Assunto</FxLabel><FxInput value={f.assunto} onChange={(e) => set("assunto", e.target.value)} placeholder="Cobrança · inadimplemento contratual" /></div>
        <G>
          <div><FxLabel>Tribunal</FxLabel><FxInput value={f.tribunal} onChange={(e) => set("tribunal", e.target.value)} placeholder="TJSP" /></div>
          <div><FxLabel>Comarca / foro</FxLabel><FxInput value={f.comarca} onChange={(e) => set("comarca", e.target.value)} placeholder="São Paulo/SP" /></div>
        </G>
        <G>
          <div><FxLabel>Vara / órgão</FxLabel><FxInput value={f.vara} onChange={(e) => set("vara", e.target.value)} placeholder="12ª Vara Cível" /></div>
          <div><FxLabel>Instância</FxLabel><FxInput value={f.instancia} onChange={(e) => set("instancia", e.target.value)} /></div>
        </G>
        <G>
          <div><FxLabel>Sistema</FxLabel><FxSelect options={SISTEMA_OPTS} value={f.sistema} onChange={(e) => set("sistema", e.target.value)} /></div>
          <div><FxLabel>UF</FxLabel><FxInput value={f.uf} maxLength={2} onChange={(e) => set("uf", e.target.value)} /></div>
        </G>
        <G>
          <div><FxLabel hint="R$">Valor da causa</FxLabel><FxInput value={f.valor} onChange={(e) => set("valor", e.target.value)} placeholder="450.000,00" /></div>
          <div><FxLabel>Responsável</FxLabel><FxSelect options={userOptions(responsaveis)} value={f.responsavelUserId} onChange={(e) => set("responsavelUserId", e.target.value)} /></div>
        </G>
        <G>
          <div><FxLabel>Distribuição</FxLabel><FxInput type="date" value={f.distribuicao} onChange={(e) => set("distribuicao", e.target.value)} /></div>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={f.segredo} onChange={(e) => set("segredo", e.target.checked)} /> Segredo de justiça
            </label>
          </div>
        </G>
        {error && <div style={{ fontSize: 12, color: "var(--crit)" }}>{error}</div>}
      </div>
    </FxModal>
  )
}

// Alias de compatibilidade (criação) — usado pelo ProcessosApp.
export function ProcNovoProcessoModal(props: {
  casoOptions: IdNome[]
  responsaveis: UsuarioOption[]
  onClose: () => void
  onCreated: (id: number) => void
}) {
  return <ProcProcessoModal casoOptions={props.casoOptions} responsaveis={props.responsaveis} onClose={props.onClose} onSaved={props.onCreated} />
}

// ── Registrar publicação (manual → alimenta a fila de triagem) ──────────────────
export function ProcPublicacaoModal({
  processos, onClose, onDone,
}: {
  processos: ProcessoRow[]
  onClose: () => void
  onDone: () => void
}) {
  const { toast } = useCrmToast()
  const [processoId, setProcessoId] = useState("")
  const [diario, setDiario] = useState("DJe TJSP")
  const [data, setData] = useState("")
  const [conteudo, setConteudo] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const save = async () => {
    if (!conteudo.trim()) { setError("Informe o conteúdo da publicação."); return }
    setSaving(true)
    setError("")
    try {
      await createPublicacao({
        processoId: processoId ? Number(processoId) : null,
        diario: diario.trim() || null,
        dataPublicacao: data || null,
        conteudo: conteudo.trim(),
      })
      toast("Publicação registrada na fila de triagem", { icon: "checkCircle" })
      onDone()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao registrar a publicação")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FxModal
      title="Registrar publicação"
      sub="Adicione manualmente uma publicação à fila de triagem (enquanto a captura automática não está ativa)."
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !conteudo.trim()}><Icon name="plus" size={14} />{saving ? "Salvando…" : "Registrar"}</button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FxLabel hint="opcional">Processo</FxLabel><FxSelect options={[{ value: "", label: "A vincular" }, ...processos.map((p) => ({ value: String(p.id), label: `${p.numeroCnj ?? "sem número"} · ${p.caso ?? p.classe ?? ""}` }))]} value={processoId} onChange={(e) => setProcessoId(e.target.value)} /></div>
          <div><FxLabel>Data de publicação</FxLabel><FxInput type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
        </div>
        <div><FxLabel>Diário / fonte</FxLabel><FxInput value={diario} onChange={(e) => setDiario(e.target.value)} placeholder="DJe TJSP · Caderno 3" /></div>
        <div><FxLabel>Conteúdo</FxLabel><FxTextarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="Texto da publicação / intimação…" style={{ minHeight: 120 }} /></div>
        {error && <div style={{ fontSize: 12, color: "var(--crit)" }}>{error}</div>}
      </div>
    </FxModal>
  )
}

// ── Vincular publicação (apoio IA + manual) ──────────────────────────────────────
export function ProcVincularModal({
  pub, processos, casoOptions, responsaveis, onClose, onDone,
}: {
  pub: PublicacaoRow
  processos: ProcessoRow[]
  casoOptions: IdNome[]
  responsaveis: UsuarioOption[]
  onClose: () => void
  onDone: () => void
}) {
  const { toast } = useCrmToast()
  const cnj = pub.numeroProcessoBruto ?? pub.numeroCnj ?? null
  const [sug, setSug] = useState<SugestaoVinculoC | null>(null)
  const [loadingSug, setLoadingSug] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  // criar-processo form
  const [casoId, setCasoId] = useState("")
  const [novoCaso, setNovoCaso] = useState("")
  const [classe, setClasse] = useState("")
  const [tribunal, setTribunal] = useState("")
  const [uf, setUf] = useState("")
  const [respId, setRespId] = useState("")
  // manual: buscar processo existente
  const [busca, setBusca] = useState("")

  useEffect(() => {
    let cancelled = false
    sugestaoVinculo(pub.id)
      .then((s) => {
        if (cancelled) return
        setSug(s)
        setClasse(s.prefill.classe ?? "")
        setTribunal(s.prefill.tribunal ?? "")
        setUf(s.prefill.uf ?? "")
        if (s.casosSugeridos[0]) setCasoId(String(s.casosSugeridos[0].id))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingSug(false)
      })
    return () => {
      cancelled = true
    }
  }, [pub.id])

  const vincularExistente = async (processoId: number) => {
    setBusy(true)
    setError("")
    try {
      await vincularPublicacao(pub.id, processoId)
      toast("Publicação vinculada ao processo", { icon: "scale" })
      onDone()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao vincular")
    } finally {
      setBusy(false)
    }
  }

  const criarEVincular = async () => {
    if (!casoId && !novoCaso.trim()) {
      setError("Escolha um caso ou crie um novo")
      return
    }
    setBusy(true)
    setError("")
    try {
      let cid = casoId ? Number(casoId) : 0
      if (!cid) {
        const caso = await createCaso({ titulo: novoCaso.trim() })
        cid = caso.id
      }
      // Structure the parties the IA/heuristic extracted so the captured process
      // isn't left with zero partes (a key data-consistency gap). papel/polo are
      // clamped server-side; default to "outro" when the source left them blank.
      const partes = (sug?.prefill.partes ?? [])
        .filter((p) => p.nome.trim())
        .map((p) => ({ nome: p.nome.trim(), papel: p.papel.trim() || "outro", polo: "outro" }))
      const proc = await createProcesso({
        casoId: cid,
        numeroCnj: cnj ?? undefined,
        classe: classe.trim() || undefined,
        tribunal: tribunal.trim() || undefined,
        uf: uf.trim() || undefined,
        responsavelUserId: respId ? Number(respId) : undefined,
        ...(partes.length ? { partes } : {}),
      })
      await vincularPublicacao(pub.id, proc.id)
      toast("Processo criado e publicação vinculada", { icon: "scale" })
      onDone()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao criar/vincular")
    } finally {
      setBusy(false)
    }
  }

  const nb = busca.trim().toLowerCase()
  const achados = nb
    ? processos.filter((p) => `${p.numeroCnj ?? ""} ${p.caso ?? ""} ${p.classe ?? ""}`.toLowerCase().includes(nb)).slice(0, 6)
    : []

  return (
    <FxModal
      title="Vincular publicação"
      sub={cnj ? `Processo ${cnj}` : "Sem número de processo"}
      onClose={onClose}
      width={620}
      footer={<button className="btn btn-ghost" onClick={onClose}>Fechar</button>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card" style={{ background: "var(--bg-soft)", padding: "10px 13px", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, maxHeight: 96, overflowY: "auto" }}>
          {limparTextoPublicacao(pub.conteudo)}
        </div>

        {loadingSug && <div style={{ fontSize: 12.5, color: "var(--text-subtle)" }}>Analisando o teor…</div>}

        {sug?.processoExistente && (
          <div className="card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, borderColor: "var(--accent)" }}>
            <Icon name="scale" size={16} style={{ color: "var(--accent)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Processo já cadastrado com este CNJ</div>
              <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>{sug.processoExistente.numeroCnj} · {sug.processoExistente.caso ?? "—"}</div>
            </div>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => vincularExistente(sug.processoExistente!.id)}>Vincular</button>
          </div>
        )}

        <div>
          <FxLabel hint={sug ? (sug.fonte === "ia" ? "sugerido pela IA" : "pré-preenchido pelo CNJ") : undefined}>Criar processo e vincular</FxLabel>
          {sug && sug.prefill.partes.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-subtle)", margin: "2px 0 8px" }}>
              Partes: {sug.prefill.partes.slice(0, 4).map((p) => `${p.nome} (${p.papel})`).join(" · ")}
            </div>
          )}
          {sug && sug.casosSugeridos.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>Casos prováveis:</span>
              {sug.casosSugeridos.map((c) => (
                <button key={c.id} onClick={() => { setCasoId(String(c.id)); setNovoCaso("") }} className="btn btn-ghost btn-sm" style={{ fontSize: 12, borderColor: casoId === String(c.id) ? "var(--accent)" : undefined }} title={c.via}>{c.titulo}</button>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FxSelect
              options={[{ value: "", label: "— escolher caso —" }, ...casoOptions.map((c) => ({ value: String(c.id), label: c.nome }))]}
              value={casoId}
              onChange={(e) => { setCasoId(e.target.value); if (e.target.value) setNovoCaso("") }}
            />
            <FxInput value={novoCaso} onChange={(e) => { setNovoCaso(e.target.value); if (e.target.value) setCasoId("") }} placeholder="…ou novo caso (título)" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 0.7fr", gap: 12, marginTop: 10 }}>
            <FxInput value={classe} onChange={(e) => setClasse(e.target.value)} placeholder="Classe (ex.: Procedimento Comum)" />
            <FxInput value={tribunal} onChange={(e) => setTribunal(e.target.value)} placeholder="Tribunal" />
            <FxInput value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} placeholder="UF" maxLength={2} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginTop: 10, alignItems: "end" }}>
            <FxSelect options={userOptions(responsaveis)} value={respId} onChange={(e) => setRespId(e.target.value)} />
            <button className="btn btn-primary" disabled={busy} onClick={criarEVincular}><Icon name="plus" size={14} />Criar e vincular</button>
          </div>
        </div>

        <div>
          <FxLabel>Ou vincular a um processo existente</FxLabel>
          <FxInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por CNJ, caso, classe…" />
          {achados.length > 0 && (
            <div className="card" style={{ marginTop: 8, overflow: "hidden" }}>
              {achados.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{p.numeroCnj ?? "sem número"}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{p.caso ?? p.classe ?? "—"}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => vincularExistente(p.id)} style={{ fontSize: 12 }}>Vincular</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div style={{ fontSize: 12, color: "var(--crit)" }}>{error}</div>}
      </div>
    </FxModal>
  )
}

// ── Confirmação de exclusão (reutilizável) ──────────────────────────────────────
export function ProcConfirmDelete({
  titulo = "Excluir", mensagem, confirmarLabel = "Excluir", onConfirmar, onClose,
}: {
  titulo?: string
  mensagem: string
  confirmarLabel?: string
  onConfirmar: () => Promise<void>
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const go = async () => {
    setBusy(true)
    setError("")
    try {
      await onConfirmar()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível excluir")
      setBusy(false)
    }
  }
  return (
    <FxModal
      title={titulo}
      onClose={onClose}
      width={430}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn" onClick={go} disabled={busy} style={{ background: "var(--crit)", color: "#fff", border: "none" }}>
            <Icon name="trash2" size={14} />{busy ? "Excluindo…" : confirmarLabel}
          </button>
        </>
      }
    >
      <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.55 }}>{mensagem}</div>
      {error && <div style={{ fontSize: 12, color: "var(--crit)", marginTop: 10 }}>{error}</div>}
    </FxModal>
  )
}
