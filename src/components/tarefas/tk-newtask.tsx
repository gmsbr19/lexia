"use client"

// Tarefas — Nova tarefa (janela 540px, vidro). Título com ditado por voz (Web
// Speech API pt-BR; sem suporte = silêncio), propriedades em linhas, prazo JÁ
// preenchido com a sexta da semana, "Sugerir com IA" discreto no rodapé. Sem
// sintaxe especial no título. Projeto e Grupo podem ser CRIADOS daqui: "Novo
// projeto…" abre o formulário rápido (com cliente = caso; sem = interno) e
// "Novo grupo…" uma janelinha — ao salvar, voltam já escolhidos nesta tarefa.
// "Tarefa | Informação" no topo: Informação fixa um know-how no projeto ou no
// cliente (TkNovaInformacao).
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { apiSend } from "@/lib/client/api"
import { prazoPadrao } from "@/lib/tarefas/regras"
import { Icon } from "./tf-icons"
import { useTk, type NovaTarefaUI } from "./tk-context"
import type { ChaveProjeto } from "@/lib/tarefas/types"
import { TkProjetoForm } from "./tk-projeto-form"
import { TkModoNova, TkNovaInformacao } from "./tk-info"
import { TkClientPicker, TkDatePop, TkGrupoDialog, TkProjetoPicker, TkPropMenu, useGruposDoProjeto, useOpcoesPessoa } from "./tk-pickers"
import { TkIconBtn, useEsc } from "./tk-ui"
import { ELEVACAO_JANELA, TK_JANELA } from "./tk-glass"

interface Sugestao {
  disponivel: boolean
  projeto: ChaveProjeto | null
  responsavelId: number | null
  prazoFatal: boolean | null
  prazo: string | null
}

// Tipos mínimos da Web Speech API (não estão no lib.dom padrão).
interface ReconhecimentoFala {
  lang: string
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
type CtorFala = new () => ReconhecimentoFala

export function TkNewTask({ projetoInicial, onClose }: { projetoInicial: ChaveProjeto | null; onClose: () => void }) {
  const { act, meId, hoje, clienteDoProjeto, projetosAtivos, podeCriarProjeto, portal } = useTk()
  const [modo, setModo] = useState<"tarefa" | "info">("tarefa")
  const [titulo, setTitulo] = useState("")
  const [projeto, setProjetoState] = useState<ChaveProjeto | null>(projetoInicial)
  const [grupo, setGrupo] = useState<string | null>(null)
  const [criando, setCriando] = useState<null | "projeto" | "grupo">(null)
  // trocar de projeto zera o grupo (grupo só existe dentro do projeto)
  const setProjeto = (k: ChaveProjeto | null) => {
    setProjetoState(k)
    if (k !== projeto) setGrupo(null)
  }
  const [responsavelId, setResponsavelId] = useState<number | null>(meId)
  const [prazo, setPrazo] = useState(() => prazoPadrao(hoje))
  const [prazoFatal, setPrazoFatal] = useState(false)
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [ouvindo, setOuvindo] = useState(false)
  const [ia, setIa] = useState<null | "busy" | "none" | Record<string, boolean>>(null)
  const [salvando, setSalvando] = useState(false)
  const rec = useRef<ReconhecimentoFala | null>(null)
  const opcoesPessoa = useOpcoesPessoa(true)
  const grupos = useGruposDoProjeto(projeto)
  const opcoesGrupo = [
    ...(grupo && !grupos.includes(grupo) ? [grupo] : []),
    ...grupos,
  ].map((g) => ({ id: g as string | null, label: g }))
  opcoesGrupo.push({ id: null, label: "Sem grupo" })
  useEsc(onClose, criando == null && modo === "tarefa")
  useEffect(() => () => rec.current?.stop(), [])

  const clienteHerdado = projeto != null ? clienteDoProjeto(projeto) : null
  // Só aparece o microfone onde o navegador tem ditado (a janela só abre no cliente).
  const [SR] = useState<CtorFala | null>(() => {
    if (typeof window === "undefined") return null
    const w = window as unknown as { SpeechRecognition?: CtorFala; webkitSpeechRecognition?: CtorFala }
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
  })

  const ditar = () => {
    if (ouvindo) {
      rec.current?.stop()
      setOuvindo(false)
      return
    }
    if (!SR) return
    setOuvindo(true)
    const r = new SR()
    rec.current = r
    r.lang = "pt-BR"
    r.interimResults = true
    r.onresult = (e) => setTitulo(Array.from(e.results).map((x) => x[0].transcript).join(" "))
    r.onend = () => setOuvindo(false)
    r.onerror = () => setOuvindo(false)
    try {
      r.start()
    } catch {
      setOuvindo(false)
    }
  }

  const sugerir = async () => {
    setIa("busy")
    try {
      const s = await apiSend<Sugestao>("/api/tarefas/sugerir", "POST", { titulo: titulo.trim() })
      const marcas: Record<string, boolean> = {}
      if (s.disponivel) {
        // só sugere um projeto que a pessoa pode vincular
        if (s.projeto != null && projetosAtivos.some((p) => p.chave === s.projeto)) {
          setProjeto(s.projeto)
          marcas.projeto = true
        }
        if (s.responsavelId != null) {
          setResponsavelId(s.responsavelId)
          marcas.responsavel = true
        }
        if (s.prazoFatal) {
          setPrazoFatal(true)
          marcas.fatal = true
        }
        if (s.prazo) {
          setPrazo(s.prazo)
          marcas.prazo = true
        }
      }
      setIa(Object.keys(marcas).length ? marcas : "none")
    } catch {
      setIa("none")
    }
  }
  const marca = (k: string) =>
    ia && typeof ia === "object" && ia[k] ? <Icon name="sparkles" size={12} style={{ color: "var(--ai)", flexShrink: 0 }} /> : null

  const criar = async () => {
    if (!titulo.trim() || salvando) return
    setSalvando(true)
    const n: NovaTarefaUI = {
      titulo: titulo.trim(),
      projeto,
      grupo: projeto != null ? grupo : null,
      responsavelId,
      clienteId: clienteHerdado != null ? null : clienteId,
      prazo,
      prazoFatal,
    }
    const ok = await act.criar(n)
    setSalvando(false)
    if (ok) onClose()
  }

  if (modo === "info") return <TkNovaInformacao projetoInicial={projeto} onTarefa={() => setModo("tarefa")} onClose={onClose} />

  return (
    <div className="tk-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={TK_JANELA} role="dialog" aria-label="Nova tarefa" style={{ ...ELEVACAO_JANELA, width: 540, maxWidth: "calc(100% - 32px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 12px 4px 20px" }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>Nova tarefa</span>
          <TkModoNova modo="tarefa" onChange={setModo} />
          <TkIconBtn icon="x" title="Fechar" onClick={onClose} />
        </div>
        <div style={{ padding: "4px 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            className="tk-titlebox"
            style={{ display: "flex", alignItems: "center", gap: 4, height: 40, padding: "0 4px 0 12px", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", background: "var(--surface)" }}
          >
            <input
              autoFocus
              className="tk-plain-input"
              placeholder="Título"
              aria-label="Título"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value)
                if (ia && ia !== "busy") setIa(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void criar()
              }}
              style={{ fontSize: 14 }}
            />
            {ouvindo && <span style={{ fontSize: 12, color: "var(--accent)", whiteSpace: "nowrap" }}>Ouvindo…</span>}
            {SR && <TkIconBtn icon="mic" title={ouvindo ? "Parar ditado" : "Ditar"} active={ouvindo} onClick={ditar} />}
          </div>
          <div className="tk-props" style={{ width: "auto", border: "none", background: "none", padding: 0, overflow: "visible" }}>
            <div className="tk-prop">
              <span className="tk-prop-label">Projeto</span>
              <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <TkProjetoPicker
                  value={projeto}
                  onChange={setProjeto}
                  acao={podeCriarProjeto ? { label: "Novo projeto…", onClick: () => setCriando("projeto") } : undefined}
                />
                {marca("projeto")}
              </div>
            </div>
            {projeto != null && (
              <div className="tk-prop">
                <span className="tk-prop-label">Grupo</span>
                <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <TkPropMenu<string | null>
                    value={grupo}
                    options={opcoesGrupo}
                    onPick={setGrupo}
                    muted={grupo == null}
                    acao={{ label: "Novo grupo…", onClick: () => setCriando("grupo") }}
                  />
                </div>
              </div>
            )}
            <div className="tk-prop">
              <span className="tk-prop-label">Responsável</span>
              <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <TkPropMenu<number | null> value={responsavelId} options={opcoesPessoa} onPick={setResponsavelId} muted={responsavelId == null} />
                {marca("responsavel")}
              </div>
            </div>
            <div className="tk-prop">
              <span className="tk-prop-label">Cliente</span>
              <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <TkClientPicker value={clienteHerdado ?? clienteId} herdado={clienteHerdado != null} onChange={setClienteId} />
              </div>
            </div>
            <div className="tk-prop">
              <span className="tk-prop-label">Prazo</span>
              <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <TkDatePop value={prazo} onChange={setPrazo} />
                {marca("prazo")}
              </div>
            </div>
            <div className="tk-prop">
              <span className="tk-prop-label" />
              <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <label className="tk-cb" style={{ color: prazoFatal ? "var(--crit)" : undefined }}>
                  <input type="checkbox" checked={prazoFatal} onChange={(e) => setPrazoFatal(e.target.checked)} />
                  Prazo fatal
                </label>
                {marca("fatal")}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--border)" }}>
          <button
            type="button"
            className="tk-inline-add"
            style={{ marginLeft: -6, color: "var(--ai)" }}
            disabled={!titulo.trim() || ia === "busy"}
            onClick={() => void sugerir()}
          >
            <Icon name="sparkles" size={13} />
            {ia === "busy" ? "Sugerindo…" : "Sugerir com IA"}
          </button>
          {ia === "none" && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Sem sugestão</span>}
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!titulo.trim() || salvando} onClick={() => void criar()}>
            Criar
          </button>
        </div>
      </div>
      {criando === "projeto" && portal && createPortal(<TkProjetoForm onClose={() => setCriando(null)} onCriado={(k) => setProjeto(k)} />, portal)}
      {criando === "grupo" && <TkGrupoDialog onClose={() => setCriando(null)} onSalvar={setGrupo} />}
    </div>
  )
}
