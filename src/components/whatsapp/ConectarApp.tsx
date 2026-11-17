"use client"

// Página de conexão do WhatsApp — QR, código de pareamento e estado da sessão
// DO PRÓPRIO USUÁRIO (o servidor nunca aceita um userId do cliente).
//
// O QR do WhatsApp se renova a cada ~20 s. Em vez de polling, a página abre um
// SSE (/api/whatsapp/eventos) e só redesenha a imagem quando um evento `qr`
// chega — mesmo molde do NotificacoesStream. A string do QR não é persistida em
// lugar nenhum: vem pelo evento e é desenhada aqui no navegador.
import { useCallback, useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { Icon } from "@/components/crm/crm-icons"
import { apiSend } from "@/lib/client/api"
import { toast } from "@/lib/client/toast"
import type { SessaoView, WhatsappEvento, WhatsappStatus } from "@/lib/whatsapp/tipos"

const ROTULO: Record<WhatsappStatus, string> = {
  desconectado: "Desconectado",
  aguardando_qr: "Aguardando leitura",
  conectado: "Conectado",
  erro: "Com problema",
  deslogado: "Desconectado no celular",
}

const TOM: Record<WhatsappStatus, string> = {
  desconectado: "var(--text-muted)",
  aguardando_qr: "var(--fin-amber, #C98A14)",
  conectado: "var(--ok, #2E7D53)",
  erro: "var(--crit, #B3261E)",
  deslogado: "var(--text-muted)",
}

export function ConectarApp({ inicial }: { inicial: SessaoView }) {
  const [sessao, setSessao] = useState<SessaoView>(inicial)
  const [qr, setQr] = useState<string | null>(null)
  // Guarda a imagem JUNTO do QR que a gerou: assim o render descarta sozinho a
  // imagem de um QR velho, sem um setState síncrono dentro do efeito.
  const [qrImg, setQrImg] = useState<{ para: string; src: string } | null>(null)
  const [pareamento, setPareamento] = useState<string | null>(inicial.pareamento)
  const [numero, setNumero] = useState("")
  const [modoCodigo, setModoCodigo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const conectadoAntes = useRef(inicial.status === "conectado")

  // ── SSE: estado + QR + código, em tempo real ───────────────────────────────
  useEffect(() => {
    let es: EventSource | null = null
    let parado = false
    let tentativa = 0

    const aplicar = (evt: WhatsappEvento) => {
      switch (evt.tipo) {
        case "qr":
          setQr(evt.qr)
          setPareamento(null)
          setSessao((s) => ({ ...s, status: "aguardando_qr", ultimoErro: null }))
          break
        case "pareamento":
          setPareamento(evt.codigo)
          setQr(null)
          setSessao((s) => ({ ...s, status: "aguardando_qr", ultimoErro: null }))
          break
        case "conectado":
          setQr(null)
          setPareamento(null)
          setSessao((s) => ({ ...s, status: "conectado", numero: evt.numero, conectadoEm: new Date().toISOString(), ultimoErro: null }))
          if (!conectadoAntes.current) {
            conectadoAntes.current = true
            toast("WhatsApp conectado")
          }
          break
        case "deslogado":
          setQr(null)
          setPareamento(null)
          conectadoAntes.current = false
          setSessao((s) => ({ ...s, status: "deslogado", numero: null, conectadoEm: null }))
          break
        case "erro":
          setSessao((s) => ({ ...s, status: "erro", ultimoErro: evt.mensagem }))
          break
        case "status":
          setSessao((s) => ({ ...s, status: evt.status }))
          break
      }
    }

    const conectar = () => {
      es = new EventSource("/api/whatsapp/eventos")
      es.addEventListener("init", (e) => {
        tentativa = 0
        try {
          const v = JSON.parse((e as MessageEvent).data) as SessaoView | null
          if (v) {
            setSessao(v)
            setPareamento(v.pareamento)
            if (v.status === "conectado") conectadoAntes.current = true
          }
        } catch {
          /* ignora frame malformado */
        }
      })
      es.addEventListener("whatsapp", (e) => {
        try {
          aplicar(JSON.parse((e as MessageEvent).data) as WhatsappEvento)
        } catch {
          /* ignora */
        }
      })
      es.onerror = () => {
        es?.close()
        es = null
        if (parado) return
        const espera = Math.min(30_000, 1_000 * 2 ** Math.min(tentativa++, 5))
        setTimeout(() => {
          if (!parado) conectar()
        }, espera)
      }
    }
    conectar()
    return () => {
      parado = true
      es?.close()
    }
  }, [])

  // A imagem do QR é gerada no navegador a partir da string recebida.
  useEffect(() => {
    if (!qr) return
    let vivo = true
    QRCode.toDataURL(qr, { margin: 1, width: 280, errorCorrectionLevel: "L" })
      .then((url) => {
        if (vivo) setQrImg({ para: qr, src: url })
      })
      .catch(() => {
        /* fica no estado "Gerando o código…" até o próximo QR */
      })
    return () => {
      vivo = false
    }
  }, [qr])

  const qrSrc = qr && qrImg?.para === qr ? qrImg.src : null

  const conectar = useCallback(async () => {
    setOcupado(true)
    try {
      await apiSend("/api/whatsapp/conectar", "POST")
      setSessao((s) => ({ ...s, status: "aguardando_qr", ultimoErro: null }))
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível iniciar a conexão", { kind: "error" })
    } finally {
      setOcupado(false)
    }
  }, [])

  const pedirCodigo = useCallback(async () => {
    setOcupado(true)
    try {
      await apiSend("/api/whatsapp/pareamento", "POST", { numero })
      setSessao((s) => ({ ...s, status: "aguardando_qr", ultimoErro: null }))
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível pedir o código", { kind: "error" })
    } finally {
      setOcupado(false)
    }
  }, [numero])

  const desconectar = useCallback(async () => {
    setOcupado(true)
    try {
      const r = await apiSend<{ revogadoLocalmente?: boolean }>("/api/whatsapp/desconectar", "POST")
      setConfirmando(false)
      setQr(null)
      setPareamento(null)
      conectadoAntes.current = false
      setSessao((s) => ({ ...s, status: "deslogado", numero: null, conectadoEm: null }))
      toast(
        r?.revogadoLocalmente
          ? "Credenciais apagadas. O aparelho pode continuar listado no celular até o worker voltar — remova por lá em Aparelhos conectados."
          : "Desconectado",
      )
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível desconectar", { kind: "error" })
    } finally {
      setOcupado(false)
    }
  }, [])

  const conectado = sessao.status === "conectado"
  const esperando = sessao.status === "aguardando_qr"

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 24px 64px", display: "grid", gap: 16 }}>
      <header style={{ display: "grid", gap: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>WhatsApp</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
          Conecte o seu WhatsApp para que a LexIA e o Claude possam organizar pendências a partir das conversas que você
          escolher. Cada pessoa vê apenas o próprio WhatsApp.
        </p>
      </header>

      {!sessao.workerOnline && (
        <Aviso tom="alerta" icone="alertTriangle">
          O serviço de conexão do WhatsApp não está respondendo. Conectar e desconectar só funcionam com ele no ar — avise
          o administrador.
        </Aviso>
      )}

      <section style={cartao}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            aria-hidden
            style={{ width: 8, height: 8, borderRadius: 999, background: TOM[sessao.status], flexShrink: 0 }}
          />
          <strong style={{ fontSize: 14, fontWeight: 500 }}>{ROTULO[sessao.status]}</strong>
          {conectado && sessao.numero && (
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              {formatarNumero(sessao.numero)}
            </span>
          )}
          {conectado && sessao.conectadoEm && (
            <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>desde {dataBr(sessao.conectadoEm)}</span>
          )}
          <span style={{ flex: 1 }} />
          {conectado || esperando ? (
            <button type="button" style={botaoSec} disabled={ocupado} onClick={() => setConfirmando(true)}>
              Desconectar
            </button>
          ) : (
            <button type="button" style={botao} disabled={ocupado} onClick={conectar}>
              Conectar
            </button>
          )}
        </div>
        {sessao.ultimoErro && !conectado && (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{sessao.ultimoErro}</p>
        )}
      </section>

      {esperando && (
        <section style={cartao}>
          {pareamento ? (
            <div style={{ display: "grid", gap: 10, justifyItems: "center", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                No celular: <strong>WhatsApp › Aparelhos conectados › Conectar um aparelho › Conectar com número de
                telefone</strong>. Depois digite o código:
              </p>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "1px solid var(--border-gold, var(--border-strong))",
                  background: "var(--bg-sunken)",
                }}
              >
                {pareamento}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-subtle)" }}>
                O código expira em alguns minutos. Se não funcionar, use o QR.
              </p>
              <button type="button" style={botaoSec} disabled={ocupado} onClick={conectar}>
                Usar QR em vez do código
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14, justifyItems: "center", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                No celular: <strong>WhatsApp › Aparelhos conectados › Conectar um aparelho</strong> e aponte a câmera
                para o código.
              </p>
              <div
                style={{
                  width: 280,
                  height: 280,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 14,
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                }}
              >
                {qrSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrSrc} alt="QR code para conectar o WhatsApp" width={280} height={280} />
                ) : (
                  <span style={{ fontSize: 12, color: "#6B7280" }}>Gerando o código…</span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-subtle)" }}>
                O código se renova sozinho a cada poucos segundos.
              </p>
            </div>
          )}
        </section>
      )}

      {!conectado && !pareamento && (
        <section style={cartao}>
          {modoCodigo ? (
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }} htmlFor="wa-numero">
                Conectar com código de pareamento
              </label>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                Use este caminho quando o Lexia estiver aberto no próprio celular (não há como fotografar o QR da
                própria tela). Informe o número do WhatsApp com DDD.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  id="wa-numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="(11) 99999-8888"
                  inputMode="tel"
                  autoComplete="tel"
                  style={campo}
                />
                <button type="button" style={botao} disabled={ocupado || numero.replace(/\D/g, "").length < 10} onClick={pedirCodigo}>
                  Gerar código
                </button>
                <button type="button" style={botaoSec} disabled={ocupado} onClick={() => setModoCodigo(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" style={{ ...botaoSec, justifySelf: "start" }} onClick={() => setModoCodigo(true)}>
              Conectar com código em vez de QR
            </button>
          )}
        </section>
      )}

      {conectado && (
        <section style={cartao}>
          <h2 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 500 }}>Próximo passo</h2>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-muted)" }}>
            Escolha quais conversas o Lexia deve gravar. Enquanto você não marcar nenhuma,{" "}
            <strong>nenhuma mensagem é guardada</strong> — a conexão só mantém o aparelho pareado e a lista de conversas
            em dia.
          </p>
          <a href="/whatsapp/conversas" style={{ ...botao, textDecoration: "none", display: "inline-flex", gap: 6, alignItems: "center" }}>
            <Icon name="messageCircle" size={14} /> Escolher conversas
          </a>
        </section>
      )}

      <section style={{ ...cartao, background: "var(--bg-sunken)" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="alertTriangle" size={14} /> Antes de conectar
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--text-muted)", display: "grid", gap: 5 }}>
          <li>
            A conexão usa uma biblioteca <strong>não oficial</strong> (Baileys), o que contraria os termos do WhatsApp e
            traz risco de bloqueio da conta. O Lexia só lê: nunca envia mensagem e nunca marca conversa como lida.
          </li>
          <li>Seu celular continua recebendo as notificações normalmente — o Lexia não entra como aparelho ativo.</li>
          <li>Só serão gravadas as conversas que você marcar, e somente você as vê no Lexia.</li>
          <li>Desconectar aqui apaga as credenciais da sessão guardadas pelo Lexia.</li>
        </ul>
      </section>

      {confirmando && (
        <div style={overlay} role="dialog" aria-modal="true" aria-label="Confirmar desconexão">
          <div style={{ ...cartao, maxWidth: 420, width: "100%", background: "var(--bg-elevated)" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 500 }}>Desconectar o WhatsApp?</h2>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)" }}>
              O aparelho sai de “Aparelhos conectados” no seu celular e as credenciais guardadas pelo Lexia são
              apagadas. Para voltar, será preciso ler o QR de novo.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" style={botaoSec} disabled={ocupado} onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
              <button type="button" style={{ ...botao, background: "var(--crit, #B3261E)" }} disabled={ocupado} onClick={desconectar}>
                Desconectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Aviso({ tom, icone, children }: { tom: "alerta"; icone: "alertTriangle"; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid var(--border-strong)",
        background: "var(--bg-sunken)",
        fontSize: 12.5,
        color: "var(--text-muted)",
      }}
      data-tom={tom}
    >
      <Icon name={icone} size={14} />
      <span>{children}</span>
    </div>
  )
}

const cartao: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 14,
  background: "var(--bg-soft)",
  padding: 16,
}

const botao: React.CSSProperties = {
  appearance: "none",
  border: "1px solid transparent",
  borderRadius: 8,
  background: "var(--accent-strong)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 500,
  padding: "8px 14px",
  cursor: "pointer",
}

const botaoSec: React.CSSProperties = {
  appearance: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text)",
  fontSize: 13,
  fontWeight: 500,
  padding: "8px 14px",
  cursor: "pointer",
}

const campo: React.CSSProperties = {
  flex: "1 1 180px",
  minWidth: 160,
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 13,
  padding: "8px 10px",
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "var(--overlay, rgba(2,13,37,.5))",
  display: "grid",
  placeItems: "center",
  padding: 20,
  zIndex: 1200,
}

/** 5511999998888 → +55 (11) 99999-8888 (visual; o banco guarda só dígitos). */
function formatarNumero(n: string): string {
  const d = n.replace(/\D/g, "")
  if (d.length < 12) return "+" + d
  const ddi = d.slice(0, 2)
  const ddd = d.slice(2, 4)
  const resto = d.slice(4)
  const meio = resto.length > 8 ? resto.slice(0, 5) : resto.slice(0, 4)
  const fim = resto.slice(meio.length)
  return "+" + ddi + " (" + ddd + ") " + meio + "-" + fim
}

function dataBr(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })
}
