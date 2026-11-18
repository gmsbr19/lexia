"use client"

// /whatsapp/conversas — o usuário escolhe QUAIS conversas o Lexia grava e as
// vincula a contatos. Tudo aqui é do PRÓPRIO usuário: o servidor resolve o
// userId pela sessão e nenhuma chamada manda um id de usuário.
//
// A regra que a tela precisa deixar óbvia: o interruptor "Monitorar" é o que
// autoriza a gravação, e mensagens ANTERIORES a ligá-lo não existem — o Baileys
// não entrega histórico sob demanda. Por isso cada linha monitorada diz desde
// quando está sendo gravada e quantas mensagens já tem.
import { useCallback, useEffect, useRef, useState } from "react"
import { Icon } from "@/components/crm/crm-icons"
import { apiSend } from "@/lib/client/api"
import { toast } from "@/lib/client/toast"
import type { ConversaView, LeituraConversa, MensagemView } from "@/lib/whatsapp/conversas"
import type { SessaoView } from "@/lib/whatsapp/tipos"

type ClienteOpt = { id: number; nome: string }

export function ConversasApp({
  inicial,
  sugeridasIniciais,
  naFilaInicial,
  sessao,
}: {
  inicial: ConversaView[]
  sugeridasIniciais: number
  naFilaInicial: number
  sessao: SessaoView
}) {
  const [conversas, setConversas] = useState<ConversaView[]>(inicial)
  // Quantas conversas de cliente com caso ativo ainda não estão sendo gravadas.
  // Vem do servidor sobre o conjunto INTEIRO, não só sobre as linhas na tela.
  const [sugeridas, setSugeridas] = useState(sugeridasIniciais)
  const [ligandoSugeridas, setLigandoSugeridas] = useState(false)
  // Quantas conversas esperam o worker buscar o passado delas. Também vem do
  // conjunto inteiro: a fila é drenada em segundo plano, uma de cada vez.
  const [naFila, setNaFila] = useState(naFilaInicial)
  const [busca, setBusca] = useState("")
  const [soMonitoradas, setSoMonitoradas] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [abertaId, setAbertaId] = useState<number | null>(null)
  const [leitura, setLeitura] = useState<LeituraConversa | null>(null)
  const [lendo, setLendo] = useState(false)
  const [ocupadoId, setOcupadoId] = useState<number | null>(null)
  const [pickerId, setPickerId] = useState<number | null>(null)
  const [apagarId, setApagarId] = useState<number | null>(null)
  const [clientes, setClientes] = useState<ClienteOpt[] | null>(null)
  const [clientesErro, setClientesErro] = useState(false)
  // Toda recarga é numerada: a resposta de uma busca antiga que chegue depois da
  // nova é descartada em vez de sobrescrever a lista (e o apiSend deduplica GET,
  // então aqui é fetch puro).
  const seq = useRef(0)

  const recarregar = useCallback(
    async (q: string, monitoradas: boolean) => {
      const meu = ++seq.current
      setCarregando(true)
      try {
        const url =
          "/api/whatsapp/conversas?busca=" + encodeURIComponent(q) + (monitoradas ? "&monitoradas=1" : "")
        const r = await fetch(url, { cache: "no-store" })
        if (!r.ok) throw new Error("falha")
        const dados = (await r.json()) as { conversas: ConversaView[]; sugeridas: number; naFila: number }
        if (meu === seq.current) {
          setConversas(dados.conversas)
          setSugeridas(dados.sugeridas)
          setNaFila(dados.naFila)
        }
      } catch {
        if (meu === seq.current) toast("Não foi possível carregar as conversas")
      } finally {
        if (meu === seq.current) setCarregando(false)
      }
    },
    [],
  )

  // Busca com respiro: digitar não dispara uma consulta por tecla.
  useEffect(() => {
    const t = setTimeout(() => void recarregar(busca, soMonitoradas), busca ? 300 : 0)
    return () => clearTimeout(t)
  }, [busca, soMonitoradas, recarregar])

  // Enquanto a fila anda, a página se atualiza sozinha. Quem trabalha é o
  // worker, em segundo plano: sem isto o usuário ficaria olhando um número
  // parado, sem saber se alguma coisa está acontecendo.
  useEffect(() => {
    if (naFila === 0) return
    const t = setInterval(() => void recarregar(busca, soMonitoradas), 10_000)
    return () => clearInterval(t)
  }, [naFila, busca, soMonitoradas, recarregar])

  const abrir = useCallback(async (c: ConversaView) => {
    if (abertaId === c.id) {
      setAbertaId(null)
      setLeitura(null)
      return
    }
    setAbertaId(c.id)
    setLeitura(null)
    setLendo(true)
    try {
      const r = await fetch("/api/whatsapp/conversas/" + c.id, { cache: "no-store" })
      if (!r.ok) throw new Error("falha")
      setLeitura((await r.json()) as LeituraConversa)
    } catch {
      toast("Não foi possível abrir a conversa")
      setAbertaId(null)
    } finally {
      setLendo(false)
    }
  }, [abertaId])

  /** Aplica no lugar a conversa que o servidor devolveu (sem recarregar a lista). */
  const aplicar = (v: ConversaView | null) => {
    if (!v) return
    // A faixa de sugestões conta o conjunto inteiro; manter o número em dia
    // aqui evita uma recarga da lista a cada clique.
    const antes = conversas.find((c) => c.id === v.id)
    if (antes && antes.sugerida !== v.sugerida) setSugeridas((n) => Math.max(0, n + (v.sugerida ? 1 : -1)))
    setConversas((atual) => atual.map((c) => (c.id === v.id ? v : c)))
    setLeitura((l) => (l && l.conversa.id === v.id ? { ...l, conversa: v } : l))
  }

  const patch = async (id: number, corpo: { monitorar?: boolean; clienteId?: number | null }) => {
    setOcupadoId(id)
    try {
      const r = await apiSend<{ ok: boolean; result: { conversa: ConversaView | null; enfileirado: boolean } }>(
        "/api/whatsapp/conversas/" + id,
        "PATCH",
        corpo,
      )
      aplicar(r.result.conversa)
      return r.result
    } catch {
      return null
    } finally {
      setOcupadoId(null)
    }
  }

  const alternarMonitorar = async (c: ConversaView) => {
    const r = await patch(c.id, { monitorar: !c.monitorar })
    const v = r?.conversa
    if (!v) return
    if (!v.monitorar && c.gravadas > 0) {
      // Desligar não apaga sozinho — o usuário decide (minimização é regra do
      // módulo, mas apagar conversa é irreversível).
      setApagarId(c.id)
      return
    }
    if (!v.monitorar) {
      toast("Esta conversa não será mais gravada")
      return
    }
    if (!r.enfileirado) {
      toast("Esta conversa passa a ser gravada")
      return
    }
    // O pedido está na fila do worker; as mensagens chegam por ele, não por
    // esta resposta. A faixa de progresso cuida de atualizar a lista sozinha.
    toast("Esta conversa passa a ser gravada — buscando as mensagens anteriores…")
    setNaFila((n) => n + 1)
  }

  const ligarSugeridas = async () => {
    setLigandoSugeridas(true)
    try {
      const r = await apiSend<{ ok: boolean; result: { ligadas: number; enfileiradas: number } }>(
        "/api/whatsapp/conversas/sugeridas",
        "POST",
      )
      const { ligadas, enfileiradas } = r.result
      toast(
        ligadas === 0
          ? "Nenhuma conversa nova para gravar"
          : ligadas +
              " conversa(s) passam a ser gravadas" +
              (enfileiradas > 0 ? " — buscando o passado de " + enfileiradas + " delas" : ""),
      )
      await recarregar(busca, soMonitoradas)
    } catch {
      /* o apiSend já avisou */
    } finally {
      setLigandoSugeridas(false)
    }
  }

  const buscarHistorico = async (c: ConversaView) => {
    setOcupadoId(c.id)
    try {
      await apiSend<{ ok: boolean; result: { pedido: true } }>(
        "/api/whatsapp/conversas/" + c.id + "/historico",
        "POST",
      )
      toast("Pedido enviado ao WhatsApp. As mensagens antigas aparecem em instantes.")
      // A resposta chega pelo worker, não por esta requisição: recarrega depois
      // de um respiro para a contagem já refletir o que entrou.
      setTimeout(() => void recarregar(busca, soMonitoradas), 6000)
    } catch {
      /* o apiSend já avisou */
    } finally {
      setOcupadoId(null)
    }
  }

  const apagarGravadas = async (id: number) => {
    setOcupadoId(id)
    try {
      const r = await apiSend<{ ok: boolean; result: { apagadas: number } }>(
        "/api/whatsapp/conversas/" + id + "/mensagens",
        "DELETE",
      )
      toast(r.result.apagadas + " mensagem(ns) apagada(s)")
      setApagarId(null)
      setConversas((atual) => atual.map((c) => (c.id === id ? { ...c, gravadas: 0 } : c)))
      if (abertaId === id) setLeitura((l) => (l ? { ...l, mensagens: [] } : l))
    } finally {
      setOcupadoId(null)
    }
  }

  // A lista de contatos é carregada só quando alguém abre o seletor: são
  // centenas de nomes que não precisam viajar com a página.
  const abrirPicker = async (id: number) => {
    setPickerId(id)
    if (clientes) return
    setClientesErro(false)
    try {
      const r = await fetch("/api/clientes?options=1", { cache: "no-store" })
      if (!r.ok) throw new Error("falha")
      setClientes((await r.json()) as ClienteOpt[])
    } catch {
      setClientesErro(true)
    }
  }

  const conectado = sessao.status === "conectado"
  const monitoradas = conversas.filter((c) => c.monitorar).length

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 64px", display: "grid", gap: 16 }}>
      <header style={{ display: "grid", gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="messageCircle" size={18} /> Conversas do WhatsApp
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          O Lexia guarda <strong>somente</strong> as conversas que você marcar aqui, e só você as vê. Vincular a
          conversa a um contato é o que deixa o restante do sistema (e a LexIA) saber de quem ela é.
        </p>
      </header>

      {!conectado && (
        <Faixa>
          <Icon name="alertTriangle" size={14} />
          <span>
            Seu WhatsApp não está conectado, então nada novo está entrando.{" "}
            <a href="/whatsapp/conectar" style={{ color: "var(--accent-strong)" }}>
              Abrir a página de conexão
            </a>
            .
          </span>
        </Faixa>
      )}
      {conectado && !sessao.workerOnline && (
        <Faixa>
          <Icon name="alertTriangle" size={14} />
          <span>O serviço de conexão não está respondendo — mensagens novas podem não estar sendo gravadas.</span>
        </Faixa>
      )}

      {sugeridas > 0 && (
        <Faixa>
          <Icon name="briefcase" size={14} />
          <span style={{ flex: 1 }}>
            <strong>{sugeridas}</strong> conversa(s) de contatos com <strong>caso ativo</strong> ainda não estão
            sendo gravadas.
          </span>
          <button type="button" style={botaoSec} disabled={ligandoSugeridas} onClick={() => void ligarSugeridas()}>
            {ligandoSugeridas ? "Ligando…" : "Gravar essas " + sugeridas}
          </button>
        </Faixa>
      )}

      {naFila > 0 && (
        <Faixa>
          <Icon name="clock" size={14} />
          <span style={{ flex: 1 }}>
            Buscando as mensagens anteriores de <strong>{naFila}</strong> conversa(s) — uma de cada vez, em
            segundo plano. Pode fechar esta página; o que chegar fica gravado.
            {!conectado && " Começa quando o WhatsApp reconectar."}
          </span>
        </Faixa>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <span style={{ position: "absolute", left: 10, top: 9, color: "var(--text-subtle)" }}>
            <Icon name="search" size={14} />
          </span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, número ou contato"
            aria-label="Buscar conversas"
            style={{ ...campo, paddingLeft: 30, width: "100%" }}
          />
        </div>
        <button
          type="button"
          onClick={() => setSoMonitoradas((v) => !v)}
          aria-pressed={soMonitoradas}
          style={soMonitoradas ? { ...botaoSec, borderColor: "var(--accent-strong)", color: "var(--accent-strong)" } : botaoSec}
        >
          Só monitoradas
        </button>
        <button type="button" style={botaoSec} disabled={carregando} onClick={() => void recarregar(busca, soMonitoradas)}>
          <Icon name="refreshCw" size={13} /> Atualizar
        </button>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: "var(--text-subtle)" }}>
        {conversas.length} conversa(s) · {monitoradas} sendo gravada(s)
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        {conversas.length === 0 && (
          <div style={{ ...cartao, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {busca
              ? "Nenhuma conversa encontrada."
              : conectado
                ? "Nenhuma conversa ainda. Elas aparecem conforme o WhatsApp sincroniza com o Lexia."
                : "Conecte o WhatsApp para ver suas conversas."}
          </div>
        )}

        {conversas.map((c) => (
          <section key={c.id} style={cartao}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 240px", minWidth: 200, display: "grid", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 14, fontWeight: 500 }}>{c.nome}</strong>
                  {c.grupo && <Etiqueta>grupo</Etiqueta>}
                  {c.monitorar && (
                    <Etiqueta tom="ok">
                      <Icon name="check" size={11} /> gravando
                    </Etiqueta>
                  )}
                  {c.sugerida && <Etiqueta>caso ativo</Etiqueta>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-subtle)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {c.telefoneFmt && <span style={{ fontVariantNumeric: "tabular-nums" }}>{c.telefoneFmt}</span>}
                  {c.ultimaMensagemEm && <span>última em {dataBr(c.ultimaMensagemEm)}</span>}
                  {c.gravadas > 0 && <span>{c.gravadas} gravada(s)</span>}
                </div>
                <Vinculo
                  conversa={c}
                  ocupado={ocupadoId === c.id}
                  onConfirmar={() => void patch(c.id, { clienteId: c.clienteId })}
                  onRemover={() => void patch(c.id, { clienteId: null })}
                  onEscolher={() => void abrirPicker(c.id)}
                />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  style={botaoSec}
                  onClick={() => void abrir(c)}
                  aria-expanded={abertaId === c.id}
                  disabled={c.gravadas === 0 && abertaId !== c.id}
                  title={c.gravadas === 0 ? "Nenhuma mensagem gravada desta conversa" : "Ver as mensagens gravadas"}
                >
                  <Icon name="eye" size={13} /> {abertaId === c.id ? "Fechar" : "Mensagens"}
                </button>
                {c.monitorar && c.naFila && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: "var(--text-subtle)",
                    }}
                    title="Esta conversa está na fila: o pedido sai em instantes e as mensagens chegam depois."
                  >
                    <Icon name="clock" size={13} /> Buscando anteriores…
                  </span>
                )}
                {c.monitorar && !c.naFila && c.podeHistorico && (
                  <button
                    type="button"
                    style={botaoSec}
                    disabled={ocupadoId === c.id}
                    onClick={() => void buscarHistorico(c)}
                    title={
                      "Pedir ao WhatsApp as mensagens anteriores a " +
                      (c.historicoDesde ? dataBr(c.historicoDesde) : "as que já temos")
                    }
                  >
                    <Icon name="clock" size={13} /> Anteriores
                  </button>
                )}
                <Interruptor
                  ligado={c.monitorar}
                  ocupado={ocupadoId === c.id}
                  rotulo={"Monitorar a conversa " + (c.nome ?? "")}
                  onChange={() => void alternarMonitorar(c)}
                />
              </div>
            </div>

            {c.monitorar && c.monitoradoEm && (
              <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "var(--text-subtle)" }}>
                Gravando desde {dataBr(c.monitoradoEm)}.{" "}
                {c.podeHistorico
                  ? "Para o que veio antes, use “Anteriores” — o WhatsApp entrega o que o aparelho ainda tiver."
                  : "Mensagens anteriores a isso não ficaram guardadas."}
              </p>
            )}

            {abertaId === c.id && (
              <Mensagens lendo={lendo} mensagens={leitura?.mensagens ?? []} />
            )}
          </section>
        ))}
      </div>

      {pickerId != null && (
        <Picker
          clientes={clientes}
          erro={clientesErro}
          onFechar={() => setPickerId(null)}
          onTentarDeNovo={() => void abrirPicker(pickerId)}
          onEscolher={(clienteId) => {
            const id = pickerId
            setPickerId(null)
            void patch(id, { clienteId })
          }}
        />
      )}

      {apagarId != null && (
        <Modal titulo="Apagar as mensagens já gravadas?">
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)" }}>
            Esta conversa não será mais gravada. O que já foi guardado dela (mensagens e arquivos) continua no Lexia até
            você apagar. Apagar é <strong>irreversível</strong> e não há como recuperar o histórico depois.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" style={botaoSec} onClick={() => setApagarId(null)}>
              Manter o histórico
            </button>
            <button
              type="button"
              style={{ ...botao, background: "var(--crit, #B3261E)" }}
              disabled={ocupadoId === apagarId}
              onClick={() => void apagarGravadas(apagarId)}
            >
              <Icon name="trash2" size={13} /> Apagar tudo desta conversa
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Peças ───────────────────────────────────────────────────────────────────

function Vinculo({
  conversa,
  ocupado,
  onConfirmar,
  onRemover,
  onEscolher,
}: {
  conversa: ConversaView
  ocupado: boolean
  onConfirmar: () => void
  onRemover: () => void
  onEscolher: () => void
}) {
  const sugerido = conversa.vinculo === "sugerido"
  if (conversa.grupo && !conversa.clienteId) {
    return (
      <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>
        Grupos não são vinculados automaticamente ·{" "}
        <button type="button" style={linkBtn} disabled={ocupado} onClick={onEscolher}>
          vincular a um contato
        </button>
      </span>
    )
  }
  if (!conversa.clienteId) {
    return (
      <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>
        Sem contato vinculado ·{" "}
        <button type="button" style={linkBtn} disabled={ocupado} onClick={onEscolher}>
          vincular
        </button>
      </span>
    )
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
      <a
        href={"/contatos/" + conversa.clienteId}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "2px 8px",
          borderRadius: 6,
          border: "1px solid " + (sugerido ? "var(--border-gold, var(--accent-strong))" : "var(--border-strong)"),
          background: sugerido ? "var(--accent-soft, var(--bg-sunken))" : "transparent",
          color: "var(--text)",
          textDecoration: "none",
        }}
      >
        <Icon name="link2" size={11} /> {conversa.clienteNome}
      </a>
      {sugerido && (
        <>
          <span style={{ color: "var(--text-subtle)" }}>sugerido pelo telefone —</span>
          <button type="button" style={linkBtn} disabled={ocupado} onClick={onConfirmar}>
            confirmar
          </button>
        </>
      )}
      <button type="button" style={linkBtn} disabled={ocupado} onClick={onEscolher}>
        trocar
      </button>
      <button type="button" style={linkBtn} disabled={ocupado} onClick={onRemover}>
        remover
      </button>
    </div>
  )
}

function Mensagens({ lendo, mensagens }: { lendo: boolean; mensagens: MensagemView[] }) {
  return (
    <div
      style={{
        marginTop: 12,
        borderTop: "1px solid var(--border)",
        paddingTop: 12,
        maxHeight: 420,
        overflowY: "auto",
        display: "grid",
        gap: 8,
      }}
    >
      {lendo && <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>Carregando…</span>}
      {!lendo && mensagens.length === 0 && (
        <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>Nenhuma mensagem gravada desta conversa.</span>
      )}
      {mensagens.map((m) => (
        <div
          key={m.id}
          style={{
            justifySelf: m.deMim ? "end" : "start",
            maxWidth: "80%",
            padding: "7px 10px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: m.deMim ? "var(--accent-soft, var(--bg-sunken))" : "var(--bg-sunken)",
            fontSize: 13,
          }}
        >
          {m.autorNome && !m.deMim && (
            <div style={{ fontSize: 11, color: "var(--text-subtle)", marginBottom: 2 }}>{m.autorNome}</div>
          )}
          {m.texto && <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.texto}</div>}
          {m.midia && (
            <div style={{ marginTop: m.texto ? 6 : 0, fontSize: 12 }}>
              {m.midia.url ? (
                <a
                  href={m.midia.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--accent-strong)", display: "inline-flex", gap: 5, alignItems: "center" }}
                >
                  <Icon name="paperclip" size={12} /> {m.midia.nome ?? m.tipo}
                </a>
              ) : (
                <span style={{ color: "var(--text-subtle)", display: "inline-flex", gap: 5, alignItems: "center" }}>
                  <Icon name="paperclip" size={12} /> {m.midia.nome ?? m.tipo} — arquivo não guardado
                </span>
              )}
              {m.midia.tamanho ? (
                <span style={{ color: "var(--text-subtle)" }}> · {tamanhoBr(m.midia.tamanho)}</span>
              ) : null}
            </div>
          )}
          <div style={{ marginTop: 4, fontSize: 10.5, color: "var(--text-subtle)", textAlign: "right" }}>
            {dataBr(m.enviadaEm)}
            {m.tratadaEm ? " · triada" : ""}
          </div>
        </div>
      ))}
    </div>
  )
}

function Picker({
  clientes,
  erro,
  onFechar,
  onEscolher,
  onTentarDeNovo,
}: {
  clientes: ClienteOpt[] | null
  erro: boolean
  onFechar: () => void
  onEscolher: (id: number) => void
  onTentarDeNovo: () => void
}) {
  const [q, setQ] = useState("")
  const filtrados = (clientes ?? [])
    .filter((c) => !q.trim() || c.nome.toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 60)
  return (
    <Modal titulo="Vincular a um contato">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar contato"
        aria-label="Buscar contato"
        autoFocus
        style={{ ...campo, width: "100%", marginBottom: 10 }}
      />
      <div style={{ maxHeight: 300, overflowY: "auto", display: "grid", gap: 2 }}>
        {erro && (
          <div style={{ fontSize: 13, color: "var(--text-muted)", display: "grid", gap: 8, justifyItems: "start" }}>
            Não foi possível carregar os contatos.
            <button type="button" style={botaoSec} onClick={onTentarDeNovo}>
              Tentar de novo
            </button>
          </div>
        )}
        {!erro && clientes === null && (
          <span style={{ fontSize: 13, color: "var(--text-subtle)" }}>Carregando contatos…</span>
        )}
        {clientes !== null &&
          filtrados.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onEscolher(c.id)}
              style={{
                appearance: "none",
                textAlign: "left",
                border: "1px solid transparent",
                borderRadius: 8,
                background: "transparent",
                color: "var(--text)",
                fontSize: 13,
                padding: "7px 9px",
                cursor: "pointer",
              }}
            >
              {c.nome}
            </button>
          ))}
        {clientes !== null && !erro && filtrados.length === 0 && (
          <span style={{ fontSize: 13, color: "var(--text-subtle)" }}>Nenhum contato encontrado.</span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button type="button" style={botaoSec} onClick={onFechar}>
          Cancelar
        </button>
      </div>
    </Modal>
  )
}

function Modal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label={titulo}>
      <div style={{ ...cartao, maxWidth: 460, width: "100%", background: "var(--bg-elevated)" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 500 }}>{titulo}</h2>
        {children}
      </div>
    </div>
  )
}

function Interruptor({
  ligado,
  ocupado,
  rotulo,
  onChange,
}: {
  ligado: boolean
  ocupado: boolean
  rotulo: string
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={ocupado}
      onClick={onChange}
      style={{
        appearance: "none",
        width: 42,
        height: 24,
        borderRadius: 999,
        border: "1px solid " + (ligado ? "var(--accent-strong)" : "var(--border-strong)"),
        background: ligado ? "var(--accent-strong)" : "var(--bg-sunken)",
        position: "relative",
        cursor: ocupado ? "default" : "pointer",
        opacity: ocupado ? 0.6 : 1,
        flexShrink: 0,
        transition: "background .15s ease",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 2,
          left: ligado ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: ligado ? "#fff" : "var(--text-subtle)",
          transition: "left .15s ease",
        }}
      />
    </button>
  )
}

function Etiqueta({ children, tom }: { children: React.ReactNode; tom?: "ok" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 11,
        padding: "2px 7px",
        borderRadius: 6,
        border: "1px solid " + (tom === "ok" ? "var(--ok, #2E7D53)" : "var(--border-strong)"),
        color: tom === "ok" ? "var(--ok, #2E7D53)" : "var(--text-muted)",
      }}
    >
      {children}
    </span>
  )
}

function Faixa({ children }: { children: React.ReactNode }) {
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
    >
      {children}
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
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
}

const botaoSec: React.CSSProperties = {
  appearance: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text)",
  fontSize: 13,
  fontWeight: 500,
  padding: "8px 12px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
}

const linkBtn: React.CSSProperties = {
  appearance: "none",
  border: "none",
  background: "none",
  padding: 0,
  font: "inherit",
  color: "var(--accent-strong)",
  cursor: "pointer",
  textDecoration: "underline",
}

const campo: React.CSSProperties = {
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

function dataBr(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })
}

function tamanhoBr(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB"
}
