// LexIA · Contencioso — data model + seed para o módulo de processos e prazos.
// Entidades: processos, andamentos (linha do tempo + caixa de triagem), prazos, audiências.
// Datas em ISO. Prazos em DIAS ÚTEIS (CPC/2015), descontando fins de semana e feriados forenses.
// Reaproveita CRM_TODAY, crmUser, fxMoney, fxDate de crm-data / fin-store.

const PROC_TODAY = (typeof CRM_TODAY !== 'undefined') ? CRM_TODAY : '2026-06-11';

// ---- feriados forenses (subconjunto realista p/ a contagem de dias úteis) ----
const PROC_FERIADOS = new Set([
  '2026-06-04', // Corpus Christi
  '2026-07-09', // Revolução Constitucionalista (SP)
  '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-12-25',
]);
const procIsBiz = (d) => { const w = d.getDay(); return w !== 0 && w !== 6 && !PROC_FERIADOS.has(procISO(d)); };
function procISO(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function procParse(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }

// dias úteis de hoje (exclusivo) até a data alvo (inclusivo). Negativo se já passou.
function procDU(toISO, fromISO = PROC_TODAY) {
  if (!toISO) return null;
  const from = procParse(fromISO), to = procParse(toISO);
  if (procISO(to) === procISO(from)) return 0;
  const fwd = to > from;
  let count = 0; const cur = new Date(from);
  while (procISO(cur) !== procISO(to)) {
    cur.setDate(cur.getDate() + (fwd ? 1 : -1));
    if (procIsBiz(cur)) count += (fwd ? 1 : -1);
  }
  return count;
}

// urgência do semáforo a partir de dias úteis até o prazo FATAL
function procUrgency(du) {
  if (du == null) return { level: 'sem', label: '—', tone: 'neutral', color: 'var(--text-muted)' };
  if (du < 0)   return { level: 'vencido', label: 'Vencido', tone: 'neg', color: 'var(--crit)' };
  if (du === 0) return { level: 'hoje', label: 'Vence hoje', tone: 'neg', color: 'var(--crit)' };
  if (du <= 2)  return { level: 'critico', label: `${du} dias úteis`, tone: 'neg', color: 'var(--crit)' };
  if (du <= 6)  return { level: 'semana', label: `${du} dias úteis`, tone: 'warn', color: 'var(--warn)' };
  return { level: 'mes', label: `${du} dias úteis`, tone: 'pos', color: 'var(--ok)' };
}
const procDULabel = (du) => du == null ? '—' : du < 0 ? `${Math.abs(du)} du atrás` : du === 0 ? 'hoje' : `${du} du`;

// soma N dias úteis a partir de fromISO (inclui pulo de feriados/fim de semana) → ISO
function procAddDU(fromISO, n) {
  const cur = procParse(fromISO); let added = 0;
  while (added < n) { cur.setDate(cur.getDate() + 1); if (procIsBiz(cur)) added++; }
  return procISO(cur);
}
// subtrai N dias úteis (margem interna)
function procSubDU(fromISO, n) {
  const cur = procParse(fromISO); let sub = 0;
  while (sub < n) { cur.setDate(cur.getDate() - 1); if (procIsBiz(cur)) sub++; }
  return procISO(cur);
}

// ---- metadados ----
const PROC_FONTE = {
  PJe:      { label: 'PJe',      sigla: 'PJe',   desc: 'Processo Judicial Eletrônico' },
  'e-SAJ':  { label: 'e-SAJ',    sigla: 'SAJ',   desc: 'Sistema e-SAJ · TJSP' },
  Projudi:  { label: 'Projudi',  sigla: 'PRJ',   desc: 'Projudi' },
  DJe:      { label: 'DJe',      sigla: 'DJe',   desc: 'Diário da Justiça Eletrônico' },
};
const PROC_FASE = {
  conhecimento: { label: 'Conhecimento' },
  instrucao:    { label: 'Instrução' },
  sentenca:     { label: 'Sentença' },
  recursal:     { label: 'Recursal' },
  execucao:     { label: 'Execução / Cumprimento' },
  distribuicao: { label: 'Aguardando distribuição' },
};
const PROC_STATUS = {
  ativo:     { label: 'Ativo', tone: 'pos' },
  suspenso:  { label: 'Suspenso', tone: 'warn' },
  distrib:   { label: 'Aguardando distribuição', tone: 'neutral' },
  baixado:   { label: 'Baixado', tone: 'neutral' },
  arquivado: { label: 'Arquivado', tone: 'neutral' },
};
// tipo de movimentação → ícone + se é, por padrão, ato relevante (gera/pode gerar prazo)
const PROC_MOV = {
  intimacao:    { label: 'Intimação',     icon: 'bell',        rel: true },
  publicacao:   { label: 'Publicação',    icon: 'fileText',    rel: true },
  decisao:      { label: 'Decisão',       icon: 'gavel',       rel: true },
  despacho:     { label: 'Despacho',      icon: 'feather',     rel: false },
  sentenca:     { label: 'Sentença',      icon: 'scale',       rel: true },
  audiencia:    { label: 'Audiência',     icon: 'users',       rel: true },
  peticao:      { label: 'Petição',       icon: 'send',        rel: false },
  juntada:      { label: 'Juntada',       icon: 'paperclip',   rel: false },
  distribuicao: { label: 'Distribuição',  icon: 'cornerDownRight', rel: false },
  cartorario:   { label: 'Ato ordinatório', icon: 'circleDot', rel: false },
};

// ============================================================================
// PROCESSOS
// ============================================================================
const PROC_PROCESSOS = [
  {
    id: 'P001', numero: '1004567-12.2024.8.26.0100', classe: 'Procedimento Comum Cível',
    assunto: 'Inadimplemento contratual · cobrança', tribunal: 'TJSP', comarca: 'São Paulo/SP',
    vara: '12ª Vara Cível', instancia: '1ª instância', fase: 'conhecimento', fonte: 'e-SAJ',
    status: 'ativo', segredo: false, clienteId: 'C008', clienteNome: 'Ah Hoc Serviços Ltda',
    nossoPolo: 'réu', responsavel: 'leonardo', distribuicao: '2024-11-08', ultimaMov: '2026-06-05',
    valorCausa: 450000,
    partes: [
      { papel: 'autor', nome: 'Construtora Andrade Ltda.', tipo: 'PJ', adv: 'Dra. Renata Fonseca · OAB/SP 248.119' },
      { papel: 'réu', nome: 'Ah Hoc Serviços Ltda', tipo: 'PJ', adv: 'NCM Advogados (nós)', nosso: true },
    ],
    apensos: [],
    financeiro: { honorarios: 60000, recebido: 20000, custas: 9420, despesas: [
      { desc: 'Custas de contestação', valor: 1280, reemb: true },
      { desc: 'Cópias e autenticações', valor: 340, reemb: true },
    ] },
  },
  {
    id: 'P002', numero: '5009876-45.2023.4.03.6100', classe: 'Mandado de Segurança Cível',
    assunto: 'Crédito tributário · exigibilidade', tribunal: 'TRF3', comarca: 'São Paulo/SP',
    vara: '3ª Vara Federal Cível', instancia: '1ª instância', fase: 'conhecimento', fonte: 'PJe',
    status: 'ativo', segredo: false, clienteId: 'C019', clienteNome: 'Atlântico Logística Ltda.',
    nossoPolo: 'impetrante', responsavel: 'leandro', distribuicao: '2023-09-14', ultimaMov: '2026-06-09',
    valorCausa: 1280000,
    partes: [
      { papel: 'impetrante', nome: 'Atlântico Logística Ltda.', tipo: 'PJ', adv: 'NCM Advogados (nós)', nosso: true },
      { papel: 'autoridade coatora', nome: 'Delegado da Receita Federal em São Paulo', tipo: 'órgão', adv: 'União (PFN)' },
    ],
    apensos: [],
    financeiro: { honorarios: 96000, recebido: 64000, custas: 21800, despesas: [
      { desc: 'Custas iniciais MS', valor: 18500, reemb: true },
      { desc: 'Cópia de processo administrativo', valor: 870, reemb: true },
    ] },
  },
  {
    id: 'P003', numero: '1000234-56.2024.5.02.0011', classe: 'Reclamação Trabalhista',
    assunto: 'Verbas rescisórias · horas extras', tribunal: 'TRT-2', comarca: 'São Paulo/SP',
    vara: '11ª Vara do Trabalho de São Paulo', instancia: '1ª instância', fase: 'instrucao', fonte: 'PJe',
    status: 'ativo', segredo: false, clienteId: 'C010', clienteNome: 'Construtora Aurora S/A',
    nossoPolo: 'reclamada', responsavel: 'leandro', distribuicao: '2024-02-19', ultimaMov: '2026-06-08',
    valorCausa: 180000,
    partes: [
      { papel: 'reclamante', nome: 'José Antônio da Silva', tipo: 'PF', adv: 'Dr. Sérgio Vasques · OAB/SP 199.402' },
      { papel: 'reclamada', nome: 'Construtora Aurora S/A', tipo: 'PJ', adv: 'NCM Advogados (nós)', nosso: true },
    ],
    apensos: [],
    financeiro: { honorarios: 42000, recebido: 18000, custas: 3600, despesas: [
      { desc: 'Honorários periciais (insalubridade)', valor: 3200, reemb: false },
    ] },
  },
  {
    id: 'P004', numero: '1009988-30.2024.8.26.0224', classe: 'Procedimento Comum Cível',
    assunto: 'Indenização por danos morais', tribunal: 'TJSP', comarca: 'Guarulhos/SP',
    vara: '4ª Vara Cível', instancia: '1ª instância', fase: 'conhecimento', fonte: 'e-SAJ',
    status: 'ativo', segredo: false, clienteId: 'C012', clienteNome: 'Helena Vargas',
    nossoPolo: 'autora', responsavel: 'leonardo', distribuicao: '2024-12-03', ultimaMov: '2026-06-10',
    valorCausa: 80000,
    partes: [
      { papel: 'autor', nome: 'Helena Vargas', tipo: 'PF', adv: 'NCM Advogados (nós)', nosso: true },
      { papel: 'réu', nome: 'Banco Cruzeiro do Sul S.A.', tipo: 'PJ', adv: 'Dr. Paulo Nogueira · OAB/SP 156.330' },
    ],
    apensos: [],
    financeiro: { honorarios: 24000, recebido: 8000, custas: 1640, despesas: [] },
  },
  {
    id: 'P005', numero: '2012345-67.2025.8.26.0000', classe: 'Agravo de Instrumento',
    assunto: 'Tutela de urgência · efeito suspensivo', tribunal: 'TJSP', comarca: 'São Paulo/SP',
    vara: '2ª Câmara de Direito Privado', instancia: '2ª instância', fase: 'recursal', fonte: 'e-SAJ',
    status: 'distrib', segredo: false, clienteId: 'C017', clienteNome: 'Indústria Kessler S/A',
    nossoPolo: 'agravante', responsavel: 'leandro', distribuicao: '2025-06-09', ultimaMov: '2026-06-09',
    valorCausa: 2300000,
    partes: [
      { papel: 'agravante', nome: 'Indústria Kessler S/A', tipo: 'PJ', adv: 'NCM Advogados (nós)', nosso: true },
      { papel: 'agravado', nome: 'Banco Itaú Unibanco S.A.', tipo: 'PJ', adv: 'Dra. Lúcia Tavares · OAB/SP 155.804' },
    ],
    apensos: ['P-RJ Kessler · 1ª instância'],
    financeiro: { honorarios: 180000, recebido: 90000, custas: 38400, despesas: [
      { desc: 'Preparo do agravo', valor: 11500, reemb: true },
    ] },
  },
  {
    id: 'P006', numero: '1003321-88.2025.8.26.0100', classe: 'Execução de Título Extrajudicial',
    assunto: 'Duplicatas · cumprimento', tribunal: 'TJSP', comarca: 'São Paulo/SP',
    vara: '7ª Vara Cível', instancia: '1ª instância', fase: 'execucao', fonte: 'e-SAJ',
    status: 'ativo', segredo: false, clienteId: 'C016', clienteNome: 'Editora Linhares Ltda.',
    nossoPolo: 'exequente', responsavel: 'leonardo', distribuicao: '2025-03-21', ultimaMov: '2026-06-10',
    valorCausa: 320000,
    partes: [
      { papel: 'exequente', nome: 'Editora Linhares Ltda.', tipo: 'PJ', adv: 'NCM Advogados (nós)', nosso: true },
      { papel: 'executado', nome: 'Gráfica Meridiano Ltda.', tipo: 'PJ', adv: 'Dr. Henrique Salles · OAB/SP 388.901' },
    ],
    apensos: [],
    financeiro: { honorarios: 48000, recebido: 24000, custas: 6400, despesas: [
      { desc: 'Pesquisa Sisbajud/Renajud', valor: 92, reemb: true },
    ] },
  },
  {
    id: 'P007', numero: '0008765-23.2022.8.26.0001', classe: 'Inventário',
    assunto: 'Sucessão · partilha de bens', tribunal: 'TJSP', comarca: 'São Paulo/SP',
    vara: '2ª Vara da Família e Sucessões', instancia: '1ª instância', fase: 'conhecimento', fonte: 'e-SAJ',
    status: 'ativo', segredo: true, clienteId: 'C015', clienteNome: 'Família Soares',
    nossoPolo: 'inventariante', responsavel: 'leandro', distribuicao: '2022-08-30', ultimaMov: '2026-06-03',
    valorCausa: 1750000,
    partes: [
      { papel: 'inventariante', nome: 'Roberto Soares (espólio de Antônio Soares)', tipo: 'PF', adv: 'NCM Advogados (nós)', nosso: true },
      { papel: 'herdeiro', nome: 'Demais herdeiros (3)', tipo: 'PF', adv: 'Dra. Cristina Maia · OAB/SP 124.553' },
    ],
    apensos: [],
    financeiro: { honorarios: 90000, recebido: 45000, custas: 28700, despesas: [
      { desc: 'ITCMD · guia', valor: 21400, reemb: false },
    ] },
  },
  {
    id: 'P008', numero: '5004432-19.2024.4.03.6100', classe: 'Ação Anulatória de Débito Fiscal',
    assunto: 'IRPJ/CSLL · auto de infração', tribunal: 'TRF3', comarca: 'São Paulo/SP',
    vara: '6ª Vara Federal Cível', instancia: '1ª instância', fase: 'conhecimento', fonte: 'PJe',
    status: 'ativo', segredo: false, clienteId: 'C013', clienteNome: 'Tech Holding LTDA',
    nossoPolo: 'autora', responsavel: 'leonardo', distribuicao: '2024-05-27', ultimaMov: '2026-06-02',
    valorCausa: 5400000,
    partes: [
      { papel: 'autor', nome: 'Tech Holding LTDA', tipo: 'PJ', adv: 'NCM Advogados (nós)', nosso: true },
      { papel: 'réu', nome: 'União Federal (Fazenda Nacional)', tipo: 'órgão', adv: 'PFN' },
    ],
    apensos: [],
    financeiro: { honorarios: 240000, recebido: 120000, custas: 62000, despesas: [] },
  },
  {
    id: 'P009', numero: '1007654-90.2025.8.26.0309', classe: 'Ação de Despejo por Falta de Pagamento',
    assunto: 'Locação comercial · despejo c/c cobrança', tribunal: 'TJSP', comarca: 'Jundiaí/SP',
    vara: '3ª Vara Cível', instancia: '1ª instância', fase: 'conhecimento', fonte: 'e-SAJ',
    status: 'ativo', segredo: false, clienteId: 'C007', clienteNome: 'Abcesp Treinamentos e Eventos Ltda',
    nossoPolo: 'autora', responsavel: 'marina', distribuicao: '2025-04-15', ultimaMov: '2026-06-09',
    valorCausa: 96000,
    partes: [
      { papel: 'autor', nome: 'Abcesp Treinamentos e Eventos Ltda', tipo: 'PJ', adv: 'NCM Advogados (nós)', nosso: true },
      { papel: 'réu', nome: 'Mendonça & Filhos Com. Ltda', tipo: 'PJ', adv: 'Dr. Rui Barreto · OAB/SP 901.224' },
    ],
    apensos: [],
    financeiro: { honorarios: 18000, recebido: 9000, custas: 1920, despesas: [] },
  },
];

// ============================================================================
// PRAZOS  — fatal (limite legal) × interno (margem de segurança da equipe)
// status: pendente | em_andamento | protocolado | cumprido
// ============================================================================
const PROC_PRAZOS = [
  { id: 'PZ01', processoId: 'P001', peca: 'Contestação', tipoPeca: 'Defesa', fatal: '2026-06-15', interno: '2026-06-12', responsavel: 'leonardo', status: 'em_andamento', origemMov: 'M101', obs: 'Tese: prescrição + ausência de mora.' },
  { id: 'PZ02', processoId: 'P006', peca: 'Manifestação sobre embargos', tipoPeca: 'Manifestação', fatal: '2026-06-16', interno: '2026-06-15', responsavel: 'leonardo', status: 'pendente', origemMov: 'M601', obs: '' },
  { id: 'PZ03', processoId: 'P009', peca: 'Especificação de provas', tipoPeca: 'Manifestação', fatal: '2026-06-18', interno: '2026-06-16', responsavel: 'marina', status: 'pendente', origemMov: 'M901', obs: '' },
  { id: 'PZ04', processoId: 'P002', peca: 'Manifestação sobre informações', tipoPeca: 'Manifestação', fatal: '2026-06-19', interno: '2026-06-17', responsavel: 'leandro', status: 'pendente', origemMov: 'M201', obs: 'Réplica às informações da autoridade coatora.' },
  { id: 'PZ05', processoId: 'P004', peca: 'Réplica', tipoPeca: 'Réplica', fatal: '2026-06-23', interno: '2026-06-20', responsavel: 'leonardo', status: 'pendente', origemMov: 'M401', obs: '' },
  { id: 'PZ06', processoId: 'P007', peca: 'Últimas declarações', tipoPeca: 'Petição', fatal: '2026-06-30', interno: '2026-06-26', responsavel: 'leandro', status: 'pendente', origemMov: 'M701', obs: '' },
  { id: 'PZ07', processoId: 'P008', peca: 'Réplica à contestação', tipoPeca: 'Réplica', fatal: '2026-07-03', interno: '2026-06-30', responsavel: 'leonardo', status: 'pendente', origemMov: 'M801', obs: '' },
  { id: 'PZ08', processoId: 'P003', peca: 'Razões finais', tipoPeca: 'Memoriais', fatal: '2026-07-08', interno: '2026-07-03', responsavel: 'leandro', status: 'pendente', origemMov: null, obs: 'Após audiência de instrução.' },
  // já cumpridos / protocolados — histórico
  { id: 'PZ09', processoId: 'P002', peca: 'Petição inicial', tipoPeca: 'Inicial', fatal: '2023-09-14', interno: '2023-09-12', responsavel: 'leandro', status: 'protocolado', origemMov: null, obs: '' },
  { id: 'PZ10', processoId: 'P005', peca: 'Petição de agravo', tipoPeca: 'Recurso', fatal: '2025-06-09', interno: '2025-06-06', responsavel: 'leandro', status: 'protocolado', origemMov: null, obs: '' },
];

// ============================================================================
// AUDIÊNCIAS / compromissos processuais
// ============================================================================
const PROC_AUDIENCIAS = [
  { id: 'AU01', processoId: 'P006', titulo: 'Audiência de conciliação', dia: '2026-06-11', hora: '15:00', local: 'CEJUSC Central · Sala 4', responsavel: 'leonardo', tipo: 'conciliação' },
  { id: 'AU02', processoId: 'P004', titulo: 'Audiência de conciliação', dia: '2026-06-17', hora: '10:00', local: 'Fórum de Guarulhos · Sala 7', responsavel: 'leonardo', tipo: 'conciliação' },
  { id: 'AU03', processoId: 'P003', titulo: 'Audiência de instrução e julgamento', dia: '2026-06-29', hora: '14:00', local: 'Fórum Trabalhista Ruy Barbosa · 11ª VT', responsavel: 'leandro', tipo: 'instrução' },
];

// ============================================================================
// ANDAMENTOS — linha do tempo + caixa de triagem.
// triagem: pendente (nova, a triar) | relevante | cartorario | arquivada
// processoId pode ser null (publicação capturada e ainda não vinculada).
// ============================================================================
const PROC_ANDAMENTOS = [
  // ---- caixa de entrada (capturadas recentemente, a triar) ----
  { id: 'M101', processoId: 'P001', data: '2026-06-05', hora: '08:12', fonte: 'e-SAJ', tipo: 'intimacao', triagem: 'pendente', lido: false,
    titulo: 'Intimação — apresentar contestação', orgao: '12ª Vara Cível de São Paulo',
    descricao: 'Fica a parte ré intimada para, no prazo legal, apresentar contestação aos termos da inicial (CPC, art. 335).',
    prazoSugerido: { peca: 'Contestação', dias: 15 } },
  { id: 'M601', processoId: 'P006', data: '2026-06-06', hora: '14:41', fonte: 'e-SAJ', tipo: 'decisao', triagem: 'pendente', lido: false,
    titulo: 'Decisão — recebidos os embargos à execução', orgao: '7ª Vara Cível de São Paulo',
    descricao: 'Recebidos os embargos opostos pela executada. Intime-se a exequente para manifestação em 15 dias.',
    prazoSugerido: { peca: 'Manifestação sobre embargos', dias: 15 } },
  { id: 'M901', processoId: 'P009', data: '2026-06-09', hora: '11:03', fonte: 'e-SAJ', tipo: 'despacho', triagem: 'pendente', lido: false,
    titulo: 'Despacho — especificação de provas', orgao: '3ª Vara Cível de Jundiaí',
    descricao: 'Especifiquem as partes as provas que pretendem produzir, justificando-as, no prazo de 5 dias.',
    prazoSugerido: { peca: 'Especificação de provas', dias: 5 } },
  { id: 'MX01', processoId: null, data: '2026-06-10', hora: '06:30', fonte: 'DJe', tipo: 'publicacao', triagem: 'pendente', lido: false,
    titulo: 'Publicação DJe — processo a vincular', orgao: 'DJe TJSP · Caderno 3',
    descricao: 'Publicação capturada por monitoramento (OAB/SP 184.221). Vínculo automático com processo não confirmado.',
    prazoSugerido: null },
  { id: 'M201', processoId: 'P002', data: '2026-06-09', hora: '09:50', fonte: 'PJe', tipo: 'intimacao', triagem: 'pendente', lido: false,
    titulo: 'Intimação — manifestação sobre informações', orgao: '3ª Vara Federal Cível de SP',
    descricao: 'Prestadas as informações pela autoridade coatora, manifeste-se a impetrante no prazo de 10 dias.',
    prazoSugerido: { peca: 'Manifestação', dias: 10 } },
  { id: 'MX02', processoId: null, data: '2026-06-11', hora: '06:18', fonte: 'DJe', tipo: 'cartorario', triagem: 'pendente', lido: false,
    titulo: 'Publicação DJe — mera certidão de cartório', orgao: 'DJe TJSP · Caderno 1',
    descricao: 'Certidão de decurso de prazo. Sem providência da parte (ato ordinatório).',
    prazoSugerido: null },

  // ---- já triadas: relevantes ----
  { id: 'M401', processoId: 'P004', data: '2026-06-02', hora: '10:20', fonte: 'e-SAJ', tipo: 'intimacao', triagem: 'relevante', lido: true,
    titulo: 'Intimação — réplica', orgao: '4ª Vara Cível de Guarulhos',
    descricao: 'Apresentada a contestação, manifeste-se a autora em réplica, no prazo de 15 dias.', prazoSugerido: { peca: 'Réplica', dias: 15 } },
  { id: 'M801', processoId: 'P008', data: '2026-05-28', hora: '16:05', fonte: 'PJe', tipo: 'intimacao', triagem: 'relevante', lido: true,
    titulo: 'Intimação — réplica à contestação', orgao: '6ª Vara Federal Cível de SP',
    descricao: 'Manifeste-se a autora sobre a contestação da União, em 15 dias.', prazoSugerido: { peca: 'Réplica', dias: 15 } },
  { id: 'M701', processoId: 'P007', data: '2026-06-03', hora: '13:30', fonte: 'e-SAJ', tipo: 'despacho', triagem: 'relevante', lido: true,
    titulo: 'Despacho — últimas declarações', orgao: '2ª Vara da Família e Sucessões',
    descricao: 'Apresente o inventariante as últimas declarações e plano de partilha.', prazoSugerido: { peca: 'Últimas declarações', dias: 15 } },

  // ---- cartorários / sem prazo (triadas) ----
  { id: 'M102', processoId: 'P001', data: '2026-05-22', hora: '17:40', fonte: 'e-SAJ', tipo: 'juntada', triagem: 'cartorario', lido: true,
    titulo: 'Juntada de petição da parte autora', orgao: '12ª Vara Cível de São Paulo', descricao: 'Juntada de documentos pela parte autora.', prazoSugerido: null },
  { id: 'M103', processoId: 'P001', data: '2024-11-08', hora: '00:00', fonte: 'e-SAJ', tipo: 'distribuicao', triagem: 'cartorario', lido: true,
    titulo: 'Distribuição por dependência', orgao: '12ª Vara Cível de São Paulo', descricao: 'Processo distribuído à 12ª Vara Cível.', prazoSugerido: null },
  { id: 'M202', processoId: 'P002', data: '2026-05-30', hora: '08:00', fonte: 'PJe', tipo: 'juntada', triagem: 'cartorario', lido: true,
    titulo: 'Juntada de informações da autoridade coatora', orgao: '3ª Vara Federal Cível de SP', descricao: 'Prestadas as informações pela autoridade impetrada.', prazoSugerido: null },
  { id: 'M301', processoId: 'P003', data: '2026-06-08', hora: '11:15', fonte: 'PJe', tipo: 'decisao', triagem: 'relevante', lido: true,
    titulo: 'Designada audiência de instrução', orgao: '11ª Vara do Trabalho de SP', descricao: 'Designada audiência de instrução e julgamento para 29/06/2026, às 14h.', prazoSugerido: null },
  { id: 'M501', processoId: 'P005', data: '2026-06-09', hora: '15:22', fonte: 'e-SAJ', tipo: 'peticao', triagem: 'cartorario', lido: true,
    titulo: 'Interposição de agravo de instrumento', orgao: 'TJSP · 2ª Câmara de Direito Privado', descricao: 'Protocolado agravo de instrumento com pedido de efeito suspensivo.', prazoSugerido: null },
  { id: 'M602', processoId: 'P006', data: '2026-04-18', hora: '09:10', fonte: 'e-SAJ', tipo: 'decisao', triagem: 'cartorario', lido: true,
    titulo: 'Citação da executada', orgao: '7ª Vara Cível de São Paulo', descricao: 'Cite-se a executada para pagar em 3 dias.', prazoSugerido: null },
];

// ---- documentos vinculados (por processo, com versão) ----
const PROC_DOCS = [
  { id: 'PD01', processoId: 'P001', nome: 'Contestação — Incorporadora Beta (minuta)', tipo: 'Contestação', versao: 'v3', status: 'rascunho', data: '2026-06-09', autor: 'leonardo' },
  { id: 'PD02', processoId: 'P001', nome: 'Procuração ad judicia', tipo: 'Procuração', versao: 'v1', status: 'final', data: '2024-11-05', autor: 'marina' },
  { id: 'PD03', processoId: 'P002', nome: 'Petição inicial — MS', tipo: 'Petição', versao: 'v2', status: 'final', data: '2023-09-12', autor: 'leandro' },
  { id: 'PD04', processoId: 'P002', nome: 'Parecer — manifestação sobre informações', tipo: 'Parecer', versao: 'v1', status: 'revisão', data: '2026-06-10', autor: 'leandro' },
  { id: 'PD05', processoId: 'P004', nome: 'Contestação do réu (cópia)', tipo: 'Contestação', versao: 'v1', status: 'final', data: '2026-05-30', autor: 'marina' },
  { id: 'PD06', processoId: 'P006', nome: 'Embargos à execução (cópia)', tipo: 'Embargos', versao: 'v1', status: 'final', data: '2026-06-02', autor: 'marina' },
];

// ---- anotações internas / estratégia (separadas do que é visível ao cliente) ----
const PROC_NOTAS = [
  { id: 'N01', processoId: 'P001', autor: 'leonardo', data: '2026-06-09', texto: 'Tese central: prescrição da pretensão (art. 206, §5º, I). Subsidiariamente, ausência de mora — notificação extrajudicial é genérica. Anexar e-mails de renegociação.' },
  { id: 'N02', processoId: 'P001', autor: 'thiago', data: '2026-06-05', texto: 'Cliente pediu cenário de acordo até R$ 280 mil. Avaliar proposta na audiência.' },
  { id: 'N03', processoId: 'P002', autor: 'leandro', data: '2026-06-10', texto: 'Reforçar precedente do STJ (Tema 1.079). Pedir tutela para suspender exigibilidade durante a manifestação.' },
];

// ============================================================================
// builder + selectors
// ============================================================================
function procBuildStore() {
  return {
    processos: PROC_PROCESSOS.map((p) => ({ ...p })),
    prazos: PROC_PRAZOS.map((p) => ({ ...p })),
    audiencias: PROC_AUDIENCIAS.map((a) => ({ ...a })),
    andamentos: PROC_ANDAMENTOS.map((a) => ({ ...a })),
    docs: PROC_DOCS.map((d) => ({ ...d })),
    notas: PROC_NOTAS.map((n) => ({ ...n })),
  };
}
const procById = (ps, id) => ps.processos.find((p) => p.id === id);
const procNossaParte = (p) => (p.partes || []).find((x) => x.nosso) || p.partes[0];
const procContraria = (p) => (p.partes || []).find((x) => !x.nosso) || p.partes[1];
// número CNJ curto p/ rótulos de aba
const procCurto = (numero) => numero ? numero.split('-')[0] + '…' : '—';

Object.assign(window, {
  PROC_TODAY, PROC_FONTE, PROC_FASE, PROC_STATUS, PROC_MOV,
  procDU, procDULabel, procUrgency, procISO, procParse, procAddDU, procSubDU,
  procBuildStore, procById, procNossaParte, procContraria, procCurto,
});
