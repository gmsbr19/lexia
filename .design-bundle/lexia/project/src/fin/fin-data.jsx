// Sample data for the LexIA Financeiro module.
// Plausible numbers for a mid-size São Paulo advocacia (sócio + 4 advogados).
// All money in BRL (number, centavos as decimals). Dates ISO.

const FIN = {
  // ---- Chart palette (per brief A2) ----
  c: {
    recebido:  '#1F3A6E',   // navy — realized
    receber:   '#C0A147',   // gold — open / projection
    positivo:  '#2E9E5B',   // green
    amber:     '#D98A2B',   // amber — 1–60 overdue
    vermelho:  '#C0492F',   // red — 60+ overdue
    axis:      'var(--text-subtle)',
  },
};

// 12-month revenue: realized (recebido) vs billed-open (a receber).
// Last 3 months are the "melting" projection — decayed by realized collection rate.
const REVENUE_SERIES = [
  { mes: 'Jul', recebido: 182000, receber: 24000, proj: false },
  { mes: 'Ago', recebido: 168500, receber: 31000, proj: false },
  { mes: 'Set', recebido: 211400, receber: 18600, proj: false },
  { mes: 'Out', recebido: 196700, receber: 27300, proj: false },
  { mes: 'Nov', recebido: 234800, receber: 22100, proj: false },
  { mes: 'Dez', recebido: 158200, receber: 41900, proj: false },
  { mes: 'Jan', recebido: 187600, receber: 33400, proj: false },
  { mes: 'Fev', recebido: 205300, receber: 29800, proj: false },
  { mes: 'Mar', recebido: 221900, receber: 26200, proj: false },
  { mes: 'Abr', recebido: 143800, receber: 88500, proj: true },   // projection starts
  { mes: 'Mai', recebido: 96400,  receber: 121300, proj: true },
  { mes: 'Jun', recebido: 52100,  receber: 158700, proj: true },
];

// Composition of receita (donut)
const COMPOSITION = [
  { label: 'Recorrente',  value: 412000, color: '#1F3A6E' },
  { label: 'Parcelado',   value: 286500, color: '#C0A147' },
  { label: 'Êxito',       value: 198400, color: '#2E9E5B' },
  { label: 'À vista',     value: 121800, color: '#7C8AA8' },
];

// Aging buckets
const AGING = [
  { bucket: 'A vencer',  value: 184300, count: 14, tone: 'positivo' },
  { bucket: '1–30 dias', value: 62800,  count: 9,  tone: 'amber' },
  { bucket: '31–60 dias',value: 38400,  count: 5,  tone: 'amber' },
  { bucket: '60+ dias',  value: 51200,  count: 6,  tone: 'vermelho' },
];

// Inadimplência drill — overdue receivables by cliente/caso
const INADIMPLENCIA = [
  { cliente: 'Construtora Aurora S/A',  caso: 'Ação trabalhista coletiva', valor: 28400, dias: 74, tipo: 'PJ' },
  { cliente: 'Editora Linhares',        caso: 'Cessão de direitos autorais', valor: 12200, dias: 63, tipo: 'PJ' },
  { cliente: 'Helena Vargas',           caso: 'Inventário', valor: 9600, dias: 41, tipo: 'PF' },
  { cliente: 'Tech Holding LTDA',       caso: 'Consultoria societária', valor: 18900, dias: 38, tipo: 'PJ' },
  { cliente: 'Família Soares',          caso: 'Usucapião Vila Madalena', valor: 7400, dias: 29, tipo: 'PF' },
  { cliente: 'Mendonça & Filhos',       caso: 'Revisão contratual', valor: 14300, dias: 22, tipo: 'PJ' },
];

// DRE (Demonstração de Resultado) — current month
const DRE = [
  { label: 'Receita bruta',          value: 221900, kind: 'receita' },
  { label: '(−) Custos operacionais', value: -78400, kind: 'custo', detail: 'Equipe, sistemas, ocupação' },
  { label: '(−) Pró-labore',          value: -45000, kind: 'prolabore', detail: 'Sócios' },
  { label: '(−) Impostos & taxas',    value: -31600, kind: 'custo', detail: 'Simples Nacional, OAB, custas' },
  { label: 'Resultado líquido',       value: 66900,  kind: 'resultado' },
];

// Costs by category (uses Categoria.cor swatches)
const COSTS = [
  { cat: 'Folha & honorários internos', value: 42800, cor: '#1F3A6E' },
  { cat: 'Sistemas & software',         value: 14200, cor: '#C0A147' },
  { cat: 'Ocupação (escritório)',       value: 11600, cor: '#2E9E5B' },
  { cat: 'Impostos & taxas',            value: 31600, cor: '#D98A2B' },
  { cat: 'Marketing & captação',        value: 9700,  cor: '#7C8AA8' },
  { cat: 'Outros',                      value: 5500,  cor: '#9E7BB5' },
];

// Break-even
const BREAKEVEN = { custoFixo: 155000, receita: 221900, margemContrib: 0.62 };

// Casos sem fee (active cases with no honorário)
const CASOS_SEM_FEE = [
  { caso: 'Defesa administrativa CADE', cliente: 'Tech Holding LTDA', tipo: 'Concorrencial', resp: 'Rafael Moraes', ultima: 'há 3 dias' },
  { caso: 'Recuperação judicial — fase 2', cliente: 'Indústria Kessler', tipo: 'Empresarial', resp: 'Camila Reis', ultima: 'há 6 dias' },
  { caso: 'Mandado de segurança fiscal', cliente: 'Atlântico Logística', tipo: 'Tributário', resp: 'Diego Tomé', ultima: 'há 9 dias' },
  { caso: 'Acordo extrajudicial', cliente: 'Família Soares', tipo: 'Cível', resp: 'Camila Reis', ultima: 'há 12 dias' },
  { caso: 'Due diligence aquisição', cliente: 'Vértice Capital', tipo: 'Societário', resp: 'Rafael Moraes', ultima: 'há 14 dias' },
];

// Importação — flagged lançamentos
const FLAGGED = [
  { desc: 'Compensação Sistema', data: '2026-03-31', valor: -150000, motivo: 'Valor atípico (−R$150k)', conta: 'Conta corrente' },
  { desc: 'Estorno duplicado — honorário Aurora', data: '2026-03-18', valor: -28400, motivo: 'Possível duplicidade', conta: 'Conta corrente' },
  { desc: 'Transferência não identificada', data: '2026-03-09', valor: 47200, motivo: 'Sem contraparte', conta: 'Poupança' },
  { desc: 'Lançamento sem categoria', data: '2026-02-27', valor: -3650, motivo: 'Categoria ausente', conta: 'Cartão PJ' },
];

// Clientes list
const CLIENTES = [
  { nome: 'Construtora Aurora S/A', tipo: 'PJ', doc: '12.345.678/0001-90', cidade: 'São Paulo / SP', classe: 'Estratégico', casos: 7 },
  { nome: 'Helena Vargas', tipo: 'PF', doc: '123.456.789-00', cidade: 'Campinas / SP', classe: 'Ativo', casos: 3 },
  { nome: 'Tech Holding LTDA', tipo: 'PJ', doc: '98.765.432/0001-10', cidade: 'São Paulo / SP', classe: 'Estratégico', casos: 5 },
  { nome: 'Mendonça & Filhos', tipo: 'PJ', doc: '45.678.901/0001-23', cidade: 'Santos / SP', classe: 'Ativo', casos: 4 },
  { nome: 'Família Soares', tipo: 'PF', doc: '234.567.890-11', cidade: 'São Paulo / SP', classe: 'Ativo', casos: 2 },
  { nome: 'Editora Linhares', tipo: 'PJ', doc: '56.789.012/0001-34', cidade: 'Ribeirão Preto / SP', classe: 'Ativo', casos: 3 },
  { nome: 'Diego Albuquerque', tipo: 'PF', doc: '345.678.901-22', cidade: 'Guarulhos / SP', classe: 'Lead', casos: 0 },
  { nome: 'Indústria Kessler', tipo: 'PJ', doc: '67.890.123/0001-45', cidade: 'Jundiaí / SP', classe: 'Ativo', casos: 6 },
  { nome: 'Atlântico Logística', tipo: 'PJ', doc: '78.901.234/0001-56', cidade: 'Santos / SP', classe: 'Lead', casos: 1 },
];

// Contratos / honorários
const CONTRATOS = [
  { desc: 'Honorários — Assessoria mensal', cliente: 'Construtora Aurora S/A', caso: 'Contencioso trabalhista', venc: '2026-06-05', valor: 18000, status: 'Lançado', bucket: 'Recorrente' },
  { desc: 'Honorários de êxito — Inventário', cliente: 'Helena Vargas', caso: 'Inventário', venc: '2026-05-20', valor: 42000, status: 'Lançado', bucket: 'Êxito' },
  { desc: 'Parcela 3/6 — Consultoria societária', cliente: 'Tech Holding LTDA', caso: 'Reestruturação', venc: '2026-05-12', valor: 12000, status: 'Recebido', bucket: 'Parcelado' },
  { desc: 'Honorários — Due diligence', cliente: 'Vértice Capital', caso: 'M&A aquisição', venc: '2026-06-18', valor: 65000, status: 'Lançado', bucket: 'À vista' },
  { desc: 'Parcela 2/4 — Revisão contratual', cliente: 'Mendonça & Filhos', caso: 'Revisão contratual', venc: '2026-04-30', valor: 8500, status: 'Recebido', bucket: 'Parcelado' },
  { desc: 'Honorários — Recuperação judicial', cliente: 'Indústria Kessler', caso: 'Recuperação judicial', venc: '2026-06-10', valor: 38000, status: 'Lançado', bucket: 'À vista' },
  { desc: 'Assessoria mensal — Maio', cliente: 'Editora Linhares', caso: 'Propriedade intelectual', venc: '2026-05-05', valor: 6500, status: 'Recebido', bucket: 'Recorrente' },
];

Object.assign(window, {
  FIN, REVENUE_SERIES, COMPOSITION, AGING, INADIMPLENCIA,
  DRE, COSTS, BREAKEVEN, CASOS_SEM_FEE, FLAGGED, CLIENTES, CONTRATOS,
});
