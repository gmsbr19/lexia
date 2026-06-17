import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import * as s from "./AlertBanner.css"

export function AlertBanner({
  tone = "vencido",
  title,
  children,
  action,
}: {
  tone?: "vencido" | "alerta"
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={s.banner({ tone })}>
      <span className={s.iconWrap({ tone })}>
        <AlertTriangle size={18} strokeWidth={1.9} />
      </span>
      <div className={s.body}>
        <div className={s.title}>{title}</div>
        {children && <div className={s.desc}>{children}</div>}
      </div>
      {action}
    </div>
  )
}
