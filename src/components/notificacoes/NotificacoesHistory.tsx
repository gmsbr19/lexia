"use client"

// Página /notificações — notificações de todos os módulos, estilo Apple. Filtros
// por módulo (chips com ícone) + "Só não lidas", agrupadas por período (Hoje /
// Ontem / Anteriores) em cards, com tile por linha, dispensar (saída animada) e
// "marcar todas". Mantém o badge do sino em sincronia (store compartilhado) e
// pagina o servidor ("Carregar mais"). Estilo inline com design tokens.
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { type CrmIconName, Icon } from "@/components/crm/crm-icons"
import { CrmPageHead } from "@/components/crm/crm-kit"
import { NotifRow } from "@/components/shell/NotifRow"
import { bucketTempo, iconeNotificacao } from "@/components/shell/notif-ui"
import { apiSend } from "@/lib/client/api"
import type { Paginated } from "@/lib/list"
import { useNotificacoes } from "@/lib/notificacoes/store"
import { type Modulo, MODULO_LABEL, MODULOS, type NotificacaoRow } from "@/lib/notificacoes/types"

const PAGE_SIZE = 30
const BUCKETS = ["Hoje", "Ontem", "Anteriores"] as const

const GROUP_CSS = `
.notif-group > [data-notif-row]:not(:first-child) { border-top: 1px solid var(--border); }
`

export function NotificacoesHistory() {
  const router = useRouter()
  const [modulo, setModulo] = useState<Modulo | "">("")
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [items, setItems] = useState<NotificacaoRow[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const naoLidas = useNotificacoes((s) => s.naoLidas)

  const fetchPage = useCallback(
    async (p: number, replace: boolean) => {
      setLoading(true)
      const qs = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) })
      if (modulo) qs.set("modulo", modulo)
      if (onlyUnread) qs.set("lida", "0")
      try {
        const res = await apiSend<Paginated<NotificacaoRow>>(`/api/notificacoes/history?${qs}`, "GET")
        setTotal(res.total)
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]))
      } catch {
        /* apiSend já tratou */
      } finally {
        setLoading(false)
      }
    },
    [modulo, onlyUnread],
  )

  // Recarrega do zero quando um filtro muda.
  useEffect(() => {
    setPage(1)
    void fetchPage(1, true)
  }, [fetchPage])

  const marcarUmaLida = (n: NotificacaoRow) => {
    if (n.lida) return
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)))
    useNotificacoes.getState().markRead(n.id)
    apiSend(`/api/notificacoes/${n.id}/lida`, "POST").catch(() => {})
  }

  const abrir = (n: NotificacaoRow) => {
    marcarUmaLida(n)
    if (n.link) router.push(n.link)
  }

  // Dispensar = marca lida + sai da lista (saída animada). Itens já lidos só somem
  // da visão atual (voltam ao recarregar) — sem exclusão persistente, como no protótipo.
  const dispensar = (n: NotificacaoRow) => {
    marcarUmaLida(n)
    setItems((prev) => prev.filter((x) => x.id !== n.id))
    setTotal((t) => Math.max(0, t - 1))
  }

  const marcarTodas = () => {
    setItems((prev) => prev.map((x) => ({ ...x, lida: true })))
    useNotificacoes.getState().markAllRead()
    apiSend("/api/notificacoes/marcar-todas", "POST")
      .then(() => fetchPage(1, true))
      .catch(() => {})
    setPage(1)
  }

  const grouped = useMemo(
    () => BUCKETS.map((b) => ({ label: b, items: items.filter((n) => bucketTempo(n.createdAt) === b) })).filter((g) => g.items.length),
    [items],
  )

  const temMais = items.length < total

  const chip = (key: string, label: string, ativo: boolean, onClick: () => void, icon?: CrmIconName) => (
    <button
      key={key}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 32,
        padding: "0 12px",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: 12.5,
        fontWeight: 500,
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
        transition: "background .12s, color .12s, border-color .12s",
        border: "1px solid " + (ativo ? "transparent" : "var(--border)"),
        background: ativo ? "var(--accent-soft)" : "transparent",
        color: ativo ? "var(--accent)" : "var(--text-muted)",
      }}
    >
      {icon && <Icon name={icon} size={14} />}
      {label}
    </button>
  )

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 20px 80px" }}>
      <style>{GROUP_CSS}</style>
      <CrmPageHead
        title="Notificações"
        sub={naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? "s" : ""} · todos os módulos do escritório` : "Tudo em dia · todos os módulos do escritório"}
        right={
          <button
            onClick={marcarTodas}
            disabled={!naoLidas}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text)", fontSize: 12.5, fontWeight: 500, padding: "0 12px", height: 32, borderRadius: 8, cursor: naoLidas ? "pointer" : "default", opacity: naoLidas ? 1 : 0.45 }}
          >
            <Icon name="checkCircle" size={14} /> Marcar todas como lidas
          </button>
        }
      />

      {/* filtros */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        {chip("todas", "Todas", modulo === "", () => setModulo(""))}
        {MODULOS.map((m) => chip(m, MODULO_LABEL[m], modulo === m, () => setModulo(m), iconeNotificacao(m, "")))}
        <div style={{ width: 1, height: 22, background: "var(--border)", margin: "0 4px" }} />
        {chip("naolidas", "Só não lidas", onlyUnread, () => setOnlyUnread((v) => !v), onlyUnread ? "check" : "filter")}
      </div>

      {/* grupos */}
      {grouped.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "56px 24px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, margin: "0 auto 14px", background: "var(--bg-sunken)", color: "var(--text-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="inbox" size={22} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>{loading ? "Carregando…" : "Nenhuma notificação aqui"}</div>
          {!loading && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 5 }}>Ajuste os filtros para ver outras notificações.</div>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {grouped.map((g) => (
            <div key={g.label}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: 10, paddingLeft: 2 }}>{g.label}</div>
              <div className="notif-group" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 6, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <AnimatePresence initial={false}>
                  {g.items.map((n) => (
                    <motion.div
                      key={n.id}
                      data-notif-row
                      layout
                      exit={{ opacity: 0, x: 24, transition: { duration: 0.18, ease: "easeOut" } }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <NotifRow n={n} onOpen={abrir} onRemove={dispensar} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {temMais && (
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <button
            disabled={loading}
            onClick={() => {
              const next = page + 1
              setPage(next)
              void fetchPage(next, false)
            }}
            style={{ border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontSize: 12.5, fontWeight: 500, padding: "8px 16px", borderRadius: 8, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </div>
  )
}
