// Map a confirmed mutation's (toolName, result, payload) to an in-app deep-link
// so the chat can show the user a "Ver tarefa / Ver lançamento" affordance for
// what the agent just created. Routes are validated against the navigation
// whitelist, so a bad mapping degrades to no link rather than a broken one.
import { validarRota } from "./tools/navegacao"

export interface ResultadoLink {
  rota: string
  label: string
}

function idDe(result: unknown): number | null {
  if (result && typeof result === "object" && "id" in result) {
    const id = (result as { id: unknown }).id
    if (typeof id === "number" && Number.isInteger(id)) return id
  }
  return null
}

/** processoId a partir do resultado (prazo/publicação atualizados) ou do payload. */
function processoIdDe(result: unknown, payload: unknown): number | null {
  for (const o of [result, payload]) {
    if (o && typeof o === "object" && "processoId" in o) {
      const v = (o as { processoId: unknown }).processoId
      if (typeof v === "number" && Number.isInteger(v)) return v
    }
  }
  return null
}

export function linkParaResultado(toolName: string, result: unknown, payload: unknown): ResultadoLink | null {
  let bruto: ResultadoLink | null = null

  switch (toolName) {
    case "criar_tarefa": {
      const id = idDe(result)
      bruto = { rota: id ? `/tarefas?tarefa=${id}` : "/tarefas", label: "Ver tarefa" }
      break
    }
    case "criar_lancamento": {
      const dir = (payload as { dir?: string } | null)?.dir
      const filtro = dir === "in" || dir === "out" ? `&dir=${dir}` : ""
      bruto = { rota: `/financeiro?tab=lancamentos${filtro}`, label: "Ver lançamento" }
      break
    }
    case "pagar_lancamento":
      bruto = { rota: "/financeiro?tab=lancamentos", label: "Ver lançamento" }
      break
    case "criar_cliente": {
      const id = idDe(result)
      bruto = id ? { rota: `/clientes/${id}`, label: "Ver cliente" } : { rota: "/clientes", label: "Ver clientes" }
      break
    }
    case "criar_evento":
      bruto = { rota: "/agenda", label: "Ver na agenda" }
      break
    case "criar_lead":
    case "mover_lead_etapa":
      bruto = { rota: "/comercial?tab=leads", label: "Ver no funil" }
      break
    case "criar_prazo":
    case "cumprir_prazo":
    case "editar_prazo":
    case "confirmar_prazo":
    case "rejeitar_prazo":
    case "vincular_publicacao":
    case "vincular_honorario_processo":
    case "adicionar_parte_processo": {
      const pid = processoIdDe(result, payload)
      bruto = pid ? { rota: `/processos/${pid}`, label: "Ver processo" } : { rota: "/processos", label: "Ver processos" }
      break
    }
    case "criar_processo":
    case "editar_processo": {
      const id = idDe(result)
      bruto = id ? { rota: `/processos/${id}`, label: "Ver processo" } : { rota: "/processos", label: "Ver processos" }
      break
    }
    case "criar_caso":
    case "editar_caso": {
      const id = idDe(result)
      bruto = id
        ? { rota: `/processos?view=processos&caso=${id}`, label: "Ver caso" }
        : { rota: "/processos?view=processos", label: "Ver casos" }
      break
    }
    case "editar_cliente": {
      const id = idDe(result)
      bruto = id ? { rota: `/clientes/${id}`, label: "Ver cliente" } : { rota: "/clientes", label: "Ver clientes" }
      break
    }
    case "anotar_cliente":
    case "pausar_cobranca":
    case "suspender_cobranca":
    case "retomar_cobranca": {
      // result is the note row; the cliente id rides in the payload.
      const cid =
        payload && typeof payload === "object" && "id" in payload && typeof (payload as { id: unknown }).id === "number"
          ? (payload as { id: number }).id
          : null
      bruto = cid ? { rota: `/clientes/${cid}?tab=cobranca`, label: "Ver cliente" } : { rota: "/clientes", label: "Ver clientes" }
      break
    }
    case "excluir_cliente":
      bruto = { rota: "/clientes", label: "Ver clientes" }
      break
    case "editar_tarefa": {
      const id = idDe(result)
      bruto = { rota: id ? `/tarefas?tarefa=${id}` : "/tarefas", label: "Ver tarefa" }
      break
    }
    default:
      return null
  }

  const rota = validarRota(bruto.rota)
  return rota ? { rota, label: bruto.label } : null
}
