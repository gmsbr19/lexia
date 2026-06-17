"use client"

// "App icon" da notificação (estilo Apple): quadrado arredondado com preenchimento
// e ícone na cor do tom semântico. Usado no sino, nos toasts e na página.
import { Icon } from "@/components/crm/crm-icons"
import type { Modulo, Prioridade } from "@/lib/notificacoes/types"
import { coresTom, iconeNotificacao, type Tom, tomNotificacao } from "./notif-ui"

export function NotifTile({
  modulo,
  tipo,
  prioridade,
  size = 38,
  tom,
}: {
  modulo: Modulo | null
  tipo: string
  prioridade: Prioridade
  size?: number
  tom?: Tom
}) {
  const t = tom ?? tomNotificacao({ modulo, tipo, prioridade })
  const c = coresTom(t)
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        flexShrink: 0,
        background: c.bg,
        color: c.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={iconeNotificacao(modulo, tipo)} size={Math.round(size * 0.46)} strokeWidth={1.85} />
    </div>
  )
}
