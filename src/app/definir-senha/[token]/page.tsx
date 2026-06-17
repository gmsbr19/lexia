import type { Metadata } from "next"
import { DefinirSenhaForm } from "@/components/auth/DefinirSenhaForm"
import { validarConvite } from "@/lib/users/convite"
import * as css from "@/components/auth/login.css"

export const metadata: Metadata = { title: "Configurar acesso — LexIA" }
export const dynamic = "force-dynamic"

export default async function DefinirSenhaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const convite = await validarConvite(token)

  if (!convite) {
    return (
      <div className={css.page}>
        <div className={css.card}>
          <div className={css.brand}>
            <span className={css.brandMark}>L</span>
            <div>
              <div className={css.brandTitle}>LexIA</div>
              <div className={css.brandSubtitle}>Configurar acesso</div>
            </div>
          </div>
          <div className={css.errorBox}>
            Link inválido ou expirado. Peça ao administrador do escritório para reenviar o seu convite de acesso.
          </div>
        </div>
      </div>
    )
  }

  return <DefinirSenhaForm token={token} nome={convite.nome} email={convite.email} />
}
