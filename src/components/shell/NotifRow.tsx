"use client"

// Linha de notificação no estilo Apple: tile + mensagem (até 2 linhas) + módulo ·
// tempo + ponto dourado de não-lida. `NotifRowContent` é só o visual (o container
// vem de quem usa: a página, ou um DropdownMenu.Item no sino). `NotifRow` é a
// versão interativa da página (clique abre, hover revela dispensar).
import { useState } from "react"
import { Icon } from "@/components/crm/crm-icons"
import type { NotificacaoRow } from "@/lib/notificacoes/types"
import { rotuloModulo, tempoRelativo } from "./notif-ui"
import { NotifTile } from "./NotifTile"

/** Conteúdo visual da linha. O pai DEVE ter position:relative (o ponto é absoluto). */
export function NotifRowContent({ n, hideDot = false }: { n: NotificacaoRow; hideDot?: boolean }) {
  return (
    <>
      <NotifTile modulo={n.modulo} tipo={n.tipo} prioridade={n.prioridade} size={36} />
      <div style={{ flex: 1, minWidth: 0, paddingRight: 14 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: n.lida ? 500 : 600,
            color: "var(--text)",
            letterSpacing: "-0.01em",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {n.mensagem}
          {n.contador > 1 ? ` (${n.contador})` : ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-subtle)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {rotuloModulo(n.modulo)}
          </span>
          <span style={{ width: 2, height: 2, borderRadius: "50%", background: "var(--text-subtle)", opacity: 0.6 }} />
          <span style={{ fontSize: 11.5, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>
            {tempoRelativo(n.createdAt)}
          </span>
        </div>
      </div>
      {!n.lida && !hideDot && (
        <span
          aria-hidden
          style={{ position: "absolute", top: 14, right: 12, width: 7, height: 7, borderRadius: "50%", background: "var(--brand-gold)", flexShrink: 0 }}
        />
      )}
    </>
  )
}

/** Linha interativa da página /notificações. */
export function NotifRow({
  n,
  onOpen,
  onRemove,
}: {
  n: NotificacaoRow
  onOpen?: (n: NotificacaoRow) => void
  onRemove?: (n: NotificacaoRow) => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={() => onOpen?.(n)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        gap: 12,
        padding: "11px 12px",
        borderRadius: 10,
        cursor: onOpen ? "pointer" : "default",
        alignItems: "flex-start",
        position: "relative",
        background: hover ? "var(--surface-hover)" : "transparent",
        transition: "background .12s",
      }}
    >
      <NotifRowContent n={n} hideDot={!!onRemove && hover} />
      {onRemove && hover && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(n)
          }}
          title="Dispensar"
          aria-label="Dispensar"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "none",
            background: "var(--bg-sunken)",
            color: "var(--text)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="x" size={13} />
        </button>
      )}
    </div>
  )
}
