// LexIA · Comercial / Marketing — data model + helpers (prefixed Cm / cm).
// Entities:
//   Lead     — a prospective client. etapa ∈ novo|contato|qualificado|proposta|ganho|perdido.
//              reach = furthest funnel stage reached (0..4). For perdido, reach = drop stage.
//   Campanha — an ad campaign on Google Ads / Meta Ads.
//   Gasto    — a single ad-spend entry tied to a campaign (also a financial expense).
// Period metrics scope a lead by its dataEntrada and a gasto by its data.

const CM_TODAY = '2026-06-09';
const CM_REF0 = { y: 2026, m: 5 };               // junho/2026
const CM_MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const CM_MON_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// ---- money / numbers ----
const _cmBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const cmMoney = (n) => _cmBRL.format(n || 0).replace('-', '−');
const cmCompact = (n) => {
  const a = Math.abs(n || 0), s = n < 0 ? '−' : '';
  if (a >= 1000) return `${s}R$ ${(a / 1000).toLocaleString('pt-BR', { minimumFractionDigits: a >= 100000 ? 0 : 1, maximumFractionDigits: 1 })} mil`;
  return cmMoney(n);
};
const cmInt = (n) => (n || 0).toLocaleString('pt-BR');
const cmPct = (n, d = 1) => `${(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
const cmRoas = (n) => (n == null || !isFinite(n)) ? '—' : `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`;

// ---- dates ----
const cmDate = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y.slice(2)}`; };
const cmDateLong = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-').map(Number); return `${d} ${CM_MON[m - 1]} ${y}`; };
const cmYear = (iso) => Number(iso.slice(0, 4));
const cmMonthIdx = (iso) => Number(iso.slice(5, 7)) - 1;
const cmDay = (iso) => Number(iso.slice(8, 10));
const cmQuarter = (iso) => Math.floor(cmMonthIdx(iso) / 3);
function cmDaysTo(iso) { return Math.round((new Date(iso + 'T12:00:00') - new Date(CM_TODAY + 'T12:00:00')) / 86400000); }

// ---- period scope ----
function cmInPeriod(iso, ref, period) {
  if (!iso) return false;
  if (cmYear(iso) !== ref.y) return false;
  if (period === 'ano') return true;
  if (period === 'trimestre') return cmQuarter(iso) === Math.floor(ref.m / 3);
  return cmMonthIdx(iso) === ref.m;
}
function cmScope(ref, period) {
  const { y, m } = ref;
  if (period === 'ano') return { title: `${y}`, sub: 'Ano completo', test: (iso) => cmInPeriod(iso, ref, period) };
  if (period === 'trimestre') { const q = Math.floor(m / 3), a = q * 3; return { title: `${q + 1}º trimestre`, sub: `${CM_MON[a]}–${CM_MON[a + 2]} · ${y}`, test: (iso) => cmInPeriod(iso, ref, period) }; }
  return { title: CM_MON_FULL[m], sub: `${y}`, test: (iso) => cmInPeriod(iso, ref, period) };
}
function cmShiftRef(ref, period, delta) {
  let { y, m } = ref;
  if (period === 'ano') y += delta; else if (period === 'trimestre') m += delta * 3; else m += delta;
  while (m < 0) { m += 12; y -= 1; } while (m > 11) { m -= 12; y += 1; }
  return { y, m };
}

// ---- taxonomies ----
const CM_STAGES = [
  { key: 'novo', label: 'Novo', color: '#7C8AA5' },
  { key: 'contato', label: 'Contato', color: '#4A78C0' },
  { key: 'qualificado', label: 'Qualificado', color: '#C0A147' },
  { key: 'proposta', label: 'Proposta', color: '#9A6FB0' },
  { key: 'ganho', label: 'Ganho', color: '#2E9E5B' },
];
const CM_STAGE_MAP = Object.fromEntries(CM_STAGES.map((s, i) => [s.key, { ...s, i }]));
const CM_STAGE_PERDIDO = { key: 'perdido', label: 'Perdido', color: '#C0492F' };
const cmStageLabel = (k) => k === 'perdido' ? 'Perdido' : (CM_STAGE_MAP[k] ? CM_STAGE_MAP[k].label : k);

const CM_ORIGENS = ['Google Ads', 'Meta Ads', 'Orgânico', 'Indicação'];
const CM_ORIGEM_META = {
  'Google Ads': { c: '#3B7DDD', short: 'GA' },
  'Meta Ads': { c: '#8B5CF6', short: 'MA' },
  'Orgânico': { c: '#2E9E5B', short: 'OR' },
  'Indicação': { c: '#C0A147', short: 'IN' },
};
const CM_PLATAFORMAS = ['Google Ads', 'Meta Ads'];
const CM_OBJETIVOS = ['Geração de leads', 'Conversão', 'Reconhecimento', 'Tráfego'];
const CM_CAMP_STATUS = ['ativa', 'pausada', 'encerrada'];
const CM_CAMP_STATUS_LABEL = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' };
const CM_MOTIVOS = ['Preço / honorários', 'Sem retorno do contato', 'Escolheu concorrente', 'Fora da área de atuação', 'Sem orçamento no momento', 'Caso inviável'];
const CM_CONTAS = ['Conta corrente · Itaú', 'Cartão corporativo', 'Conta marketing'];

// ---- seeded RNG (deterministic) ----
function cmRng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const CM_FIRST = ['Mariana', 'Rafael', 'Beatriz', 'Lucas', 'Camila', 'Felipe', 'Juliana', 'Bruno', 'Patrícia', 'Thiago', 'Aline', 'Gustavo', 'Renata', 'Diego', 'Fernanda', 'Rodrigo', 'Larissa', 'Marcelo', 'Carolina', 'André', 'Tatiana', 'Vinícius', 'Priscila', 'Eduardo', 'Sofia', 'Henrique', 'Débora', 'Gabriel', 'Letícia', 'Ricardo'];
const CM_LAST = ['Almeida', 'Souza', 'Oliveira', 'Costa', 'Pereira', 'Rodrigues', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Ribeiro', 'Barbosa', 'Teixeira', 'Nunes', 'Cardoso', 'Moraes', 'Pinto', 'Freitas', 'Lima', 'Azevedo'];
const CM_EMPRESAS = ['Construtora Vega', 'Holding Meridiano', 'Transportes Bandeirante', 'Clínica Sanare', 'Indústria Polaris', 'Agro Vale Verde', 'Rede Farma Bem', 'Grupo Litorânea', 'Metalúrgica Forte', 'Editora Página Viva', 'Café Serra Alta', 'Logística Onda Azul'];
const CM_AREAS = ['Trabalhista', 'Inventário e sucessões', 'Tributário', 'Societário', 'Imobiliário', 'Recuperação judicial', 'LGPD / Compliance', 'Cível'];

// ---- campaigns ----
function cmSeedCampaigns() {
  return [
    { id: 'C01', plataforma: 'Google Ads', nome: 'Trabalhista — Search SP', objetivo: 'Geração de leads', status: 'ativa', inicio: '2026-03-01', fim: '', extId: 'gads-8841', area: 'Trabalhista' },
    { id: 'C02', plataforma: 'Google Ads', nome: 'Inventário e Sucessões', objetivo: 'Geração de leads', status: 'ativa', inicio: '2026-03-15', fim: '', extId: 'gads-9120', area: 'Inventário e sucessões' },
    { id: 'C03', plataforma: 'Meta Ads', nome: 'Recuperação Judicial — Empresas', objetivo: 'Conversão', status: 'ativa', inicio: '2026-04-01', fim: '', extId: 'meta-2207', area: 'Recuperação judicial' },
    { id: 'C04', plataforma: 'Meta Ads', nome: 'Reforma Tributária — Retargeting', objetivo: 'Conversão', status: 'ativa', inicio: '2026-04-10', fim: '', extId: 'meta-2310', area: 'Tributário' },
    { id: 'C05', plataforma: 'Google Ads', nome: 'Consultoria Societária', objetivo: 'Geração de leads', status: 'pausada', inicio: '2026-03-05', fim: '2026-05-31', extId: 'gads-7763', area: 'Societário' },
    { id: 'C06', plataforma: 'Meta Ads', nome: 'Institucional — Branding', objetivo: 'Reconhecimento', status: 'encerrada', inicio: '2026-02-01', fim: '2026-04-30', extId: 'meta-1998', area: 'Cível' },
    { id: 'C07', plataforma: 'Google Ads', nome: 'Direito Imobiliário', objetivo: 'Geração de leads', status: 'ativa', inicio: '2026-05-01', fim: '', extId: 'gads-9455', area: 'Imobiliário' },
    { id: 'C08', plataforma: 'Meta Ads', nome: 'Compliance LGPD — Lançamento', objetivo: 'Conversão', status: 'ativa', inicio: '2026-05-12', fim: '', extId: 'meta-2562', area: 'LGPD / Compliance' },
  ];
}

// monthly spend per campaign (R$). Index 0 = mar, 1 = abr, 2 = mai, 3 = jun.
const CM_SPEND_PLAN = {
  C01: [4200, 4600, 5100, 5400], C02: [2600, 2900, 3200, 3300], C03: [0, 3800, 4200, 4600],
  C04: [0, 2200, 2600, 2900], C05: [3100, 3300, 2400, 0], C06: [1800, 1500, 0, 0],
  C07: [0, 0, 3600, 3900], C08: [0, 0, 2100, 3400],
};
function cmSeedGastos(campaigns) {
  const out = []; let n = 0;
  const months = ['2026-03', '2026-04', '2026-05', '2026-06'];
  campaigns.forEach((c) => {
    (CM_SPEND_PLAN[c.id] || []).forEach((v, i) => {
      if (v > 0) out.push({ id: `G${(++n).toString().padStart(3, '0')}`, campanhaId: c.id, valor: v, data: `${months[i]}-08`, conta: CM_CONTAS[i % CM_CONTAS.length], descricao: `Investimento ${c.plataforma} · ${CM_MON_FULL[i + 2]}` });
    });
  });
  return out;
}

// ---- leads ----
function cmSeedLeads(campaigns) {
  const rnd = cmRng(20260609);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const monthsWeight = [['2026-03', 16], ['2026-04', 23], ['2026-05', 31], ['2026-06', 40]];
  const monthPool = []; monthsWeight.forEach(([mk, w]) => { for (let i = 0; i < w; i++) monthPool.push(mk); });
  const byPlat = (p) => campaigns.filter((c) => c.plataforma === p && c.status !== 'encerrada');
  const gCamps = byPlat('Google Ads'), mCamps = byPlat('Meta Ads');
  const leads = []; let n = 0;

  monthPool.forEach((mk, idx) => {
    const r = rnd();
    let origem = r < 0.40 ? 'Google Ads' : r < 0.70 ? 'Meta Ads' : r < 0.84 ? 'Orgânico' : 'Indicação';
    let camp = null;
    if (origem === 'Google Ads') camp = pick(gCamps);
    else if (origem === 'Meta Ads') camp = pick(mCamps);
    const area = camp ? camp.area : pick(CM_AREAS);

    const isCo = rnd() < 0.42;
    const nome = isCo ? pick(CM_EMPRESAS) : `${pick(CM_FIRST)} ${pick(CM_LAST)}`;
    const ddd = pick(['11', '11', '11', '19', '21', '47']);
    const contato = `(${ddd}) 9${Math.floor(1000 + rnd() * 8999)}-${Math.floor(1000 + rnd() * 8999)}`;
    const base = isCo ? 28000 + rnd() * 72000 : 9000 + rnd() * 46000;
    const valorEstimado = Math.round(base / 500) * 500;
    const day = 1 + Math.floor(rnd() * 27);
    const dataEntrada = `${mk}-${String(day).padStart(2, '0')}`;

    // outcome distribution — newer months slightly more "in-progress"
    const o = rnd();
    let etapa, reach, valorContratado = null, cliente = null, caso = null, motivoPerda = null, dataConv = null;
    if (o < 0.20) { etapa = 'ganho'; reach = 4; const fee = valorEstimado * (0.75 + rnd() * 0.5); valorContratado = Math.round(fee / 500) * 500; cliente = nome; caso = area; dataConv = `${mk}-${String(Math.min(28, day + 3 + Math.floor(rnd() * 12))).padStart(2, '0')}`; }
    else if (o < 0.38) { etapa = 'perdido'; reach = Math.floor(rnd() * 4); motivoPerda = pick(CM_MOTIVOS); }
    else if (o < 0.52) { etapa = 'novo'; reach = 0; }
    else if (o < 0.70) { etapa = 'contato'; reach = 1; }
    else if (o < 0.85) { etapa = 'qualificado'; reach = 2; }
    else { etapa = 'proposta'; reach = 3; }

    leads.push({
      id: `L${(++n).toString().padStart(3, '0')}`, nome, contato, origem,
      campanhaId: camp ? camp.id : null, area, etapa, reach,
      valorEstimado, dataEntrada, dataConv, cliente, caso, valorContratado, motivoPerda,
    });
  });
  return leads.sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada));
}

function cmBuildSeed() {
  const campaigns = cmSeedCampaigns();
  return { campaigns, gastos: cmSeedGastos(campaigns), leads: cmSeedLeads(campaigns) };
}

// ---- metrics ----
function cmKpis(leads, gastos, ref, period) {
  const sc = cmScope(ref, period);
  const L = leads.filter((l) => sc.test(l.dataEntrada));
  const ganhos = L.filter((l) => l.etapa === 'ganho');
  const investimento = gastos.filter((g) => sc.test(g.data)).reduce((a, g) => a + g.valor, 0);
  const leadsN = L.length;
  const conv = ganhos.length;
  const valorContratado = ganhos.reduce((a, g) => a + (g.valorContratado || 0), 0);
  return {
    leads: leadsN, conversoes: conv,
    taxaConv: leadsN ? (conv / leadsN) * 100 : 0,
    investimento, valorContratado,
    roas: investimento ? valorContratado / investimento : null,
    roi: investimento ? ((valorContratado - investimento) / investimento) * 100 : null,
    cac: conv ? investimento / conv : null,
    cpl: leadsN ? investimento / leadsN : null,
    ticket: conv ? valorContratado / conv : null,
  };
}

// percentage delta vs previous equivalent period
function cmDelta(cur, prev) {
  if (prev == null || cur == null) return null;
  if (prev === 0) return cur === 0 ? 0 : null;     // null => "novo"
  return ((cur - prev) / Math.abs(prev)) * 100;
}

// trend buckets within the scope (leads vs conversões)
function cmTrend(leads, ref, period) {
  const sc = cmScope(ref, period);
  const L = leads.filter((l) => sc.test(l.dataEntrada));
  let buckets;
  if (period === 'mes') {
    buckets = [0, 1, 2, 3, 4].map((w) => ({ label: `S${w + 1}`, leads: 0, conv: 0 }));
    L.forEach((l) => { const w = Math.min(4, Math.floor((cmDay(l.dataEntrada) - 1) / 7)); buckets[w].leads++; if (l.etapa === 'ganho') buckets[w].conv++; });
  } else if (period === 'trimestre') {
    const a = Math.floor(ref.m / 3) * 3;
    buckets = [0, 1, 2].map((i) => ({ label: CM_MON[a + i], leads: 0, conv: 0 }));
    L.forEach((l) => { const i = cmMonthIdx(l.dataEntrada) - a; if (buckets[i]) { buckets[i].leads++; if (l.etapa === 'ganho') buckets[i].conv++; } });
  } else {
    buckets = CM_MON.map((m) => ({ label: m, leads: 0, conv: 0 }));
    L.forEach((l) => { const i = cmMonthIdx(l.dataEntrada); buckets[i].leads++; if (l.etapa === 'ganho') buckets[i].conv++; });
  }
  return buckets;
}

// channel mix (Google Ads / Meta Ads / Orgânico+Indicação)
function cmChannels(leads, gastos, campaigns, ref, period) {
  const sc = cmScope(ref, period);
  const L = leads.filter((l) => sc.test(l.dataEntrada));
  const campPlat = Object.fromEntries(campaigns.map((c) => [c.id, c.plataforma]));
  const spend = { 'Google Ads': 0, 'Meta Ads': 0 };
  gastos.filter((g) => sc.test(g.data)).forEach((g) => { const p = campPlat[g.campanhaId]; if (spend[p] != null) spend[p] += g.valor; });
  const defs = [
    { key: 'Google Ads', label: 'Google Ads', test: (l) => l.origem === 'Google Ads', invest: spend['Google Ads'] },
    { key: 'Meta Ads', label: 'Meta Ads', test: (l) => l.origem === 'Meta Ads', invest: spend['Meta Ads'] },
    { key: 'organico', label: 'Orgânico / Indicação', test: (l) => l.origem === 'Orgânico' || l.origem === 'Indicação', invest: 0 },
  ];
  return defs.map((d) => {
    const rows = L.filter(d.test);
    const ganhos = rows.filter((l) => l.etapa === 'ganho');
    const valor = ganhos.reduce((a, g) => a + (g.valorContratado || 0), 0);
    return { key: d.key, label: d.label, leads: rows.length, conversoes: ganhos.length, investimento: d.invest, valorContratado: valor, roas: d.invest ? valor / d.invest : null };
  });
}

// per-campaign stats within scope
function cmCampaignStats(campaigns, leads, gastos, ref, period) {
  const sc = cmScope(ref, period);
  return campaigns.map((c) => {
    const L = leads.filter((l) => l.campanhaId === c.id && sc.test(l.dataEntrada));
    const ganhos = L.filter((l) => l.etapa === 'ganho');
    const invest = gastos.filter((g) => g.campanhaId === c.id && sc.test(g.data)).reduce((a, g) => a + g.valor, 0);
    const valor = ganhos.reduce((a, g) => a + (g.valorContratado || 0), 0);
    const conv = ganhos.length, leadsN = L.length;
    return {
      ...c, leads: leadsN, conversoes: conv, investimento: invest, valorContratado: valor,
      cpl: leadsN ? invest / leadsN : null, cac: conv ? invest / conv : null,
      roas: invest ? valor / invest : null, roi: invest ? ((valor - invest) / invest) * 100 : null,
    };
  });
}

// funnel within scope
function cmFunnel(leads, ref, period) {
  const sc = cmScope(ref, period);
  const L = leads.filter((l) => sc.test(l.dataEntrada));
  const stages = CM_STAGES.map((s, i) => {
    const rows = L.filter((l) => l.reach >= i);
    const value = i === 4 ? rows.reduce((a, r) => a + (r.valorContratado || 0), 0) : rows.reduce((a, r) => a + r.valorEstimado, 0);
    return { ...s, count: rows.length, value };
  });
  stages.forEach((s, i) => { s.conv = i === 0 ? 100 : (stages[i - 1].count ? (s.count / stages[i - 1].count) * 100 : 0); });
  const gargalos = stages.slice(1).map((s, i) => ({ from: stages[i].label, to: s.label, drop: stages[i].count - s.count, conv: s.conv }))
    .filter((g) => g.drop > 0).sort((a, b) => a.conv - b.conv);
  const ganho = L.filter((l) => l.etapa === 'ganho');
  const perdido = L.filter((l) => l.etapa === 'perdido');
  const motivos = Object.values(perdido.reduce((m, l) => { const k = l.motivoPerda || 'Não informado'; (m[k] = m[k] || { motivo: k, count: 0, value: 0 }); m[k].count++; m[k].value += l.valorEstimado; return m; }, {})).sort((a, b) => b.count - a.count);
  return { stages, gargalos, ganho: ganho.length, perdido: perdido.length, ganhoValor: ganho.reduce((a, g) => a + (g.valorContratado || 0), 0), perdidoValor: perdido.reduce((a, l) => a + l.valorEstimado, 0), motivos, total: L.length };
}

// ---- export ----
function cmDownload(filename, text, mime) {
  const blob = new Blob([(mime.includes('csv') ? '\uFEFF' : '') + text], { type: mime + ';charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const _esc = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
const _row = (arr) => arr.map(_esc).join(';');
function cmLeadsCSV(leads, campaigns) {
  const cmap = Object.fromEntries(campaigns.map((c) => [c.id, c.nome]));
  const head = ['Nome', 'Contato', 'Origem', 'Campanha', 'Área', 'Etapa', 'Valor estimado', 'Data entrada', 'Cliente', 'Caso', 'Valor contratado', 'Motivo perda'];
  const lines = [_row(head)];
  leads.forEach((l) => lines.push(_row([l.nome, l.contato, l.origem, l.campanhaId ? cmap[l.campanhaId] : '', l.area, cmStageLabel(l.etapa), l.valorEstimado, l.dataEntrada, l.cliente || '', l.caso || '', l.valorContratado || '', l.motivoPerda || ''])));
  return lines.join('\r\n');
}
function cmPeriodPayload(state, ref, period) {
  const { leads, gastos, campaigns } = state;
  const sc = cmScope(ref, period);
  const L = leads.filter((l) => sc.test(l.dataEntrada));
  return {
    periodo: { label: sc.title, sub: sc.sub, ref, period, gerado: CM_TODAY },
    kpis: cmKpis(leads, gastos, ref, period),
    funil: cmFunnel(leads, ref, period),
    canais: cmChannels(leads, gastos, campaigns, ref, period),
    campanhas: cmCampaignStats(campaigns, leads, gastos, ref, period),
    leads: L,
  };
}
function cmExportJSON(state, ref, period) {
  return JSON.stringify(cmPeriodPayload(state, ref, period), null, 2);
}
function cmExportCSV(state, ref, period) {
  const p = cmPeriodPayload(state, ref, period);
  const k = p.kpis;
  const out = [];
  out.push('# KPIs · ' + p.periodo.label);
  out.push(_row(['Métrica', 'Valor']));
  [['Leads', cmInt(k.leads)], ['Conversões', cmInt(k.conversoes)], ['Taxa de conversão', cmPct(k.taxaConv)], ['Investimento', k.investimento.toFixed(2).replace('.', ',')], ['Valor contratado', k.valorContratado.toFixed(2).replace('.', ',')], ['ROAS', cmRoas(k.roas)], ['ROI', k.roi == null ? '—' : cmPct(k.roi, 0)], ['CAC', k.cac == null ? '—' : k.cac.toFixed(2).replace('.', ',')], ['CPL', k.cpl == null ? '—' : k.cpl.toFixed(2).replace('.', ',')], ['Ticket médio', k.ticket == null ? '—' : k.ticket.toFixed(2).replace('.', ',')]].forEach((r) => out.push(_row(r)));
  out.push(''); out.push('# Funil');
  out.push(_row(['Etapa', 'Quantidade', 'Valor', 'Conversão da etapa']));
  p.funil.stages.forEach((s) => out.push(_row([s.label, s.count, s.value.toFixed(2).replace('.', ','), cmPct(s.conv, 0)])));
  out.push(''); out.push('# Canais');
  out.push(_row(['Canal', 'Leads', 'Conversões', 'Investimento', 'Valor contratado', 'ROAS']));
  p.canais.forEach((c) => out.push(_row([c.label, c.leads, c.conversoes, c.investimento.toFixed(2).replace('.', ','), c.valorContratado.toFixed(2).replace('.', ','), cmRoas(c.roas)])));
  out.push(''); out.push('# Campanhas');
  out.push(_row(['Plataforma', 'Campanha', 'Status', 'Investimento', 'Leads', 'Conversões', 'Valor contratado', 'CPL', 'CAC', 'ROAS', 'ROI']));
  p.campanhas.forEach((c) => out.push(_row([c.plataforma, c.nome, CM_CAMP_STATUS_LABEL[c.status], c.investimento.toFixed(2).replace('.', ','), c.leads, c.conversoes, c.valorContratado.toFixed(2).replace('.', ','), c.cpl == null ? '' : c.cpl.toFixed(2).replace('.', ','), c.cac == null ? '' : c.cac.toFixed(2).replace('.', ','), cmRoas(c.roas), c.roi == null ? '' : cmPct(c.roi, 0)])));
  out.push(''); out.push('# Leads');
  out.push(cmLeadsCSV(p.leads, state.campaigns));
  return out.join('\r\n');
}

Object.assign(window, {
  CM_TODAY, CM_REF0, CM_MON, CM_MON_FULL, CM_STAGES, CM_STAGE_MAP, CM_STAGE_PERDIDO,
  CM_ORIGENS, CM_ORIGEM_META, CM_PLATAFORMAS, CM_OBJETIVOS, CM_CAMP_STATUS, CM_CAMP_STATUS_LABEL, CM_MOTIVOS, CM_CONTAS, CM_AREAS,
  CM_FIRST, CM_LAST, CM_EMPRESAS, cmRng,
  cmMoney, cmCompact, cmInt, cmPct, cmRoas, cmDate, cmDateLong, cmDaysTo, cmYear, cmMonthIdx,
  cmScope, cmShiftRef, cmStageLabel, cmBuildSeed,
  cmKpis, cmDelta, cmTrend, cmChannels, cmCampaignStats, cmFunnel,
  cmDownload, cmLeadsCSV, cmExportJSON, cmExportCSV, cmPeriodPayload,
});
