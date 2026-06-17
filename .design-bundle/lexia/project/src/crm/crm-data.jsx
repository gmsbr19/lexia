// LexIA · CRM — data model + seed. Money as plain reais (formatted via fxMoney).
// Entities: usuarios, socios, clientes, casos, contratos(=honorários), lancamentos, tarefas, eventos.

const CRM_TODAY = '2026-06-11';

// ---- people ----
const CRM_USERS = [
  { id: 'thiago',  nome: 'Thiago Moraes',   email: 'thiago@moraesadv.com.br',   role: 'admin', ativo: true, iniciais: 'TM' },
  { id: 'leandro', nome: 'Leandro Moraes',  email: 'leandro@moraesadv.com.br',  role: 'socio', ativo: true, iniciais: 'LM' },
  { id: 'leonardo',nome: 'Leonardo Prado',  email: 'leonardo@moraesadv.com.br', role: 'socio', ativo: true, iniciais: 'LP' },
  { id: 'marina',  nome: 'Marina Castro',   email: 'marina@moraesadv.com.br',   role: 'staff', ativo: true, iniciais: 'MC' },
  { id: 'rafael',  nome: 'Rafael Nunes',    email: 'rafael@moraesadv.com.br',   role: 'staff', ativo: false, iniciais: 'RN' },
];
const CRM_SOCIOS = ['leandro', 'leonardo'];                  // exactly 2, for rateio
const crmUser = (id) => CRM_USERS.find((u) => u.id === id) || { nome: '—', iniciais: '—' };
const crmFirst = (id) => crmUser(id).nome.split(' ')[0];

// ---- helpers ----
const crmInitials = (name) => {
  const p = name.trim().split(/\s+/).filter((w) => w.length > 2 || /[A-Z]/.test(w[0]));
  const a = (p[0] || name)[0] || '?';
  const b = (p[1] || '')[0] || (p[0] || '')[1] || '';
  return (a + b).toUpperCase();
};
const crmCidades = [
  ['São Paulo', 'SP'], ['Campinas', 'SP'], ['Santo André', 'SP'], ['Guarulhos', 'SP'],
  ['Curitiba', 'PR'], ['Londrina', 'PR'], ['Rio de Janeiro', 'RJ'], ['Belo Horizonte', 'MG'],
];

// ---- clientes ----
// nome, apelido, tipo PF|PJ, classe cliente|lead, doc, cidade idx, emails, fones
const CRM_CLIENTES_RAW = [
  ['A. A.', '', 'PF', 'cliente', '', 0],
  ['ADOLFO DEBCZYNSKI FILHO', 'Adolfo', 'PF', 'cliente', '124.553.889-20', 1],
  ['ALINE ALMEIDA DE PAULA', 'Aline', 'PF', 'cliente', '388.901.226-71', 0],
  ['ANTONIA AUGUSTA CLARIZIA', 'Antonia', 'PF', 'cliente', '901.224.553-09', 2],
  ['ANTONIO JOSE RODRIGUES', 'Antônio', 'PF', 'cliente', '233.789.114-55', 0],
  ['ASSOCIACAO AMIGOS DO LOTEAMENTO PORTAL DAS AGUAS', 'Portal das Águas', 'PJ', 'cliente', '18.443.902/0001-12', 3],
  ['Abcesp Treinamentos e Eventos Ltda', 'Abcesp', 'PJ', 'cliente', '09.221.554/0001-80', 0],
  ['Ah Hoc Serviços Ltda', 'Ah Hoc', 'PJ', 'cliente', '22.118.443/0001-55', 4],
  ['Carlos Yamashita', 'Carlos', 'PF', 'cliente', '155.804.221-30', 0],
  ['Construtora Aurora S/A', 'Aurora', 'PJ', 'cliente', '04.991.220/0001-44', 0],
  ['Marcelo Lopes', 'Marcelo', 'PF', 'cliente', '709.331.882-14', 5],
  ['Helena Vargas', 'Helena', 'PF', 'cliente', '622.014.778-90', 6],
  ['Tech Holding LTDA', 'Tech Holding', 'PJ', 'cliente', '31.880.114/0001-09', 0],
  ['Mendonça & Filhos Com. Ltda', 'Mendonça', 'PJ', 'cliente', '12.557.330/0001-71', 2],
  ['Família Soares', 'Soares', 'PF', 'cliente', '480.223.119-04', 1],
  ['Editora Linhares Ltda', 'Linhares', 'PJ', 'cliente', '08.330.557/0001-22', 6],
  ['Indústria Kessler S/A', 'Kessler', 'PJ', 'cliente', '27.114.880/0001-63', 4],
  ['Vértice Capital Gestão', 'Vértice', 'PJ', 'cliente', '35.902.118/0001-30', 6],
  ['Atlântico Logística Ltda', 'Atlântico', 'PJ', 'cliente', '19.557.220/0001-88', 3],
  ['Beatriz Camargo', 'Bia', 'PF', 'lead', '', 0],
  ['OtávioBastos', 'Otávio', 'PF', 'lead', '', 1],
  ['Nova Era Incorporações', 'Nova Era', 'PJ', 'lead', '', 0],
];

function crmBuildClientes() {
  return CRM_CLIENTES_RAW.map((r, i) => {
    const [nome, apelido, tipo, classe, doc, cidx] = r;
    const [cidade, uf] = doc || classe === 'lead' ? crmCidades[cidx] : crmCidades[cidx];
    const first = (apelido || nome.split(' ')[0]).toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
    return {
      id: 'C' + String(i + 1).padStart(3, '0'),
      nome, apelido, tipo, classe, doc,
      cidade: classe === 'lead' && !doc ? (i % 2 ? cidade : '') : cidade,
      uf: classe === 'lead' && !doc ? (i % 2 ? uf : '') : uf,
      iniciais: crmInitials(nome),
      emails: doc ? [`${first}@${tipo === 'PJ' ? 'empresa.com.br' : 'gmail.com'}`] : [],
      fones: doc ? [`(${10 + (i % 80)}) 9${8000 + i}-${1000 + i * 7 % 9000}`] : [],
      endereco: doc ? { log: 'Av. Paulista', num: String(100 + i * 13), compl: tipo === 'PJ' ? `Conj. ${10 + i}` : '', bairro: 'Bela Vista', cidade, uf, cep: `0${1000 + i}-${100 + i}` } : null,
      notas: '',
    };
  });
}

// ---- casos ----
// titulo, clienteId idx, tipo, status, responsavel, hasProcesso
const CRM_CASOS_RAW = [
  ['ADOLFO DEBCZYNSKI FILHO x CARLOS HENRIQUE PIRES CAVANHAS', 1, 'litígio', 'ativo', 'leonardo', true, { leandro: 50, leonardo: 50 }],
  ['ASSOCIACAO AMIGOS DO LOTEAMENTO x ANTONIO JOSE RODRIGUES', 5, 'litígio', 'ativo', 'thiago', true, { leandro: 50, leonardo: 50 }],
  ['ASSOCIACAO AMIGOS DO LOTEAMENTO x CELSO GARCIA', 5, 'litígio', 'ativo', 'leonardo', true, { leandro: 50, leonardo: 50 }],
  ['Construtora Aurora · Contencioso trabalhista', 9, 'litígio', 'ativo', 'leandro', true, { leandro: 70, leonardo: 30 }],
  ['Editora Linhares · Propriedade intelectual', 15, 'litígio', 'ativo', 'leonardo', true, { leandro: 40, leonardo: 60 }],
  ['Indústria Kessler · Recuperação judicial', 16, 'litígio', 'ativo', 'leandro', true, { leandro: 50, leonardo: 50 }],
  ['Vértice Capital · Consultivo societário', 17, 'consultivo', 'ativo', 'leonardo', false, { leandro: 30, leonardo: 70 }],
  ['Atlântico Logística · Assessoria tributária', 18, 'consultivo', 'ativo', 'thiago', false, { leandro: 50, leonardo: 50 }],
  ['Tech Holding · Reestruturação societária', 12, 'consultivo', 'ativo', 'leandro', false, { leandro: 100, leonardo: 0 }],
  ['Mendonça & Filhos · Revisão contratual', 13, 'consultivo', 'ativo', 'leonardo', false, { leandro: 0, leonardo: 100 }],
  ['Helena Vargas · Inventário', 11, 'litígio', 'ativo', 'leandro', true, { leandro: 50, leonardo: 50 }],
  ['Família Soares · Acordo cível', 14, 'litígio', 'arquivado', 'leonardo', true, { leandro: 50, leonardo: 50 }],
  ['Carlos Yamashita · Assessoria', 8, 'consultivo', 'ativo', 'thiago', false, { leandro: 50, leonardo: 50 }],
  ['Abcesp Treinamentos · Trabalhista', 6, 'litígio', 'ativo', 'leonardo', true, { leandro: 60, leonardo: 40 }],
];
const CRM_TRIBUNAIS = ['TJSP', 'TJPR', 'TRT-2', 'TJRJ', 'TJMG'];
const CRM_ACOES = ['Ação de cobrança', 'Reclamatória trabalhista', 'Ação de despejo', 'Recuperação judicial', 'Inventário', 'Ação revisional'];

function crmBuildCasos(clientes) {
  return CRM_CASOS_RAW.map((r, i) => {
    const [titulo, cidx, tipo, status, responsavel, hasProc, rateio] = r;
    const cli = clientes[cidx];
    return {
      id: 'K' + String(i + 1).padStart(3, '0'),
      titulo, clienteId: cli.id, tipo, status, responsavel, rateio: { ...rateio },
      processo: hasProc ? {
        numero: `${1000000 + i * 7327}-${20 + i % 9}.2025.8.26.${String(100 + i).padStart(4, '0')}`,
        tribunal: CRM_TRIBUNAIS[i % CRM_TRIBUNAIS.length],
        vara: `${1 + i % 12}ª Vara ${tipo === 'litígio' ? 'Cível' : 'Empresarial'}`,
        instancia: i % 3 === 0 ? '2ª instância' : '1ª instância',
        acao: CRM_ACOES[i % CRM_ACOES.length],
        valorCausa: 50000 + i * 23500,
        distribuicao: `2025-${String(1 + i % 11).padStart(2, '0')}-${String(3 + i % 25).padStart(2, '0')}`,
        ultimaMov: `2026-0${1 + i % 5}-${String(8 + i % 20).padStart(2, '0')}`,
      } : null,
    };
  });
}

// ---- contratos (honorários) + lançamentos ----
// Each contrato has 1+ lançamentos (parcels). Status lançado|recebido per parcel.
const CRM_TIPOS_CONTRATO = ['recorrente', 'parcelado', 'êxito', 'à vista'];
const CRM_CONTAS = ['Itaú · Escritório', 'Bradesco · PJ', 'Caixa · Honorários'];

function crmAddMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1 + n, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// contrato spec: casoIdx, tipo, descricao, valorParcela, startISO, count, recebidasAte
const CRM_CONTRATOS_RAW = [
  [3, 'recorrente', 'Honorários · assessoria mensal', 18000, '2026-01-20', 12, 6],
  [4, 'recorrente', 'Assessoria · propriedade intelectual', 6500, '2026-02-05', 10, 4],
  [5, 'recorrente', 'Assessoria contenciosa mensal', 21000, '2026-03-10', 9, 3],
  [6, 'recorrente', 'Retainer · consultivo societário', 16500, '2026-01-15', 12, 5],
  [7, 'recorrente', 'Assessoria tributária mensal', 12800, '2026-04-08', 8, 2],
  [8, 'parcelado', 'Consultoria societária', 12000, '2026-02-12', 6, 4],
  [9, 'parcelado', 'Revisão contratual', 8500, '2026-03-28', 4, 2],
  [10, 'êxito', 'Honorários de êxito · inventário', 42000, '2026-05-20', 1, 0],
  [6, 'à vista', 'Due diligence · M&A', 65000, '2026-06-18', 1, 0],
  [5, 'à vista', 'Honorários · recuperação judicial', 38000, '2026-06-10', 1, 0],
  [11, 'à vista', 'Acordo extrajudicial', 14500, '2026-05-08', 1, 1],
  [0, 'à vista', 'Honorários · litígio Cavanhas', 2000, '2026-04-15', 1, 0],
  [12, 'recorrente', 'Assessoria mensal Carlos Yamashita', 2000, '2025-12-20', 9, 4],
  [13, 'parcelado', 'Honorários trabalhista Abcesp', 7500, '2026-03-05', 3, 1],
];

function crmBuildContratos(casos, clientes) {
  const contratos = [], lancamentos = [];
  let cn = 0, ln = 0;
  CRM_CONTRATOS_RAW.forEach((r, i) => {
    const [casoIdx, tipo, descricao, valor, startISO, count, recebidasAte] = r;
    const caso = casos[casoIdx];
    const conta = CRM_CONTAS[i % CRM_CONTAS.length];
    const cid = 'H' + String(++cn).padStart(3, '0');
    const parcelas = [];
    for (let p = 0; p < count; p++) {
      const venc = crmAddMonths(startISO, p);
      const recebido = p < recebidasAte;
      const lid = 'L' + String(++ln).padStart(3, '0');
      const lanc = {
        id: lid, dir: 'in', contratoId: cid, casoId: caso.id, clienteId: caso.clienteId,
        descricao: count > 1 ? `${descricao} · ${p + 1}/${count}` : descricao,
        cat: tipo, valor, venc,
        status: recebido ? 'recebido' : 'lançado',
        pagoData: recebido ? venc : null, conta,
        responsavel: caso.responsavel,
      };
      lancamentos.push(lanc);
      parcelas.push(lid);
    }
    contratos.push({
      id: cid, descricao, tipo, casoId: caso.id, clienteId: caso.clienteId,
      valor, count, conta, responsavel: caso.responsavel,
      startISO, parcelas,
    });
  });
  return { contratos, lancamentos };
}

// ---- tarefas ----
// titulo, status, prioridade, prazo, responsavel, casoIdx
const CRM_TAREFAS_RAW = [
  ['Protocolar contestação · Cavanhas', 'doing', 'P1', '2026-06-12', 'leonardo', 0],
  ['Revisar minuta de acordo', 'todo', 'P2', '2026-06-15', 'leandro', 11],
  ['Reunião de alinhamento Aurora', 'todo', 'P2', '2026-06-13', 'leandro', 3],
  ['Juntar documentos · inventário Helena', 'review', 'P1', '2026-06-11', 'leandro', 10],
  ['Análise de cláusulas · Mendonça', 'todo', 'P3', '2026-06-20', 'leonardo', 9],
  ['Cálculo de custas · recuperação Kessler', 'doing', 'P2', '2026-06-16', 'leandro', 5],
  ['Parecer tributário Atlântico', 'todo', 'P2', '2026-06-25', 'thiago', 7],
  ['Enviar relatório mensal Vértice', 'done', 'P3', '2026-06-05', 'leonardo', 6],
  ['Conferir prazo recursal Linhares', 'todo', 'P1', '2026-06-14', 'leonardo', 4],
  ['Atualizar cadastro · Tech Holding', 'todo', 'P4', '2026-06-30', 'marina', 8],
];
function crmBuildTarefas(casos) {
  return CRM_TAREFAS_RAW.map((r, i) => {
    const [titulo, status, prioridade, prazo, responsavel, casoIdx] = r;
    const caso = casos[casoIdx];
    return { id: 'T' + String(i + 1).padStart(3, '0'), titulo, status, prioridade, prazo, responsavel, casoId: caso.id, clienteId: caso.clienteId };
  });
}

// ---- eventos ----
// titulo, tipo, dia(ISO), hIni, hFim, allDay, responsavel, casoIdx, local
const CRM_EVENTOS_RAW = [
  ['Audiência de instrução · Cavanhas', 'audiência', '2026-06-11', '14:00', '15:30', false, 'leonardo', 0, 'Fórum João Mendes · Sala 12'],
  ['Prazo: contestação trabalhista', 'prazo', '2026-06-12', '23:59', '', true, 'leandro', 3, ''],
  ['Reunião cliente Vértice Capital', 'reunião', '2026-06-11', '10:00', '11:00', false, 'leonardo', 6, 'meet.google.com/lex-vrt'],
  ['Audiência de conciliação · Portal das Águas', 'audiência', '2026-06-15', '09:30', '10:30', false, 'thiago', 1, 'TJSP · Vara Cível'],
  ['Prazo: recurso Linhares', 'prazo', '2026-06-14', '23:59', '', true, 'leonardo', 4, ''],
  ['Reunião societária Tech Holding', 'reunião', '2026-06-16', '15:00', '16:30', false, 'leandro', 8, 'Escritório · Sala 2'],
  ['Despacho com juiz · Kessler', 'audiência', '2026-06-18', '11:00', '11:30', false, 'leandro', 5, 'Fórum Central'],
  ['Prazo: manifestação Mendonça', 'prazo', '2026-06-20', '23:59', '', true, 'leonardo', 9, ''],
  ['Reunião de equipe semanal', 'reunião', '2026-06-12', '09:00', '09:45', false, 'thiago', null, 'Escritório'],
  ['Entrega de parecer Atlântico', 'outro', '2026-06-25', '', '', true, 'thiago', 7, ''],
  ['Audiência una · Inventário Helena', 'audiência', '2026-06-22', '13:30', '14:30', false, 'leandro', 10, 'Fórum Regional'],
];
function crmBuildEventos(casos) {
  return CRM_EVENTOS_RAW.map((r, i) => {
    const [titulo, tipo, dia, hIni, hFim, allDay, responsavel, casoIdx, local] = r;
    const caso = casoIdx != null ? casos[casoIdx] : null;
    return {
      id: 'E' + String(i + 1).padStart(3, '0'), titulo, tipo, dia, hIni, hFim, allDay,
      responsavel, casoId: caso ? caso.id : null, clienteId: caso ? caso.clienteId : null,
      local, status: 'confirmado',
    };
  });
}

// ---- documentos (metadata only) ----
const CRM_DOCS_RAW = [
  ['Contrato de Honorários', 'Contrato de Honorários', 'PDF', '2026-05-28', 'finalizado', 9],
  ['Procuração ad judicia', 'Procuração', 'PDF', '2026-05-12', 'finalizado', 9],
  ['Petição inicial · trabalhista', 'Petição', 'DOCX', '2026-06-02', 'rascunho', 3],
];

// ---- root builder ----
function crmBuildStore() {
  const clientes = crmBuildClientes();
  const casos = crmBuildCasos(clientes);
  const { contratos, lancamentos } = crmBuildContratos(casos, clientes);
  const tarefas = crmBuildTarefas(casos);
  const eventos = crmBuildEventos(casos);
  const documentos = CRM_DOCS_RAW.map((r, i) => {
    const [nome, modelo, formato, data, status, cidx] = r;
    return { id: 'D' + String(i + 1).padStart(3, '0'), nome, modelo, formato, data, status, clienteId: clientes[cidx].id };
  });
  return { clientes, casos, contratos, lancamentos, tarefas, eventos, documentos };
}

Object.assign(window, {
  CRM_TODAY, CRM_USERS, CRM_SOCIOS, CRM_CONTAS, CRM_TIPOS_CONTRATO,
  crmUser, crmFirst, crmInitials, crmAddMonths, crmBuildStore,
});
