// PT-BR activity labels for the tool chips (carried in SSE + persisted blocks).
// Pure module — safe to import from server or client.
const LABELS: Record<string, string> = {
  buscar: "Buscando",
  financeiro_resumo: "Consultando o financeiro",
  listar_lancamentos: "Listando lançamentos",
  inadimplencia: "Verificando inadimplência",
  dre: "Calculando a DRE",
  listar_honorarios: "Listando honorários",
  detalhe_honorario: "Abrindo o honorário",
  acerto_socios: "Calculando o acerto entre sócios",
  listar_clientes: "Listando clientes",
  detalhe_cliente: "Consultando o cliente",
  listar_casos: "Listando casos",
  detalhe_caso: "Consultando o caso",
  listar_tarefas: "Listando tarefas",
  agenda: "Consultando a agenda",
  comercial_resumo: "Consultando o comercial",
  listar_leads: "Listando leads",
  navegar: "Navegando",
  perguntar_usuario: "Perguntando",
}

export function rotuloTool(name: string): string {
  return LABELS[name] ?? name
}
