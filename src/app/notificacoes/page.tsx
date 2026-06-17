import { NotificacoesHistory } from "@/components/notificacoes/NotificacoesHistory"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Histórico completo de notificações do usuário (auth via proxy + shell). O
// componente client busca /api/notificacoes/history (paginado + filtros).
export default function Page() {
  return <NotificacoesHistory />
}
