// MCP service user — PURE decision taken by the boot hook (./boot.ts).
//
// The row is created ONCE per database and can never be duplicated: `User.email`
// is `@unique` in the schema, so "create only when missing" is enforced by
// PostgreSQL, not by this code. Running on every boot is therefore safe.
//
// Deliberately CREATE-ONLY: an existing row is never touched. If someone
// deactivates the service user to revoke MCP access, a restart must NOT bring it
// back — that would turn a kill switch into a no-op. The manual
// `npm run mcp:user` keeps the refresh/reactivate semantics for the explicit case.

export type DecisaoUsuarioMcp = "desligado" | "criar" | "ja-existe" | "desativado-preservado"

export function decidirUsuarioMcp(args: { tokenDefinido: boolean; existente: { ativo: boolean } | null }): DecisaoUsuarioMcp {
  if (!args.tokenDefinido) return "desligado" // sem LEXIA_MCP_TOKEN o /api/mcp é 404: nada a autenticar
  if (!args.existente) return "criar"
  return args.existente.ativo ? "ja-existe" : "desativado-preservado"
}

/** Normalized service-user e-mail (same rule as the script and loadServiceUser). */
export function emailDoUsuarioMcp(bruto: string | undefined): string {
  return (bruto || "mcp@lexia.local").trim().toLowerCase()
}
