import Link from "next/link"
import { Plus } from "lucide-react"
import { pageShell, tabPanel, scrollArea, pageFrame } from "@/components/documents/page/documents-page.css"
import { btn } from "@/styles/components.css"
import { auth } from "@/lib/auth"
import type { Role } from "@/lib/auth/session"
import { verFinanceiro } from "@/lib/users/types"
import { getBriefingDiario } from "@/lib/finance/briefing-ai"
import { getDashboard } from "@/lib/inicio/dashboard"
import { BriefingCard } from "./BriefingCard"
import { OfficeDashboard } from "./OfficeDashboard"
import * as s from "./InicioPage.css"

const TZ = "America/Sao_Paulo"

function greetingParts(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: TZ }).format(now))
  const saudacao = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: TZ }).format(now).replace("-feira", "")
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: TZ }).format(now)
  return { saudacao, data: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayMonth}` }
}

export async function InicioPage() {
  const session = await auth()
  const verFin = verFinanceiro((session?.user?.role as Role) ?? "socio")
  const [briefing, dashboard] = await Promise.all([getBriefingDiario(verFin), getDashboard(verFin)])

  const firstName = session?.user?.name?.split(" ")[0]
  const { saudacao, data } = greetingParts()

  return (
    <>
      <div className={pageShell}>
        <div className={tabPanel}>
          <div className={scrollArea}>
            <div className={`${pageFrame} ${s.pad}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div className={s.greeting}>
                  <h1 className={s.greetingTitle}>
                    {saudacao}
                    {firstName ? `, ${firstName}` : ""}
                  </h1>
                  <p className={s.greetingSub}>{data} · aqui está o panorama do escritório.</p>
                </div>
                <Link href="/documents" className={`${btn({ variant: "secondary" })} ${s.actionBtn}`}>
                  <Plus size={15} />
                  Novo documento
                </Link>
              </div>

              <BriefingCard data={briefing} verFin={verFin} />

              <OfficeDashboard data={dashboard} verFin={verFin} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
