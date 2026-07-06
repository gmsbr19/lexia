// Map between a Cliente and the document's merge fields (by dataType). PURE.
// Used by the form panel's "Vincular cliente" (autofill) and "Criar novo cliente
// a partir do formulário" (reverse).
import type { PlaceholderDecl } from "@/lib/documents/model/placeholders"

export interface ClienteAutofillSource {
  nome: string
  tipo: string // 'pf' | 'pj'
  cpfCnpj: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  cep?: string | null
  emails?: string[]
}

/** One-line address from the client's address parts. */
export function composeEndereco(c: ClienteAutofillSource): string {
  return [
    [c.logradouro, c.numero].filter(Boolean).join(", "),
    c.complemento || "",
    c.bairro || "",
    [c.cidade, c.uf].filter(Boolean).join("/"),
    c.cep ? `CEP ${c.cep}` : "",
  ]
    .filter((s) => s && s.trim())
    .join(", ")
}

/** Fill the doc's placeholders from a cliente's data (by dataType). Returns only
 * the fields it can source (name / cpf / cnpj / endereço / e-mail). */
export function autofillFromCliente(placeholders: PlaceholderDecl[], c: ClienteAutofillSource): Record<string, string> {
  const endereco = composeEndereco(c)
  const email = c.emails?.[0] ?? ""
  const out: Record<string, string> = {}
  for (const ph of placeholders) {
    let v = ""
    switch (ph.dataType) {
      case "nome":
        v = c.nome
        break
      case "cpf":
      case "cnpj":
        v = c.cpfCnpj ?? ""
        break
      case "endereco":
        v = endereco
        break
      case "email":
        v = email
        break
      default:
        v = ""
    }
    if (v.trim()) out[ph.name] = v
  }
  return out
}

export interface ClienteCreateBody {
  nome: string
  tipo: string
  cpfCnpj?: string
  logradouro?: string
  emails?: string[]
}

/** Build a Cliente create body from the filled field values (reverse of autofill). */
export function clienteCreateFromValores(placeholders: PlaceholderDecl[], valores: Record<string, string>, nomeHint: string): ClienteCreateBody {
  const byType = (t: string) => {
    const ph = placeholders.find((p) => p.dataType === t)
    return ph ? (valores[ph.name] ?? "").trim() : ""
  }
  const cnpj = byType("cnpj")
  const cpf = byType("cpf")
  const body: ClienteCreateBody = {
    nome: byType("nome") || nomeHint.trim() || "Novo cliente",
    tipo: cnpj ? "pj" : "pf",
  }
  const doc = cnpj || cpf
  if (doc) body.cpfCnpj = doc
  const endereco = byType("endereco")
  if (endereco) body.logradouro = endereco
  const email = byType("email")
  if (email) body.emails = [email]
  return body
}
