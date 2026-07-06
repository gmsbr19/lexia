"use client"

// Composer unificado da LexIA (handoff "LexIA · Chat de IA", D11) — usado pelas
// 5 montagens (flutuante/lateral/tela-cheia/embutido no editor + a página
// /lexia standalone). Substitui o antigo `Composer.tsx` (mais simples, só
// usado por LexiaPage) — toda feature de composer agora é construída UMA vez
// e vale em todas as superfícies. Caixa + anexos + chip(s) de contexto + menu
// "+" + configurações (opcional) + seletor de modelo (opcional) + enviar/parar.
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react"
import { Icon, type CrmIconName } from "@/components/crm/crm-icons"
import { AutoTextarea, MenuPanel } from "./LexiaKit"
import { AnexoChips } from "./AnexoChips"
import { ACCEPT_ATTR, arquivosDoClipboard, lerArquivos, type ClientAnexo } from "./anexos"
import { toast } from "@/lib/client/toast"
import { SysCard } from "./cards/SysCard"
import { detectarToken, substituirToken } from "./composer-token"
import { LexiaSettingsMenu } from "./LexiaSettings"
import { MentionPopover, useMentionSearch, type MentionEntidade } from "./MentionPopover"
import { MicButton } from "./MicButton"
import { filtrarComandos, type Comando } from "./comandos-data"
import { SlashCommands } from "./SlashCommands"
import type { LexiaAgentMode, LexiaModelo } from "@/lib/lexia/preferencias-core"
import "./cc/cc.css"

export interface Ctx {
  icon: CrmIconName
  label: string
  /** Presente quando o chip veio de uma menção "@" (Fase 7) — carrega o id real
   *  para o contexto volátil do turno (evita um "buscar" extra pro modelo). */
  entidade?: MentionEntidade
}

const CHAR_LIMIT = 4000
// Colar mais que isto oferece "Anexar como .txt?" em vez de jogar tudo no texto.
const PASTE_OFERTA_MIN = 2500

/** UTF-8-safe base64 encode (texto colado → anexo .txt) — btoa puro trunca acentos. */
function textoParaBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

export const MODELS: { id: LexiaModelo; name: string; desc: string }[] = [
  { id: "auto", name: "Automático", desc: "A LexIA escolhe o melhor modelo" },
  { id: "rapido", name: "Rápido", desc: "Respostas ágeis para tarefas simples" },
  { id: "avancado", name: "Avançado", desc: "Raciocínio jurídico aprofundado (Opus, mais créditos)" },
]

export interface LexiaComposerSettings {
  agentMode: LexiaAgentMode
  setAgentMode: (m: LexiaAgentMode) => void
  webAccess: boolean
  setWebAccess: (v: boolean) => void
  autoMode: boolean
  setAutoMode: (v: boolean) => void
  onPersonalize: () => void
}

export interface LexiaComposerModel {
  modelo: LexiaModelo
  onChange: (m: LexiaModelo) => void
}

export interface LexiaComposerProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  placeholder?: string
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  /** Pulso dourado breve no foco (ex.: "Editar com a LexIA" na seleção do editor). */
  pulse?: boolean

  streaming: boolean
  /** Quando presente, o botão de enviar vira "Parar" durante o streaming. */
  onStop?: () => void

  anexos: ClientAnexo[]
  onAnexosChange: (anexos: ClientAnexo[]) => void

  /** Chip único (modo embutido no editor: trecho selecionado). */
  selectionChip?: { label: string; onRemove: () => void } | null
  /** Chips múltiplos (página atual / entidades mencionadas). */
  contextChips?: Ctx[]
  onRemoveContextChip?: (label: string) => void
  /** Habilita o item "Mencione páginas ou pessoas" no menu "+". */
  onAddContext?: () => void
  /** Digitar "@" busca e adiciona um chip de entidade (Fase 7, D10). */
  onMention?: (entidade: MentionEntidade) => void

  settings?: LexiaComposerSettings
  model?: LexiaComposerModel

  /** Alinha o composer ao layout de tela-cheia (largura máx. 720, centralizado). */
  fullWidth?: boolean

  /** IA indisponível (sem ANTHROPIC_API_KEY) — estado degradado permanente: composer tracejado, tudo desabilitado. */
  disabled?: boolean
}

export function LexiaComposer({
  value,
  onChange,
  onSubmit,
  placeholder = "Peça qualquer coisa à LexIA…",
  textareaRef,
  pulse = false,
  streaming,
  onStop,
  anexos,
  onAnexosChange,
  selectionChip,
  contextChips,
  onRemoveContextChip,
  onAddContext,
  onMention,
  settings,
  model,
  disabled = false,
}: LexiaComposerProps) {
  const [ctxMenu, setCtxMenu] = useState(false)
  const [settingsMenu, setSettingsMenu] = useState(false)
  const [modelMenu, setModelMenu] = useState(false)
  const [anexoErros, setAnexoErros] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // "@" menções / "/" comandos (Fase 7, D10) — token detectado no FIM do valor;
  // popover CONTROLADO por este componente (índice ativo p/ teclado).
  const token = detectarToken(value)
  const mentionQuery = onMention && token?.trigger === "@" ? token.query : null
  const mentionGrupos = useMentionSearch(mentionQuery)
  const comandoItens = token?.trigger === "/" ? filtrarComandos(token.query) : []
  const [popoverActive, setPopoverActive] = useState(0)
  // Fechado explicitamente (Esc) até o token mudar de novo — sem isso o popover
  // reabriria a cada render, já que ele é derivado do próprio texto (sem estado
  // "fechado" separado, Esc não teria efeito nenhum).
  const [popoverDismissed, setPopoverDismissed] = useState(false)
  // Reset síncrono durante o render quando o token muda (padrão React p/ "ajustar
  // estado quando uma prop muda" — evita o efeito+setState em cascata do useEffect).
  const tokenKey = token ? `${token.trigger}:${token.query}` : null
  const [prevTokenKey, setPrevTokenKey] = useState(tokenKey)
  if (tokenKey !== prevTokenKey) {
    setPrevTokenKey(tokenKey)
    setPopoverActive(0)
    setPopoverDismissed(false)
  }
  const popoverAberto = !popoverDismissed && (mentionQuery != null || token?.trigger === "/")

  const pickMention = (e: MentionEntidade) => {
    if (!token) return
    onChange(substituirToken(value, token))
    onMention?.(e)
  }
  const pickComando = (c: Comando) => {
    if (!token) return
    onChange(substituirToken(value, token, c.template))
  }

  // Colar texto longo (Fase 7) — oferece anexar como .txt em vez de inundar o
  // composer (completa a ação prometida pelo SysCard "mensagem longa" da Fase 4).
  const [pasteOferta, setPasteOferta] = useState<string | null>(null)
  const onPasteExtra = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const texto = e.clipboardData.getData("text")
    if (texto.length < PASTE_OFERTA_MIN) return
    e.preventDefault()
    setPasteOferta(texto)
  }
  const manterNoTexto = () => {
    if (pasteOferta) onChange(value + pasteOferta)
    setPasteOferta(null)
  }
  const anexarComoTxt = () => {
    if (!pasteOferta) return
    const anexo: ClientAnexo = { nome: "texto_colado.txt", mimeType: "text/plain", tamanho: pasteOferta.length, dataBase64: textoParaBase64(pasteOferta) }
    onAnexosChange([...anexos, anexo])
    setPasteOferta(null)
  }

  const charCount = value.length
  const overLimit = charCount > CHAR_LIMIT
  const nearLimit = charCount > CHAR_LIMIT * 0.9

  const adicionarAnexos = async (files: FileList | File[]) => {
    const { anexos: novos, erros } = await lerArquivos(files, anexos)
    if (novos.length) onAnexosChange([...anexos, ...novos])
    erros.forEach((e) => toast(e, { kind: "error" }))
    // Persistente (a diferença do toast some sozinho) — "anexo rejeitado" (Fase 4).
    setAnexoErros(erros)
  }

  // Colar arquivo/imagem enquanto o composer está montado (mesmo sem foco nele —
  // a janela do chat inteira aceita colar).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = arquivosDoClipboard(e.clipboardData)
      if (!files.length) return
      e.preventDefault()
      void adicionarAnexos(files)
    }
    document.addEventListener("paste", onPaste)
    return () => document.removeEventListener("paste", onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anexos])

  // Esc para o botão "Parar" durante o streaming (Fase 4).
  useEffect(() => {
    if (!streaming || !onStop) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onStop()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [streaming, onStop])

  const canSend = (value.trim().length > 0 || anexos.length > 0) && !overLimit
  const modelName = model ? MODELS.find((m) => m.id === model.modelo)?.name ?? "Automático" : null

  // Navegação por teclado do popover de @ menção / comando (Fase 7) — intercepta
  // ↑↓↵Esc ANTES do Enter-para-enviar do AutoTextarea (que respeita e.defaultPrevented).
  const onKeyDownExtra = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!popoverAberto) return
    const itens = mentionQuery != null ? mentionGrupos.flatMap((g) => g.itens) : comandoItens
    if (e.key === "Escape") {
      e.preventDefault()
      setPopoverDismissed(true)
      return
    }
    if (!itens.length) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setPopoverActive((a) => (a + 1) % itens.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setPopoverActive((a) => (a - 1 + itens.length) % itens.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (mentionQuery != null) pickMention(itens[popoverActive] as MentionEntidade)
      else pickComando(itens[popoverActive] as Comando)
    }
  }

  // IA indisponível (sem ANTHROPIC_API_KEY) — estado degradado permanente:
  // composer tracejado, nada clicável (a tela em volta segue funcionando).
  if (disabled) {
    return (
      <div className="lx-composer" style={{ borderStyle: "dashed", background: "var(--bg-sunken)", opacity: 0.9 }}>
        <div style={{ fontSize: 14, color: "var(--text-subtle)", minHeight: 20 }}>IA indisponível neste ambiente</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
          <button className="btn btn-ghost" disabled style={{ width: 30, height: 30, padding: 0, borderRadius: 8, opacity: 0.35 }} aria-hidden="true">
            <Icon name="plus" size={17} />
          </button>
          <div style={{ marginLeft: "auto" }}>
            <button disabled style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: "var(--bg-sunken)", color: "var(--text-subtle)", opacity: 0.6, display: "flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
              <Icon name="arrowRight" size={16} strokeWidth={2.2} style={{ transform: "rotate(-90deg)" }} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="lx-composer" style={{ position: "relative", ...(pulse ? { borderColor: "var(--border-gold, var(--accent))", boxShadow: "0 0 0 3px var(--ring)" } : undefined) }}>
      {anexos.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <AnexoChips anexos={anexos} onRemove={(i) => onAnexosChange(anexos.filter((_, j) => j !== i))} />
        </div>
      )}
      {anexoErros.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 9 }}>
          {anexoErros.map((e, i) => (
            <SysCard key={i} codigo="generico" mensagem={e} />
          ))}
        </div>
      )}
      {pasteOferta && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 10, background: "var(--bg-sunken)", marginBottom: 9, fontSize: 12.5, color: "var(--text-muted)" }}>
          <Icon name="fileText" size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            Você colou <strong style={{ color: "var(--text)", fontWeight: 500 }}>{pasteOferta.length.toLocaleString("pt-BR")} caracteres</strong>. Anexar como arquivo?
          </span>
          <button className="btn btn-ghost btn-sm" onClick={manterNoTexto} style={{ fontSize: 12 }}>
            Manter no texto
          </button>
          <button className="btn btn-secondary btn-sm" onClick={anexarComoTxt} style={{ fontSize: 12 }}>
            Anexar .txt
          </button>
        </div>
      )}
      {selectionChip ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 9 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              maxWidth: "100%",
              height: 26,
              padding: "0 5px 0 9px",
              borderRadius: 7,
              background: "var(--accent-soft)",
              border: "1px solid var(--border-gold, var(--accent))",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--accent)",
            }}
          >
            <Icon name="wand" size={13} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 230 }}>{selectionChip.label}</span>
            <button onClick={selectionChip.onRemove} title="Remover seleção" className="btn btn-ghost" style={{ width: 18, height: 18, padding: 0, borderRadius: 5, color: "var(--accent)" }}>
              <Icon name="x" size={12} />
            </button>
          </span>
        </div>
      ) : (
        contextChips && contextChips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 9 }}>
            {contextChips.map((c) => (
              <span
                key={c.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 26,
                  padding: "0 5px 0 9px",
                  borderRadius: 7,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-muted)",
                }}
              >
                <Icon name={c.icon} size={13} style={{ color: "var(--accent)" }} /> {c.label}
                <button onClick={() => onRemoveContextChip?.(c.label)} title="Remover" className="btn btn-ghost" style={{ width: 18, height: 18, padding: 0, borderRadius: 5, color: "var(--text-subtle)" }}>
                  <Icon name="x" size={12} />
                </button>
              </span>
            ))}
          </div>
        )
      )}
      <AutoTextarea
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        taRef={textareaRef}
        placeholder={placeholder}
        maxHeight={150}
        onKeyDownExtra={onKeyDownExtra}
        onPasteExtra={onPasteExtra}
        style={{ width: "100%", border: "none", outline: "none", resize: "none", background: "transparent", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text)", lineHeight: 1.5, padding: 2, letterSpacing: "-0.01em", display: "block" }}
      />
      {popoverAberto &&
        (mentionQuery != null ? (
          <MentionPopover query={mentionQuery} grupos={mentionGrupos} active={popoverActive} onHover={setPopoverActive} onPick={pickMention} />
        ) : (
          <SlashCommands itens={comandoItens} active={popoverActive} onHover={setPopoverActive} onPick={pickComando} />
        ))}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
        {/* + (adicionar contexto) */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setCtxMenu((s) => !s)}
            title="Adicionar contexto"
            className="btn btn-ghost"
            style={{ width: 30, height: 30, padding: 0, borderRadius: 8, background: ctxMenu ? "var(--surface-hover)" : undefined, color: ctxMenu ? "var(--text)" : "var(--text-muted)" }}
          >
            <Icon name="plus" size={17} />
          </button>
          {ctxMenu && (
            <>
              <div onClick={() => setCtxMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 1 }} />
              <MenuPanel style={{ position: "absolute", bottom: 40, left: 0, width: 278, zIndex: 2, transformOrigin: "bottom left" }}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", padding: "6px 10px 4px" }}>Adicionar contexto</div>
                <button
                  className="fx-menu-item"
                  onClick={() => {
                    setCtxMenu(false)
                    fileRef.current?.click()
                  }}
                >
                  <Icon name="paperclip" size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <span>Adicionar imagens, PDFs ou arquivos</span>
                </button>
                {onAddContext && (
                  <button
                    className="fx-menu-item"
                    onClick={() => {
                      onAddContext()
                      setCtxMenu(false)
                    }}
                  >
                    <Icon name="at" size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <span>Mencione páginas ou pessoas</span>
                  </button>
                )}
              </MenuPanel>
            </>
          )}
        </div>
        {/* configurações */}
        {settings && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setSettingsMenu((s) => !s)}
              title="Configurações"
              className="btn btn-ghost"
              style={{ width: 30, height: 30, padding: 0, borderRadius: 8, background: settingsMenu ? "var(--surface-hover)" : undefined, color: settingsMenu || settings.agentMode !== "agente" ? "var(--text)" : "var(--text-muted)" }}
            >
              <Icon name="sliders" size={16} />
            </button>
            {settingsMenu && (
              <LexiaSettingsMenu
                agentMode={settings.agentMode}
                setAgentMode={settings.setAgentMode}
                webAccess={settings.webAccess}
                setWebAccess={settings.setWebAccess}
                autoMode={settings.autoMode}
                setAutoMode={settings.setAutoMode}
                onClose={() => setSettingsMenu(false)}
                onPersonalize={() => {
                  setSettingsMenu(false)
                  settings.onPersonalize()
                }}
              />
            )}
          </div>
        )}
        {/* ditado por voz (Fase 7) — some sozinho sem suporte no navegador */}
        <MicButton
          disabled={streaming}
          onTranscricao={(texto) => onChange(value ? `${value}${/\s$/.test(value) ? "" : " "}${texto}` : texto)}
        />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
          {nearLimit && (
            <span style={{ fontSize: 11, fontWeight: 500, color: overLimit ? "var(--crit)" : "var(--text-subtle)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {charCount.toLocaleString("pt-BR")} / {CHAR_LIMIT.toLocaleString("pt-BR")}
            </span>
          )}
          {model && !streaming && (
            <button
              onClick={() => setModelMenu((s) => !s)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 30, padding: "0 9px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 500, color: "var(--text-muted)" }}
            >
              {modelName}
              <Icon name="chevronDown" size={13} style={{ color: "var(--text-subtle)" }} />
            </button>
          )}
          {streaming && onStop ? (
            <span style={{ fontSize: 11, color: "var(--text-subtle)", whiteSpace: "nowrap" }}>Esc para parar</span>
          ) : (
            value.trim().length > 0 && (
              <span style={{ fontSize: 11, color: "var(--text-subtle)", whiteSpace: "nowrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 16, minWidth: 16, padding: "0 3px", borderRadius: 4, border: "1px solid var(--border)", marginRight: 3 }}>⇧↵</span>
                nova linha · <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 16, minWidth: 16, padding: "0 3px", borderRadius: 4, border: "1px solid var(--border)", margin: "0 3px" }}>↵</span>
                enviar
              </span>
            )
          )}
          <button
            onClick={streaming && onStop ? onStop : onSubmit}
            disabled={!streaming && !canSend}
            title={streaming && onStop ? "Parar geração (Esc)" : "Enviar"}
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              border: "none",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: streaming && onStop ? "var(--crit-soft)" : canSend ? "var(--brand-gold)" : "var(--bg-sunken)",
              color: streaming && onStop ? "var(--text)" : canSend ? "#020D25" : "var(--text-subtle)",
              cursor: streaming && !onStop && !canSend ? "default" : "pointer",
            }}
          >
            {streaming && onStop ? <span className="cc-stopsq" /> : <Icon name="arrowRight" size={16} strokeWidth={2.2} style={{ transform: "rotate(-90deg)" }} />}
          </button>
          {modelMenu && model && (
            <>
              <div onClick={() => setModelMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 1 }} />
              <MenuPanel style={{ position: "absolute", bottom: 42, right: 0, width: 250, zIndex: 2 }}>
                {MODELS.map((mo) => (
                  <button
                    key={mo.id}
                    className="fx-menu-item"
                    style={{ alignItems: "flex-start", flexDirection: "column", gap: 2 }}
                    onClick={() => {
                      model.onChange(mo.id)
                      setModelMenu(false)
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                      <span style={{ fontWeight: 500 }}>{mo.name}</span>
                      {model.modelo === mo.id && <Icon name="check" size={14} strokeWidth={2.4} style={{ color: "var(--accent)", marginLeft: "auto" }} />}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{mo.desc}</span>
                  </button>
                ))}
              </MenuPanel>
            </>
          )}
        </div>
      </div>
      {overLimit && <div style={{ fontSize: 11, color: "var(--crit)", marginTop: 6 }}>Reduza para {CHAR_LIMIT.toLocaleString("pt-BR")} caracteres ou anexe como arquivo para enviar.</div>}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        style={{ display: "none" } as CSSProperties}
        onChange={(e) => {
          if (e.target.files?.length) void adicionarAnexos(e.target.files)
          e.target.value = ""
        }}
      />
    </div>
  )
}
