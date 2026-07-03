"use client"

// Sino do topbar → Notification Center em vidro fosco (acrílico). Lê o store
// COMPARTILHADO (useNotificacoes), alimentado em tempo real pelo SSE — badge e
// lista atualizam ao vivo. Cabeçalho + abas (Todas / Não lidas) + linhas estilo
// Apple (tile + mensagem + módulo·tempo) + rodapé "Ver todas". Marca lida ao abrir.
import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Icon } from "@/components/crm/crm-icons"
import { apiSend } from "@/lib/client/api"
import { linkParaNotificacao } from "@/lib/notificacoes/links"
import { useNotificacoes } from "@/lib/notificacoes/store"
import type { NotificacaoRow } from "@/lib/notificacoes/types"
import { NotifRowContent } from "./NotifRow"
import { lexGlassStrong } from "@/styles/glass.css"
import { glassElevation } from "@/styles/glass"

const POP_CSS = `
.notif-pop-list { scrollbar-width: thin; }
.notif-pop-list::-webkit-scrollbar { width: 8px; }
.notif-pop-list::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 999px; }
.notif-pop-item { transition: background .12s; }
.notif-pop-item[data-highlighted] { background: var(--surface-hover); outline: none; }
`

export function NotificacoesBell() {
  const router = useRouter()
  const items = useNotificacoes((s) => s.items)
  const naoLidas = useNotificacoes((s) => s.naoLidas)
  const [tab, setTab] = useState<"todas" | "nao">("todas")

  // Re-sincroniza ao abrir o menu (defesa extra além do push do SSE).
  const refresh = useCallback(() => {
    apiSend<NotificacaoRow[]>("/api/notificacoes", "GET")
      .then((rows) => {
        if (Array.isArray(rows)) useNotificacoes.getState().setAll(rows)
      })
      .catch(() => {})
  }, [])

  const shown = useMemo(() => (tab === "nao" ? items.filter((n) => !n.lida) : items).slice(0, 8), [items, tab])

  const abrir = (n: NotificacaoRow) => {
    if (!n.lida) {
      useNotificacoes.getState().markRead(n.id)
      apiSend(`/api/notificacoes/${n.id}/lida`, "POST").catch(() => {})
    }
    const href = n.link ?? linkParaNotificacao(n.modulo, n.refTipo, n.refId)
    if (href) router.push(href)
  }

  const marcarTodas = () => {
    useNotificacoes.getState().markAllRead()
    apiSend("/api/notificacoes/marcar-todas", "POST").catch(() => {})
  }

  return (
    <DropdownMenu.Root onOpenChange={(o) => o && refresh()}>
      <DropdownMenu.Trigger asChild>
        <button
          title="Notificações"
          style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Icon name="bell" size={16} />
          {naoLidas > 0 && (
            <span style={{ position: "absolute", top: 3, right: 3, minWidth: 14, height: 14, padding: "0 3px", borderRadius: 999, background: "var(--brand-gold)", color: "#1a1407", fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={`crm-scope ${lexGlassStrong}`}
          style={{ width: 384, maxWidth: "calc(100vw - 24px)", borderRadius: 14, padding: 0, zIndex: 1250, ...glassElevation("0 16px 40px rgba(2,13,37,0.20)") }}
        >
          <style>{POP_CSS}</style>

          {/* cabeçalho */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px 11px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>Notificações</div>
              <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 1 }}>
                {naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? "s" : ""}` : "Tudo em dia"}
              </div>
            </div>
            <button
              onClick={marcarTodas}
              disabled={!naoLidas}
              title="Marcar todas como lidas"
              style={{ display: "flex", alignItems: "center", gap: 6, height: 28, padding: "0 9px", borderRadius: 7, border: "none", background: "transparent", cursor: naoLidas ? "pointer" : "default", opacity: naoLidas ? 1 : 0.4, fontSize: 12, fontWeight: 500, color: "var(--accent)" }}
            >
              <Icon name="checkCircle" size={14} /> Marcar lidas
            </button>
          </div>

          {/* abas */}
          <div style={{ display: "flex", gap: 6, padding: "0 14px 10px" }}>
            {([{ id: "todas", label: "Todas" }, { id: "nao", label: `Não lidas${naoLidas ? ` · ${naoLidas}` : ""}` }] as const).map((t) => {
              const ativo = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{ height: 28, padding: "0 11px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 500, letterSpacing: "-0.01em", border: "1px solid " + (ativo ? "transparent" : "var(--border)"), background: ativo ? "var(--accent-soft)" : "transparent", color: ativo ? "var(--accent)" : "var(--text-muted)" }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          <div style={{ height: 1, background: "var(--border)" }} />

          {/* lista */}
          <div className="notif-pop-list" style={{ maxHeight: 408, overflowY: "auto", padding: "6px 8px" }}>
            {shown.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, margin: "0 auto 12px", background: "var(--bg-sunken)", color: "var(--text-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="checkCircle" size={19} />
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {tab === "nao" ? "Nenhuma notificação não lida." : "Nenhuma notificação."}
                </div>
              </div>
            ) : (
              shown.map((n) => (
                <DropdownMenu.Item key={n.id} asChild onSelect={() => abrir(n)}>
                  <div
                    className="notif-pop-item"
                    style={{ display: "flex", gap: 12, padding: "11px 12px", borderRadius: 10, cursor: "pointer", alignItems: "flex-start", position: "relative" }}
                  >
                    <NotifRowContent n={n} />
                  </div>
                </DropdownMenu.Item>
              ))
            )}
          </div>

          <div style={{ height: 1, background: "var(--border)" }} />

          {/* rodapé */}
          <DropdownMenu.Item
            className="notif-pop-item"
            onSelect={() => router.push("/notificacoes")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", cursor: "pointer", outline: "none", fontSize: 12.5, fontWeight: 600, color: "var(--accent)" }}
          >
            Ver todas as notificações <Icon name="arrowRight" size={14} />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
