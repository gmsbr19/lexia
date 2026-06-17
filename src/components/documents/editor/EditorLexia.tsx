"use client"

// The document editor's AI surface — the REAL LexIA chat (embedded variant) shown
// as a floating acrylic popup in the lateral position. It carries document-aware
// suggestions (page="documents-editor") and can edit the OPEN contract: the agent's
// proposed edits arrive as "Aceitar" cards that patch the live preview via
// onDocAccept, and the open document snapshot rides with each turn via sendContext.
import { useCallback, useMemo, type RefObject } from "react"
import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
import { LexiaBar } from "@/components/lexia/LexiaBar"
import type { DocumentoContexto } from "@/components/lexia/types"
import type { CrmNav } from "@/components/crm/crm-types"
import type { ContratoHonorariosData } from "@/lib/types/contrato-honorarios"
import type { AISuggestion } from "./doc-changes"
import * as layoutStyles from "./editor-layout.css"

interface EditorLexiaProps {
  /** Live ref to the contract data — read fresh at send time (never stale). */
  dataRef: RefObject<ContratoHonorariosData>
  /** Documento id once autosaved (null while the draft is brand new). */
  docId: number | null
  templateId: string
  /** Document name shown in the context strip above the popup. */
  computedNome: string
  /** Apply the agent's accepted edits to the live editor document. */
  onDocAccept: (sugestoes: AISuggestion[]) => void
}

export function EditorLexia({ dataRef, docId, templateId, computedNome, onDocAccept }: EditorLexiaProps) {
  const router = useRouter()

  // Minimal CrmNav from router.push — the editor isn't inside CrmRoutes, so the
  // workspace nav is unavailable. Search results / "Ir para" degrade to full nav;
  // quick actions (no editor modal host) route home. Chat is the dominant surface.
  const nav = useMemo<CrmNav>(
    () => ({
      navPage: (p) => router.push(`/${p}`),
      openCliente: (id) => router.push(`/clientes/${id}`),
      openClienteTab: (id) => router.push(`/clientes/${id}`),
      openCaso: (id) => router.push(`/processos?view=processos&caso=${id}`),
      openContrato: (id) => router.push(`/contratos?contrato=${id}`),
      openProcesso: (id) => router.push(`/processos/${id}`),
    }),
    [router],
  )
  const onNavigate = useCallback((href: string) => router.push(href), [router])
  // No modal host in the editor, so a quick action routes to its module (where the
  // user can create) rather than opening a dialog. The draft autosaves before nav.
  const onAction = useCallback(
    (kind: string) => {
      const dest: Record<string, string> = {
        "novo-cliente": "/clientes",
        "nova-tarefa": "/tarefas",
        "novo-lancamento": "/financeiro",
        "novo-evento": "/agenda",
      }
      router.push(dest[kind] ?? "/")
    },
    [router],
  )

  // The open-document snapshot, read fresh from the live ref at send time.
  const sendContext = useCallback(
    (): DocumentoContexto => ({ documentoId: docId, template: templateId, data: dataRef.current }),
    [docId, templateId, dataRef],
  )

  return (
    <div className={layoutStyles.lexFloat}>
      {computedNome && (
        <div className={layoutStyles.lexFloatContext}>
          <FileText size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {computedNome}
          </span>
        </div>
      )}
      <LexiaBar
        variant="embedded"
        page="documents-editor"
        minimal
        nav={nav}
        onNavigate={onNavigate}
        onAction={onAction}
        minHeight={420}
        sendContext={sendContext}
        onDocAccept={onDocAccept}
      />
    </div>
  )
}
