"use client"

// Popups de notificação no canto SUPERIOR DIREITO, estilo Apple, com fundo
// acrílico (alimentados por NotificacoesStream). Cada card: tile do módulo +
// rótulo/tempo + mensagem; clicar abre o deep-link (+ marca lida); ✕ dispensa.
// Entrada SÓ por transform (opacidade fica 1) — aba em segundo plano congela a
// animação no frame 0 e uma entrada por opacidade ficaria invisível. A SAÍDA
// (fade + deslize) é animada pelo AnimatePresence quando o item deixa a fila.
import { AnimatePresence, motion } from "motion/react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/crm/crm-icons"
import { apiSend } from "@/lib/client/api"
import { useNotificacoes } from "@/lib/notificacoes/store"
import { useNotificacoesToasts } from "@/lib/notificacoes/toast-store"
import type { NotificacaoRow } from "@/lib/notificacoes/types"
import { rotuloModulo, tempoRelativo } from "./notif-ui"
import { NotifTile } from "./NotifTile"

function marcarLida(n: NotificacaoRow) {
  if (n.lida) return
  useNotificacoes.getState().markRead(n.id)
  apiSend(`/api/notificacoes/${n.id}/lida`, "POST").catch(() => {})
}

export function NotificacoesToasts() {
  const router = useRouter()
  const items = useNotificacoesToasts((s) => s.items)
  const dismiss = useNotificacoesToasts((s) => s.dismiss)

  return (
    <div
      style={{
        position: "fixed",
        top: 64,
        right: 16,
        zIndex: 1600,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: 360,
        maxWidth: "calc(100vw - 32px)",
        pointerEvents: "none",
      }}
    >
      <AnimatePresence initial={false}>
        {items.map(({ key, notif: n }) => {
          const abrir = () => {
            marcarLida(n)
            dismiss(key)
            if (n.link) router.push(n.link)
          }
          return (
            <motion.div
              key={key}
              layout
              initial={{ opacity: 1, y: -18, scale: 0.965 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.26 }}
              whileHover={{ scale: 1.015 }}
              onClick={abrir}
              style={{
                pointerEvents: "auto",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: 13,
                borderRadius: 14,
                cursor: "pointer",
                background: "var(--lex-acrylic-strong)",
                backdropFilter: "var(--lex-blur)",
                WebkitBackdropFilter: "var(--lex-blur)",
                border: "1px solid var(--lex-acrylic-border)",
                boxShadow: "var(--lex-glass-shadow), 0 16px 40px rgba(2,13,37,0.20), inset 0 1px 0 rgba(255,255,255,0.16)",
                color: "var(--text)",
              }}
            >
              <NotifTile modulo={n.modulo} tipo={n.tipo} prioridade={n.prioridade} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 10.5,
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "var(--text-subtle)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {rotuloModulo(n.modulo)}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-subtle)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                    {tempoRelativo(n.createdAt)}
                  </span>
                  {/* ✕ na MESMA linha do tempo → centra verticalmente com o "agora" */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      dismiss(key)
                    }}
                    aria-label="Dispensar"
                    title="Dispensar"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      color: "var(--text-subtle)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginRight: -4,
                    }}
                  >
                    <Icon name="x" size={13} />
                  </button>
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: "var(--text)",
                    letterSpacing: "-0.01em",
                    marginTop: 3,
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {n.mensagem}
                  {n.contador > 1 ? ` (${n.contador})` : ""}
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
