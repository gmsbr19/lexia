"use client"

// Cliente de tempo real das notificações (não renderiza nada). Abre o SSE
// (/api/notificacoes/stream), aplica cada evento no store compartilhado e dispara
// o popup acrílico no canto superior direito (NotificacoesToasts) + (com a aba em
// segundo plano) a notificação nativa do navegador.
import { useEffect } from "react"
import { apiSend } from "@/lib/client/api"
import { useNotificacoes } from "@/lib/notificacoes/store"
import { useNotificacoesToasts } from "@/lib/notificacoes/toast-store"
import type { NotificacaoEvent, NotificacaoRow } from "@/lib/notificacoes/types"

export function NotificacoesStream() {
  useEffect(() => {
    let es: EventSource | null = null
    let stop = false
    let retry = 0
    let errored = false

    const hydrate = () => {
      apiSend<NotificacaoRow[]>("/api/notificacoes", "GET")
        .then((rows) => {
          if (!stop && Array.isArray(rows)) useNotificacoes.getState().setAll(rows)
        })
        .catch(() => {
          /* apiSend já trata 401→login / toast de rede */
        })
    }

    const handle = (evt: NotificacaoEvent) => {
      const store = useNotificacoes.getState()
      // Sincronização de leitura entre abas — atualiza só o badge, sem popup.
      if (evt.kind === "lida") {
        store.markRead(evt.id)
        return
      }
      if (evt.kind === "todasLidas") {
        store.markAllRead()
        return
      }
      const n = evt.notif
      if (evt.kind === "atualizada") store.replace(n)
      else store.prepend(n)

      // Popup acrílico no canto superior direito (NotificacoesToasts renderiza).
      useNotificacoesToasts.getState().push(n)

      // Notificação nativa do SO — só com a aba em segundo plano e permissão dada.
      if (
        typeof document !== "undefined" &&
        document.hidden &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          const nt = new Notification("Lexia", { body: n.mensagem, tag: `notif-${n.id}` })
          nt.onclick = () => {
            window.focus()
            if (n.link) window.location.assign(n.link)
            nt.close()
          }
        } catch {
          /* alguns navegadores exigem ServiceWorker p/ Notification — ignora */
        }
      }
    }

    const connect = () => {
      es = new EventSource("/api/notificacoes/stream")
      es.addEventListener("init", (e) => {
        retry = 0
        try {
          const { naoLidas } = JSON.parse((e as MessageEvent).data) as { naoLidas: number }
          useNotificacoes.getState().setUnread(naoLidas)
        } catch {
          /* ignore */
        }
        if (errored) {
          errored = false
          hydrate() // SSE não tem replay → re-hidrata após reconexão p/ não perder nada
        }
      })
      es.addEventListener("notificacao", (e) => {
        try {
          handle(JSON.parse((e as MessageEvent).data) as NotificacaoEvent)
        } catch {
          /* frame malformado — ignora */
        }
      })
      es.onerror = () => {
        errored = true
        // CONNECTING → o browser já está reconectando sozinho; só agimos se fechou de vez.
        if (es && es.readyState === EventSource.CLOSED) {
          es.close()
          if (stop) return
          retry++
          // O EventSource não expõe o status HTTP; após algumas falhas seguidas
          // sondamos a rota REST p/ detectar sessão expirada (401) e ir ao /login,
          // encerrando o loop de reconexão. Silencioso fora do 401 (sem toasts).
          if (retry >= 2) {
            fetch("/api/notificacoes", { method: "GET" })
              .then((r) => {
                if (r.status === 401) window.location.assign("/login")
              })
              .catch(() => {})
          }
          const delay = Math.min(30_000, 1000 * 2 ** retry)
          setTimeout(() => {
            if (!stop) connect()
          }, delay)
        }
      }
    }

    hydrate() // carrega as últimas 100 no store (alimenta o sino)
    connect() // abre o stream em tempo real

    return () => {
      stop = true
      es?.close()
    }
  }, [])

  return null
}
