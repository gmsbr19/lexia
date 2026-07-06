import { describe, expect, it } from "vitest"
import { autofillFromCliente, clienteCreateFromValores, composeEndereco, type ClienteAutofillSource } from "@/components/documents/editor2/cliente-fill"
import type { PlaceholderDecl } from "@/lib/documents/model/placeholders"

const ph = (name: string, dataType: PlaceholderDecl["dataType"]): PlaceholderDecl => ({ name, dataType, label: name })

const cliente: ClienteAutofillSource = {
  nome: "Helena Vargas Andrade",
  tipo: "pf",
  cpfCnpj: "123.456.789-00",
  logradouro: "Av. Paulista",
  numero: "1842",
  complemento: "14º andar",
  bairro: "Bela Vista",
  cidade: "São Paulo",
  uf: "SP",
  cep: "01310-100",
  emails: ["helena@exemplo.com", "outro@x.com"],
}

describe("composeEndereco", () => {
  it("joins the address parts, skipping empties", () => {
    expect(composeEndereco(cliente)).toBe("Av. Paulista, 1842, 14º andar, Bela Vista, São Paulo/SP, CEP 01310-100")
    expect(composeEndereco({ nome: "x", tipo: "pf", cpfCnpj: null, cidade: "Campinas", uf: "SP" })).toBe("Campinas/SP")
  })
})

describe("autofillFromCliente", () => {
  it("maps client data onto placeholders by dataType", () => {
    const phs = [ph("nome_contr", "nome"), ph("cpf_contr", "cpf"), ph("end_contr", "endereco"), ph("email_contr", "email"), ph("rg_contr", "rg")]
    const out = autofillFromCliente(phs, cliente)
    expect(out.nome_contr).toBe("Helena Vargas Andrade")
    expect(out.cpf_contr).toBe("123.456.789-00")
    expect(out.email_contr).toBe("helena@exemplo.com")
    expect(out.end_contr).toContain("Av. Paulista")
    expect(out.rg_contr).toBeUndefined() // RG isn't stored on Cliente → left manual
  })

  it("fills a cnpj field from cpfCnpj too", () => {
    const out = autofillFromCliente([ph("doc", "cnpj")], { nome: "ACME", tipo: "pj", cpfCnpj: "49.321.521/0001-30" })
    expect(out.doc).toBe("49.321.521/0001-30")
  })
})

describe("clienteCreateFromValores", () => {
  it("builds a PF create body from the filled values", () => {
    const phs = [ph("nome_contr", "nome"), ph("cpf_contr", "cpf"), ph("email_contr", "email")]
    const valores = { nome_contr: "João Silva", cpf_contr: "111.222.333-44", email_contr: "joao@x.com" }
    const body = clienteCreateFromValores(phs, valores, "")
    expect(body).toEqual({ nome: "João Silva", tipo: "pf", cpfCnpj: "111.222.333-44", emails: ["joao@x.com"] })
  })

  it("detects PJ from a cnpj field and falls back to the name hint", () => {
    const body = clienteCreateFromValores([ph("doc", "cnpj")], { doc: "49.321.521/0001-30" }, "ACME LTDA")
    expect(body.tipo).toBe("pj")
    expect(body.nome).toBe("ACME LTDA")
    expect(body.cpfCnpj).toBe("49.321.521/0001-30")
  })
})
