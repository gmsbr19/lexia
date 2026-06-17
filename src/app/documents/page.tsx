import { getDocumentos } from "@/lib/documentos/queries"
import { DocumentsPage } from "@/components/documents/page/DocumentsPage"

export const dynamic = "force-dynamic"

export default async function DocumentsRoute() {
  const documentos = await getDocumentos()
  return <DocumentsPage documentos={documentos} />
}
