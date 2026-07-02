// Documentos tools — client-side (no confirmation gate):
//   • rascunhar_documento — create a blank draft Documento + open the rich-text
//     editor on it. Drafting a rascunho is reversible, so it needs no pause.
//   • editar_documento_aberto / detectar_campos_documento — edit the document
//     OPEN in the flexible editor. Available ONLY when ctx.doc is set (the chat is
//     embedded in /documents/doc/[id]); gated off everywhere else by toApiTools.
//     The ops/campos are echoed to the browser via a "doc-patch" SSE event and
//     applied to the LIVE editor (reversible by undo) — so they stay kind:"client"
//     and never hit the DB-mutation confirmation path.
import { z } from "zod"
import { idOpt } from "@/lib/validation"
import { createDocumento } from "@/lib/documentos/mutations"
import { emptyDoc } from "@/lib/documents/model/types"
import { detectarCampos } from "@/lib/documents/detectar-campos"
import { defineTool } from "../types"

// Schema das operações que o modelo propõe sobre o documento aberto. Espelha
// `DocOp` (lib/documents/model/ops.ts). As ops por POSIÇÃO (substituir_selecao /
// inserir_apos_selecao) só fazem sentido com um <selecao> no contexto — o modelo
// DEVE copiar `from`/`to` exatos de lá, nunca inventar posições.
const opSchema = z.object({
  tipo: z.enum(["preencher_campo", "substituir_texto", "inserir_paragrafo", "substituir_selecao", "inserir_apos_selecao", "formatar_texto", "formatar_selecao"]),
  name: z.string().max(60).optional().describe("preencher_campo: nome EXATO do campo (da lista de campos)"),
  valor: z.string().max(4000).optional().describe("preencher_campo: valor a preencher"),
  de: z.string().max(4000).optional().describe("substituir_texto / formatar_texto: trecho EXATO como está no documento (texto puro, SEM markdown)"),
  para: z.string().max(8000).optional().describe("substituir_texto / substituir_selecao: novo texto (texto puro, SEM markdown/asteriscos)"),
  texto: z.string().max(8000).optional().describe("inserir_paragrafo / inserir_apos_selecao: texto do parágrafo"),
  marca: z.enum(["bold", "italic", "underline", "strike"]).optional().describe("formatar_texto / formatar_selecao: qual formatação aplicar"),
  remover: z.boolean().optional().describe("formatar_*: true = REMOVER a marca em vez de aplicar"),
  from: z.number().int().nonnegative().optional().describe("substituir_selecao / inserir_apos_selecao / formatar_selecao: posição inicial (copie do <selecao>)"),
  to: z.number().int().nonnegative().optional().describe("substituir_selecao / inserir_apos_selecao / formatar_selecao: posição final (copie do <selecao>)"),
})

export const documentosTools = [
  defineTool({
    name: "rascunhar_documento",
    kind: "client",
    clientEvent: "navigate",
    description:
      "Cria um RASCUNHO de documento EM BRANCO e ABRE o editor de documentos (rich-text) nele. " +
      "Use SEMPRE que o usuário pedir para rascunhar/minutar/redigir um documento/contrato/minuta — NUNCA escreva o texto do documento no chat. " +
      "No editor o usuário escreve o conteúdo, detecta os campos e exporta em PDF/DOCX.",
    schema: z.object({
      clienteId: idOpt.describe("Id do cliente já vinculado, se houver (obtido via buscar)"),
      casoId: idOpt.describe("Id do caso, se aplicável"),
      nome: z
        .string()
        .max(160)
        .optional()
        .describe("Nome do documento, ex.: 'Contrato de Honorários — João Silva'"),
    }),
    run: async (ctx, input) => {
      const doc = await createDocumento({
        nome: input.nome?.trim() || "Documento sem título",
        template: "livre",
        status: "rascunho",
        conteudo: emptyDoc(),
        clienteId: input.clienteId ?? null,
        casoId: input.casoId ?? null,
        criadoPor: ctx.user.email,
      })
      return `/documents/doc/${doc.id}`
    },
  }),

  defineTool({
    name: "editar_documento_aberto",
    kind: "client",
    clientEvent: "doc-patch",
    description:
      "Edita o documento ABERTO no editor (use o conteúdo em <documento_aberto>). Traduza o pedido em uma lista de OPERAÇÕES e proponha — o usuário aplica no editor (reversível por desfazer). NUNCA reescreva o documento inteiro no chat. Operações:\n" +
      "• preencher_campo — preenche um placeholder existente (use `name` EXATO da lista de campos + `valor`). Use dados REAIS do cliente (busque com `buscar`/`detalhe_cliente`); não invente.\n" +
      "• substituir_texto — troca um trecho: `de` = texto EXATO atual no documento, `para` = novo texto.\n" +
      "• inserir_paragrafo — adiciona um parágrafo novo ao FIM (`texto`).\n" +
      "• formatar_texto — aplica formatação REAL (negrito/itálico/sublinhado/tachado) a um trecho: `de` = texto EXATO + `marca` (bold|italic|underline|strike). É ASSIM que se deixa em negrito — NUNCA escreva markdown/asteriscos (`**`) no texto, eles aparecem literalmente.\n" +
      "• substituir_selecao — QUANDO HOUVER <selecao>, PREFIRA esta (mais precisa, menos tokens): substitui exatamente o trecho selecionado por `para`; copie `from`/`to` EXATOS do <selecao>.\n" +
      "• formatar_selecao — aplica/remove `marca` em TODO o trecho selecionado (`from`/`to` do <selecao>).\n" +
      "• inserir_apos_selecao — insere `texto` logo após a seleção (`from`/`to` do <selecao>).\n" +
      "REGRAS: só as operações realmente necessárias; preserve a terminologia jurídica; texto SEM markdown; NUNCA invente posições from/to (só existem no <selecao>). **Se houver <selecao>, TODAS as operações devem ficar DENTRO dela** — para formatar 'as partes relevantes', use `formatar_texto` com `de` = trechos QUE ESTÃO na seleção (nomes, valores, datas), nunca o documento inteiro.",
    schema: z.object({ ops: z.array(opSchema).max(40).describe("As operações de edição a aplicar") }),
    run: async (ctx, input) => {
      // As ops por POSIÇÃO são fixadas na seleção REAL do contexto (from/to/de
      // confiáveis), não no que o modelo ecoou — assim ele nunca inventa posições e
      // o cliente consegue verificar/limpar se o documento mudou (anti-stale).
      const sel = ctx.doc?.selecao
      const ehSelecao = (t: string) => t === "substituir_selecao" || t === "inserir_apos_selecao" || t === "formatar_selecao"
      const ops = input.ops
        .map((op) => (ehSelecao(op.tipo) && sel ? { ...op, from: sel.from, to: sel.to, de: sel.texto } : op))
        // GUARDA de escopo: havendo seleção, ops de texto/formatação cujo `de` NÃO
        // está dentro do trecho selecionado são descartadas (o modelo às vezes
        // formata o documento inteiro ignorando a seleção). Sem seleção, passam.
        .filter((op) => {
          if (!sel) return true
          if (op.tipo === "substituir_texto" || op.tipo === "formatar_texto") return !!op.de && sel.texto.includes(op.de)
          return true
        })
      return { ops }
    },
  }),

  defineTool({
    name: "detectar_campos_documento",
    kind: "client",
    clientEvent: "doc-patch",
    description:
      "Detecta automaticamente os trechos VARIÁVEIS do documento aberto (nomes, CPF/CNPJ, datas, valores, endereços, nº de processo…) e os propõe como campos preenchíveis. Use quando o usuário pedir para 'detectar campos' ou transformar o documento num modelo reutilizável. NÃO marca texto jurídico fixo (cláusulas, fundamentos).",
    schema: z.object({}),
    run: async (ctx) => {
      const texto = ctx.doc?.texto ?? ""
      if (!texto.trim()) return { ops: [], campos: [] }
      const campos = await detectarCampos(texto, { userEmail: ctx.user.email })
      return { ops: [], campos }
    },
  }),
]
