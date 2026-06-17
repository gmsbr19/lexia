// Shared body limits for the CSV import routes: cap at 5 MB and reject binary
// content types up front (the routes read the raw body as text). SERVER ONLY.
import { NextResponse } from "next/server"

export const MAX_CSV_BYTES = 5 * 1024 * 1024

/** Returns a rejection response for oversized/binary uploads, or null when OK. */
export function rejectNonCsvBody(req: Request): NextResponse | null {
  const length = Number(req.headers.get("content-length") ?? 0)
  if (length > MAX_CSV_BYTES) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 5 MB)" }, { status: 413 })
  }
  const type = (req.headers.get("content-type") ?? "").toLowerCase()
  // Browsers send text/csv, text/plain or application/octet-stream-ish values
  // for File bodies; reject the clearly-binary ones.
  if (type && !/text|csv|json|octet-stream|x-www-form-urlencoded/.test(type)) {
    return NextResponse.json({ error: "Tipo de conteúdo inválido — envie o CSV como texto" }, { status: 415 })
  }
  return null
}
