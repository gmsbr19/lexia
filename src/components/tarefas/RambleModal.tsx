"use client"

// Tarefas v2 — Ramble: ditado de tarefas por voz. O navegador transcreve
// (Web Speech API, pt-BR); a cada pausa a transcrição vai à LexIA
// (/api/tarefas/ramble), que mantém a lista de rascunhos — inclusive editando/
// removendo itens por comando de voz — até o usuário encerrar ("é isso").
// Degrada em camadas: sem modelo → parser local (parseQuickAdd) por frase;
// sem suporte a voz no navegador → modo digitado com o mesmo pipeline.
import { useEffect, useRef, useState } from "react"
import { apiSend } from "@/lib/client/api"
import { useModalGuard } from "@/lib/client/modal-guard"
import { PRIO, type TaskPrio } from "@/lib/tarefas/types"
import type { RambleDraft } from "@/lib/tarefas/ramble-ai"
import { lexGlass } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"
import { Icon } from "./tf-icons"
import { useTarefasCtx } from "./TarefasContext"
import { AssigneeAvatar } from "./tf-kit"
import { dataLabel, parseQuickAdd } from "./tf-meta"
import type { NovaTarefa } from "./QuickAddModal"

// ── minimal Web Speech typings (not in the TS DOM lib) ───────────────────────
interface SpeechAlt {
  transcript: string
}
interface SpeechRes {
  isFinal: boolean
  0: SpeechAlt
}
interface SpeechResultEvent {
  resultIndex: number
  results: { length: number; [i: number]: SpeechRes }
}
interface SpeechErrorEvent {
  error: string
}
interface SpeechRec {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechResultEvent) => void) | null
  onerror: ((e: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecCtor = new () => SpeechRec

function getSpeechRecognition(): SpeechRecCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const ENCERRA_RE = /\b(é isso|so isso|só isso|acabou|pode encerrar|encerrar sess[ãa]o|finalizar)\b/i
const BAR_HEIGHTS = [5, 9, 13, 16, 12, 8, 5]

const TIPS = [
  "Tente “Protocolar recurso amanhã às 14h, no projeto Trabalhista”",
  "Diga data, hora, projeto, prioridade, responsável ou prazo",
  "Edite ou remova tarefas fazendo um pedido; encerre a sessão com “é isso”.",
]

// ── draft row ────────────────────────────────────────────────────────────────
function DraftRow({ draft, onRemove, onTitle }: { draft: RambleDraft; onRemove: () => void; onTitle: (t: string) => void }) {
  const { member, projetoById } = useTarefasCtx()
  const proj = projetoById(draft.projetoId)
  const m = member(draft.responsavelId)
  const prio = PRIO[(draft.prio as TaskPrio) in PRIO ? (draft.prio as TaskPrio) : 4]
  return (
    <div className="crit-row" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 2px", borderBottom: "1px solid var(--border)" }}>
      <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1.6px solid var(--border-strong)", flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <input
          value={draft.titulo}
          onChange={(e) => onTitle(e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 13.5, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-sans)" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
          {draft.data && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 500, color: "var(--accent)" }}>
              <Icon name="calendar" size={11} strokeWidth={1.9} />
              {dataLabel(draft.data)}
              {draft.hora ? ` ${draft.hora}` : ""}
            </span>
          )}
          {draft.prazo && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)" }}>
              <Icon name="target" size={11} strokeWidth={1.9} />
              Prazo {dataLabel(draft.prazo)}
            </span>
          )}
          {draft.prio < 4 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 500, color: prio.color }}>
              <Icon name="flag" size={11} strokeWidth={2} />
              {prio.label}
            </span>
          )}
          {proj && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-muted)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: proj.cor || "var(--text-muted)" }} />
              {proj.nome}
            </span>
          )}
          {m && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-muted)" }}>
              <AssigneeAvatar id={m.id} size={14} title={false} />
              {m.first}
            </span>
          )}
          {draft.notes && (
            <span style={{ fontSize: 11.5, color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}>
              {draft.notes}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="crit-x"
        style={{ border: "none", background: "transparent", color: "var(--text-subtle)", cursor: "pointer", padding: 2, opacity: 0, transition: "opacity .12s", flexShrink: 0 }}
      >
        <Icon name="x" size={13} strokeWidth={2} />
      </button>
    </div>
  )
}

// ── modal ────────────────────────────────────────────────────────────────────
export function RambleModal({
  onClose,
  onCreate,
  onManual,
}: {
  onClose: () => void
  onCreate: (tarefas: NovaTarefa[]) => Promise<void> | void
  onManual: () => void
}) {
  const { socios, projetos } = useTarefasCtx()
  const [supported] = useState(() => getSpeechRecognition() != null)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState("")
  const [lastHeard, setLastHeard] = useState("")
  const [drafts, setDrafts] = useState<RambleDraft[]>([])
  const [processing, setProcessing] = useState(false)
  const [aiOff, setAiOff] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [typed, setTyped] = useState("")
  const [saving, setSaving] = useState(false)

  const recRef = useRef<SpeechRec | null>(null)
  const listeningRef = useRef(false)
  const queueRef = useRef<string[]>([])
  const draftsRef = useRef<RambleDraft[]>([])
  const busyRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiOffRef = useRef(false)
  useEffect(() => {
    draftsRef.current = drafts
  }, [drafts])

  useModalGuard()
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  // fallback local: cada frase vira uma tarefa via o parser do quick-add
  const localParse = (text: string): RambleDraft[] => {
    const ativos = projetos.filter((p) => p.status !== "arquivado")
    return text
      .split(/[.;\n]| e depois | e também /i)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => parseQuickAdd(s, { socios, projetos: ativos }))
      .filter((p) => p.titulo)
      .map((p) => ({
        titulo: p.titulo,
        notes: null,
        data: p.data,
        hora: p.hora,
        prazo: null,
        prio: p.prio ?? 4,
        responsavelId: p.responsavelId,
        projetoId: p.projetoId,
      }))
  }

  const processQueue = async () => {
    if (busyRef.current) return
    const pending = queueRef.current.join(" ").trim()
    if (!pending) return
    queueRef.current = []
    busyRef.current = true
    setProcessing(true)
    try {
      if (aiOffRef.current) {
        setDrafts((d) => [...d, ...localParse(pending)])
      } else {
        const res = await apiSend<{ disponivel: boolean; encerrar: boolean; tarefas: RambleDraft[] }>(
          "/api/tarefas/ramble",
          "POST",
          { transcricao: pending, rascunho: draftsRef.current },
        )
        if (!res.disponivel) {
          aiOffRef.current = true
          setAiOff(true)
          setDrafts((d) => [...d, ...localParse(pending)])
        } else {
          setDrafts(res.tarefas)
          if (res.encerrar) stopListening()
        }
      }
    } catch {
      // rede/modelo falhou nesta rodada — não perde a fala: parser local
      setDrafts((d) => [...d, ...localParse(pending)])
    } finally {
      busyRef.current = false
      setProcessing(false)
      if (queueRef.current.length) void processQueue()
    }
  }

  const enqueue = (text: string) => {
    const t = text.trim()
    if (!t) return
    setLastHeard(t)
    queueRef.current.push(t)
    if (ENCERRA_RE.test(t)) stopListening()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void processQueue(), 900)
  }

  const stopListening = () => {
    listeningRef.current = false
    setListening(false)
    setInterim("")
    try {
      recRef.current?.stop()
    } catch {
      /* already stopped */
    }
  }

  const startListening = () => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) return
    setMicError(null)
    const rec = new Ctor()
    rec.lang = "pt-BR"
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let live = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) enqueue(r[0].transcript)
        else live += r[0].transcript
      }
      setInterim(live)
    }
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setMicError("Sem acesso ao microfone — autorize o uso no navegador ou digite abaixo.")
        listeningRef.current = false
        setListening(false)
      }
    }
    // o reconhecimento encerra sozinho em silêncios longos — religa enquanto ativo
    rec.onend = () => {
      if (listeningRef.current) {
        try {
          rec.start()
        } catch {
          listeningRef.current = false
          setListening(false)
        }
      }
    }
    recRef.current = rec
    listeningRef.current = true
    setListening(true)
    try {
      rec.start()
    } catch {
      listeningRef.current = false
      setListening(false)
    }
  }

  // inicia ouvindo ao abrir (quando suportado); para tudo ao desmontar.
  // O start é adiado um tick: ligar o microfone é sincronização com sistema
  // externo e não deve disparar setState no corpo do effect.
  useEffect(() => {
    const boot = supported ? setTimeout(() => startListening(), 0) : null
    return () => {
      if (boot) clearTimeout(boot)
      listeningRef.current = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
      try {
        recRef.current?.stop()
      } catch {
        /* noop */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitTyped = () => {
    if (!typed.trim()) return
    enqueue(typed)
    setTyped("")
    if (debounceRef.current) clearTimeout(debounceRef.current)
    void processQueue()
  }

  const criar = async () => {
    if (!drafts.length || saving) return
    setSaving(true)
    try {
      await onCreate(
        drafts.map((d) => ({
          titulo: d.titulo,
          notes: d.notes,
          data: d.data,
          hora: d.hora,
          prazo: d.prazo,
          prio: Math.min(4, Math.max(1, d.prio)) as TaskPrio,
          responsavelId: d.responsavelId,
          projetoId: d.projetoId,
          reminder: null,
        })),
      )
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const showTips = !drafts.length && !lastHeard && !interim

  return (
    <div
      onClick={onClose}
      className="overlay-scrim"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 130,
        background: "var(--overlay)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "13vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`overlay-panel ${lexGlass}`}
        style={{
          width: 620,
          maxWidth: "calc(100% - 48px)",
          maxHeight: "74vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 14,
          overflow: "hidden",
          ...glassElevation("0 24px 60px rgba(2,13,37,0.28)"),
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px 12px", flexShrink: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Ramble</span>
          <span className="pill" style={{ height: 20 }}>beta</span>
          {aiOff && (
            <span title="LexIA indisponível — usando a análise local simples" style={{ fontSize: 11, color: "var(--warn)", background: "var(--warn-soft)", padding: "1px 8px", borderRadius: 999, fontWeight: 500 }}>
              análise local
            </span>
          )}
          <div style={{ flex: 1 }} />
          {processing && <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>Interpretando…</span>}
          <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2.5, height: 16, marginRight: 4 }} aria-hidden="true">
            {BAR_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className={listening ? "ramble-bar" : undefined}
                style={{
                  width: 2.5,
                  height: h,
                  borderRadius: 2,
                  background: listening ? "var(--accent)" : "var(--border-strong)",
                  animationDelay: `${i * 0.12}s`,
                  ...(listening ? {} : { transform: "scaleY(0.35)", transformOrigin: "bottom" }),
                }}
              />
            ))}
          </span>
          <button
            onClick={() => (listening ? stopListening() : startListening())}
            disabled={!supported}
            title={!supported ? "Ditado não suportado neste navegador" : listening ? "Pausar o microfone" : "Retomar o microfone"}
            className="btn btn-ghost"
            style={{ width: 32, height: 32, padding: 0, color: listening ? "var(--accent)" : "var(--text-muted)" }}
          >
            <Icon name={listening ? "mic" : "micOff"} size={17} strokeWidth={1.9} />
          </button>
        </div>

        {/* corpo */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 20px" }}>
          <div style={{ background: "var(--bg-sunken)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
            {showTips ? (
              <>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
                  {supported ? "Comece a ditar suas tarefas para a LexIA captá-las." : "Seu navegador não suporta ditado por voz — digite abaixo que a LexIA estrutura."}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {TIPS.map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                      <Icon name="mic" size={15} strokeWidth={1.8} style={{ color: "var(--text-subtle)", marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {(interim || lastHeard) && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: drafts.length ? 12 : 0 }}>
                    <Icon name="mic" size={14} strokeWidth={1.9} style={{ color: listening ? "var(--accent)" : "var(--text-subtle)", marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: interim ? "var(--text)" : "var(--text-subtle)", lineHeight: 1.5, fontStyle: interim ? "normal" : "italic" }}>
                      {interim || `“${lastHeard}”`}
                    </span>
                  </div>
                )}
                {drafts.map((d, i) => (
                  <DraftRow
                    key={i}
                    draft={d}
                    onRemove={() => setDrafts((ds) => ds.filter((_, j) => j !== i))}
                    onTitle={(t) => setDrafts((ds) => ds.map((x, j) => (j === i ? { ...x, titulo: t } : x)))}
                  />
                ))}
              </>
            )}
          </div>
          {micError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "var(--crit)" }}>
              <Icon name="alertTriangle" size={13} strokeWidth={1.9} />
              {micError}
            </div>
          )}
          {/* entrada digitada — sempre disponível (fallback e correções) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 0", border: "1px solid var(--border)", borderRadius: 10, padding: "6px 10px" }}>
            <Icon name="listTodo" size={14} strokeWidth={1.8} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitTyped()
              }}
              placeholder={supported ? "Ou digite um pedido…" : "Digite as tarefas…"}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--text)", fontFamily: "var(--font-sans)" }}
            />
            <button className="btn btn-ghost btn-sm" onClick={submitTyped} disabled={!typed.trim()} style={{ fontSize: 12, height: 26, padding: "0 8px", color: "var(--accent)" }}>
              Capturar
            </button>
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px 16px", flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={onManual} style={{ width: 38, height: 38, padding: 0 }} title="Adicionar manualmente">
            <Icon name="plus" size={16} />
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ fontSize: 12 }}>
            Cancelar
          </button>
          <button className="btn btn-primary btn-sm" onClick={criar} disabled={!drafts.length || saving} style={{ fontSize: 12 }}>
            {saving
              ? "Adicionando…"
              : drafts.length > 1
                ? `Adicionar ${drafts.length} tarefas`
                : "Adicionar tarefa"}
          </button>
        </div>
      </div>
    </div>
  )
}
