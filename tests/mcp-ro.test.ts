import { describe, expect, it, vi } from "vitest"
import {
  comandoRevogacao,
  ident,
  PAPEL_RO_PADRAO,
  padroesBloqueados,
  papelRo,
} from "@/lib/mcp/ro-core"
import { revogarTabelasSensiveis, type RoDb } from "@/lib/mcp/ro"
import { PREFIXOS_BLOQUEADOS } from "@/lib/mcp/sql-core"

describe("papelRo", () => {
  it("usa o usuário da DATABASE_URL_RO (é esse que o sql_consultar usa)", () => {
    expect(papelRo("postgresql://lexia_ro:senha@db:5432/ncm?schema=public")).toBe("lexia_ro")
    expect(papelRo("postgresql://so_leitura:s@h/ncm")).toBe("so_leitura")
  })

  it("decodifica o usuário escapado na URL", () => {
    expect(papelRo("postgresql://ro%40ncm:s@h/ncm")).toBe("ro@ncm")
  })

  it("cai no nome documentado quando a variável falta, está vazia ou é lixo", () => {
    // O papel pode existir no banco ANTES de a variável ser setada — é
    // justamente aí que a revogação mais importa.
    for (const v of [undefined, null, "", "   ", "nao-e-url"]) {
      expect(papelRo(v)).toBe(PAPEL_RO_PADRAO)
    }
    expect(papelRo("postgresql://:senha@h/ncm")).toBe(PAPEL_RO_PADRAO)
  })
})

describe("DDL emitida", () => {
  it("deriva os padrões dos MESMOS prefixos que barram a consulta por nome", () => {
    expect(padroesBloqueados(PREFIXOS_BLOQUEADOS)).toEqual(["whatsapp%", "oauth%"])
    expect(padroesBloqueados([])).toEqual([])
  })

  it("cita identificador e dobra aspas internas", () => {
    expect(ident("WhatsappChat")).toBe('"WhatsappChat"')
    expect(ident('ta"bela')).toBe('"ta""bela"')
    expect(comandoRevogacao("lexia_ro", "WhatsappMensagem")).toBe(
      'REVOKE ALL ON public."WhatsappMensagem" FROM "lexia_ro"',
    )
  })
})

function db(over: {
  papel?: { rolsuper: boolean; e_o_app: boolean }[]
  tabelas?: string[]
}): RoDb & { executados: string[]; params: unknown[][] } {
  const executados: string[] = []
  const params: unknown[][] = []
  return {
    executados,
    params,
    consultar: (async (sql: string, ...p: unknown[]) => {
      params.push(p)
      if (sql.includes("pg_roles")) return over.papel ?? [{ rolsuper: false, e_o_app: false }]
      return (over.tabelas ?? []).map((tablename) => ({ tablename }))
    }) as RoDb["consultar"],
    executar: async (sql: string) => {
      executados.push(sql)
      return 0
    },
  }
}

describe("revogarTabelasSensiveis", () => {
  it("revoga uma vez por tabela que casa com os prefixos", async () => {
    const d = db({ tabelas: ["OAuthToken", "WhatsappChat", "WhatsappMensagem"] })
    const r = await revogarTabelasSensiveis(d, "lexia_ro")
    expect(r).toEqual({
      acao: "revogado",
      papel: "lexia_ro",
      tabelas: ["OAuthToken", "WhatsappChat", "WhatsappMensagem"],
    })
    expect(d.executados).toEqual([
      'REVOKE ALL ON public."OAuthToken" FROM "lexia_ro"',
      'REVOKE ALL ON public."WhatsappChat" FROM "lexia_ro"',
      'REVOKE ALL ON public."WhatsappMensagem" FROM "lexia_ro"',
    ])
    // O papel e os padrões vão como PARÂMETRO, nunca interpolados.
    expect(d.params[0]).toEqual(["lexia_ro"])
    expect(d.params[1]).toEqual(["whatsapp%", "oauth%"])
  })

  it("não faz nada quando o papel não existe (dev sem o passo manual)", async () => {
    const d = db({ papel: [], tabelas: ["WhatsappChat"] })
    expect(await revogarTabelasSensiveis(d, "lexia_ro")).toEqual({ acao: "sem-papel", papel: "lexia_ro" })
    expect(d.executados).toEqual([])
  })

  it("recusa agir sobre superusuário ou sobre o próprio usuário do app", async () => {
    // Revogar do usuário de escrita desarmaria o acesso do app; de um
    // superusuário seria teatro (ele ignora privilégio de tabela).
    const sup = db({ papel: [{ rolsuper: true, e_o_app: false }], tabelas: ["WhatsappChat"] })
    expect(await revogarTabelasSensiveis(sup, "postgres")).toEqual({
      acao: "papel-inseguro",
      papel: "postgres",
      motivo: "superusuario",
    })
    expect(sup.executados).toEqual([])

    const eu = db({ papel: [{ rolsuper: false, e_o_app: true }], tabelas: ["WhatsappChat"] })
    expect(await revogarTabelasSensiveis(eu, "lexia")).toEqual({
      acao: "papel-inseguro",
      papel: "lexia",
      motivo: "e-o-app",
    })
    expect(eu.executados).toEqual([])
  })

  it("não monta `AND ()` quando não há prefixo bloqueado", async () => {
    const d = db({ tabelas: ["WhatsappChat"] })
    expect(await revogarTabelasSensiveis(d, "lexia_ro", [])).toEqual({
      acao: "revogado",
      papel: "lexia_ro",
      tabelas: [],
    })
    expect(d.executados).toEqual([])
  })

  it("um nome de tabela com aspas não vira DDL solta", async () => {
    const d = db({ tabelas: ['Whatsapp"; DROP TABLE "User'] })
    await revogarTabelasSensiveis(d, "lexia_ro")
    expect(d.executados).toEqual(['REVOKE ALL ON public."Whatsapp""; DROP TABLE ""User" FROM "lexia_ro"'])
  })

  it("é idempotente: a 2ª passada emite exatamente os mesmos comandos", async () => {
    const um = db({ tabelas: ["WhatsappChat"] })
    const dois = db({ tabelas: ["WhatsappChat"] })
    await revogarTabelasSensiveis(um, "lexia_ro")
    await revogarTabelasSensiveis(dois, "lexia_ro")
    expect(dois.executados).toEqual(um.executados)
  })

  it("propaga a falha do banco (o boot a transforma em log, não em queda)", async () => {
    const d = db({ tabelas: ["WhatsappChat"] })
    d.executar = vi.fn(async () => {
      throw new Error("permission denied")
    })
    await expect(revogarTabelasSensiveis(d, "lexia_ro")).rejects.toThrow("permission denied")
  })
})
