// Tarefas — data model + helpers.
// A task carries TWO temporal fields, kept visually distinct everywhere:
//   data  = quando vou fazer (agendamento)  + optional hora (bloco na agenda do dia)
//   prazo = limite máximo (deadline)         -> drives urgency color
// Subtasks are a nested checklist INSIDE a task (não confundir com projetos).

// ---- date utils (TODAY pinned to 9 jun 2026) ----
const _T = new Date(2026, 5, 9, 12, 0, 0);
const tIso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
const tRel = (n) => { const d = new Date(_T); d.setDate(d.getDate() + n); return tIso(d); };
const TODAY = tIso(_T);
const tParse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const tDiff = (s) => Math.round((tParse(s) - _T) / 86400000); // days from today (neg = passado)
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const WD_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// short scheduled-date label: Hoje / Amanhã / Ontem / qua / 18 jun
const dataLabel = (s) => {
  if (!s) return null;
  const n = tDiff(s);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n === -1) return 'Ontem';
  const d = tParse(s);
  if (n > 1 && n < 7) return WD[d.getDay()];
  return `${d.getDate()} ${MO[d.getMonth()]}`;
};

// prazo label + urgency tone
const prazoInfo = (s, done) => {
  if (!s) return null;
  const n = tDiff(s);
  const d = tParse(s);
  const label = n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n === -1 ? 'ontem' : `${d.getDate()} ${MO[d.getMonth()]}`;
  let tone = 'neutro';
  if (done) tone = 'neutro';
  else if (n < 0) tone = 'vencido';
  else if (n <= 1) tone = 'urgente';
  else if (n <= 3) tone = 'proximo';
  return { label, tone, days: n };
};

// ---- team (delegação) ----
const TEAM = [
  { id: 'rm', name: 'Rafael Moraes', first: 'Rafael', role: 'Sócio',     initials: 'RM', color: '#1F3A6E' },
  { id: 'jp', name: 'João Pádua',    first: 'João',   role: 'Advogado',  initials: 'JP', color: '#2E7D6B' },
  { id: 'mc', name: 'Marina Costa',  first: 'Marina', role: 'Advogada',  initials: 'MC', color: '#9A6B2E' },
  { id: 'bt', name: 'Bruno Tavares', first: 'Bruno',  role: 'Advogado',  initials: 'BT', color: '#5A4F9A' },
  { id: 'cn', name: 'Carla Nunes',   first: 'Carla',  role: 'Paralegal', initials: 'CN', color: '#9A2E5A' },
];
const ME = 'rm';
const member = (id) => TEAM.find(m => m.id === id) || null;

// ---- projects (containers — NÃO são casos; o vínculo a caso é separado) ----
const PROJECTS = [
  { id: 'inbox', name: 'Caixa de entrada',        color: '#7A8699', inbox: true },
  { id: 'trab',  name: 'Contencioso trabalhista', color: '#C0492F' },
  { id: 'soc',   name: 'Societário & M&A',        color: '#1F8A5B' },
  { id: 'trib',  name: 'Tributário',              color: '#C0A147' },
  { id: 'civ',   name: 'Cível & contratos',       color: '#7A8699' },
  { id: 'int',   name: 'Operação interna',        color: '#7A8699' },
];
const project = (id) => PROJECTS.find(p => p.id === id) || PROJECTS[0];

// ---- relations (vínculo clicável a caso/processo/cliente) ----
const LINKS = {
  aurora: { type: 'caso',     label: 'Constr. Aurora', sub: 'Trabalhista' },
  tech:   { type: 'caso',     label: 'Tech Holding',   sub: 'CADE / concorrencial' },
  vargas: { type: 'cliente',  label: 'Vargas & Cia',   sub: 'Cliente PJ' },
  helena: { type: 'cliente',  label: 'Helena Vargas',  sub: 'Cliente PF' },
  proc1:  { type: 'processo', label: '0012-45.2026',   sub: 'TRT 2ª Região' },
};
const LINK_ICON = { caso: 'briefcase', processo: 'gavel', cliente: 'user' };

// ---- status & priority ----
const STATUS = [
  { id: 'todo',   label: 'A fazer',       color: '#7A8699' },
  { id: 'doing',  label: 'Em andamento',  color: '#7A8699' },
  { id: 'review', label: 'Em revisão',    color: '#9A6B2E' },
  { id: 'done',   label: 'Concluída',     color: '#1F8A5B' },
];
const statusMeta = (id) => STATUS.find(s => s.id === id) || STATUS[0];

const PRIO = {
  1: { label: 'Urgente', short: 'P1', color: '#C0492F' },
  2: { label: 'Alta',    short: 'P2', color: '#D98A2B' },
  3: { label: 'Média',   short: 'P3', color: '#7A8699' },
  4: { label: 'Normal',  short: 'P4', color: 'var(--text-subtle)' },
};

// ---- seed tasks ----
let _id = 0;
const uid = () => `t${++_id}`;
const sub = (title, done = false) => ({ id: uid(), title, done });

const SEED_TASKS = [
  { id: uid(), title: 'Protocolar contestação trabalhista', project: 'trab', assignee: 'jp', prio: 1,
    data: tRel(0), hora: '09:00', prazo: tRel(0), status: 'doing', link: 'aurora',
    subtasks: [sub('Reunir provas documentais', true), sub('Revisar minuta com sócio'), sub('Assinar e protocolar')] },
  { id: uid(), title: 'Revisar cláusulas do contrato de M&A', project: 'soc', assignee: 'mc', prio: 2,
    data: tRel(0), hora: '14:00', prazo: tRel(2), status: 'doing', link: 'tech',
    subtasks: [], notes: 'Atenção à cláusula de não-concorrência e earn-out.' },
  { id: uid(), title: 'Reunião de alinhamento — Helena Vargas', project: 'civ', assignee: 'rm', prio: 2,
    data: tRel(0), hora: '16:30', prazo: tRel(0), status: 'todo', link: 'helena', reminder: '30 min antes' },
  { id: uid(), title: 'Preparar defesa prévia', project: 'trab', assignee: 'bt', prio: 1,
    data: tRel(-1), prazo: tRel(1), status: 'doing', link: 'aurora',
    subtasks: [sub('Levantar jurisprudência', true), sub('Redigir fundamentação')] },
  { id: uid(), title: 'Enviar minuta de acordo', project: 'civ', assignee: 'jp', prio: 2,
    data: tRel(1), hora: '10:00', prazo: tRel(3), status: 'todo', link: 'vargas' },
  { id: uid(), title: 'Levantar documentos para defesa tributária', project: 'trib', assignee: 'cn', prio: 3,
    data: tRel(1), prazo: tRel(5), status: 'todo',
    subtasks: [sub('Notas fiscais 2024', true), sub('Notas fiscais 2025', true), sub('Comprovantes DARF'), sub('Procuração atualizada')] },
  { id: uid(), title: 'Análise de risco processual', project: 'trab', assignee: 'mc', prio: 2,
    data: tRel(2), prazo: tRel(4), status: 'todo', link: 'aurora' },
  { id: uid(), title: 'Atualizar planilha de prazos', project: 'int', assignee: 'cn', prio: 3,
    data: tRel(2), prazo: tRel(2), status: 'todo', recur: 'Toda terça' },
  { id: uid(), title: 'Audiência de conciliação', project: 'trab', assignee: 'rm', prio: 1,
    data: tRel(3), hora: '11:00', prazo: tRel(3), status: 'todo', link: 'proc1', reminder: '1 dia antes' },
  { id: uid(), title: 'Revisar parecer tributário', project: 'trib', assignee: 'bt', prio: 2,
    data: tRel(4), prazo: tRel(6), status: 'review' },
  { id: uid(), title: 'Follow-up da proposta de honorários', project: 'civ', assignee: 'rm', prio: 2,
    data: tRel(-2), prazo: tRel(0), status: 'todo', link: 'vargas' },
  { id: uid(), title: 'Backup mensal dos documentos', project: 'int', assignee: 'cn', prio: 4,
    data: tRel(6), prazo: tRel(7), status: 'todo', recur: 'Todo dia 15' },
  { id: uid(), title: 'Redigir petição de recurso', project: 'civ', assignee: 'jp', prio: 3,
    data: null, prazo: tRel(8), status: 'todo', link: 'helena' },
  { id: uid(), title: 'Cadastrar novo cliente no sistema', project: 'int', assignee: 'cn', prio: 4,
    data: null, prazo: null, status: 'todo' },
  { id: uid(), title: 'Enviar notificação extrajudicial', project: 'trab', assignee: 'jp', prio: 2,
    data: tRel(-1), prazo: tRel(-1), status: 'done', done: true, link: 'aurora' },
  { id: uid(), title: 'Protocolar petição inicial', project: 'civ', assignee: 'mc', prio: 2,
    data: tRel(-3), prazo: tRel(-3), status: 'done', done: true },
];

// ---- plano-generated tasks (chegam na Caixa de entrada, já vinculadas ao caso) ----
const buildPlanoTasks = () => [
  { id: uid(), title: 'Cobrar Construtora Aurora — R$ 28.400', project: 'inbox', assignee: 'rm', prio: 1,
    data: tRel(0), prazo: tRel(2), status: 'todo', link: 'aurora', ai: true, _new: true,
    notes: '74 dias em atraso · ação trabalhista · sem resposta a 2 avisos.' },
  { id: uid(), title: 'Enviar lembrete de pagamento — Vargas & Cia', project: 'inbox', assignee: 'jp', prio: 2,
    data: tRel(1), prazo: tRel(3), status: 'todo', link: 'vargas', ai: true, _new: true },
  { id: uid(), title: 'Lançar honorário — Tech Holding (CADE)', project: 'inbox', assignee: 'rm', prio: 1,
    data: tRel(0), prazo: tRel(1), status: 'todo', link: 'tech', ai: true, _new: true },
  { id: uid(), title: 'Definir fee de êxito — Helena Vargas', project: 'inbox', assignee: 'mc', prio: 3,
    data: tRel(2), prazo: tRel(5), status: 'todo', link: 'helena', ai: true, _new: true },
  { id: uid(), title: 'Revisar importação financeira sinalizada', project: 'inbox', assignee: 'rm', prio: 1,
    data: tRel(0), prazo: tRel(0), status: 'todo', ai: true, _new: true },
];

// ---- recurrence options ----
const RECUR_OPTS = ['Não repete', 'Diariamente', 'Toda terça', 'Toda semana', 'A cada 15 dias', 'Todo dia 15', 'Mensalmente'];
const REMINDER_OPTS = ['Sem lembrete', '15 min antes', '30 min antes', '1 h antes', '1 dia antes', 'Na data do prazo'];

// ---- DoR / DoD suggestions (IA) keyed by loose topic ----
const DOR_GENERIC = ['Caso e partes confirmados no sistema', 'Documentos-base anexados', 'Prazo legal validado no calendário', 'Responsável e revisor definidos'];
const DOD_GENERIC = ['Peça revisada por outro advogado', 'Protocolo/comprovante anexado', 'Cliente informado do andamento', 'Prazo do desdobramento agendado'];

// ---- quick-add natural-language parser ----
// "Protocolar recurso amanhã 14h #trabalhista @joão !alta"
const parseQuickAdd = (raw) => {
  let text = ' ' + raw + ' ';
  const res = { project: null, assignee: null, prio: null, data: null, hora: null };

  // priority  !urgente !alta !média !p1..p4
  const pm = text.match(/!\s*(urgente|alta|m[ée]dia|media|normal|p[1-4])/i);
  if (pm) {
    const v = pm[1].toLowerCase();
    res.prio = v === 'urgente' || v === 'p1' ? 1 : v === 'alta' || v === 'p2' ? 2 : v === 'p4' || v === 'normal' ? 4 : 3;
    text = text.replace(pm[0], ' ');
  }
  // project  #token
  const projm = text.match(/#(\S+)/);
  if (projm) {
    const q = projm[1].toLowerCase();
    const p = PROJECTS.find(p => p.name.toLowerCase().includes(q) || p.id === q);
    if (p) res.project = p.id;
    text = text.replace(projm[0], ' ');
  }
  // assignee @token
  const asm = text.match(/@(\S+)/);
  if (asm) {
    const q = asm[1].toLowerCase().replace(/[^a-zà-ú]/gi, '');
    const m = TEAM.find(t => t.first.toLowerCase().startsWith(q) || t.name.toLowerCase().includes(q));
    if (m) res.assignee = m.id;
    text = text.replace(asm[0], ' ');
  }
  // time  14h / 14:30 / 9h
  const tm = text.match(/\b(\d{1,2})\s*[:h]\s*(\d{2})?\b/);
  if (tm) {
    const hh = String(Math.min(23, +tm[1])).padStart(2, '0');
    const mm = (tm[2] || '00').padStart(2, '0');
    res.hora = `${hh}:${mm}`;
    text = text.replace(tm[0], ' ');
  }
  // date keywords
  const dk = [
    [/\bhoje\b/i, 0], [/\bamanh[ãa]\b/i, 1], [/\bdepois de amanh[ãa]\b/i, 2],
  ];
  for (const [re, n] of dk) { if (re.test(text)) { res.data = tRel(n); text = text.replace(re, ' '); break; } }
  if (!res.data) {
    const wdm = text.match(/\b(seg|ter|qua|qui|sex|s[áa]b|dom)\w*/i);
    if (wdm) {
      const idx = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].indexOf(wdm[1].toLowerCase().slice(0, 3).replace('sab', 'sáb').replace('sá', 'sáb').slice(0, 3));
      if (idx >= 0) { let n = (idx - _T.getDay() + 7) % 7; if (n === 0) n = 7; res.data = tRel(n); text = text.replace(wdm[0], ' '); }
    }
  }
  if (res.hora && !res.data) res.data = tRel(0);
  return { ...res, title: text.replace(/\s+/g, ' ').trim() };
};

Object.assign(window, {
  TODAY, tRel, tDiff, tParse, dataLabel, prazoInfo, WD, WD_LONG, MO,
  TEAM, ME, member, PROJECTS, project, LINKS, LINK_ICON, STATUS, statusMeta, PRIO,
  SEED_TASKS, buildPlanoTasks, RECUR_OPTS, REMINDER_OPTS, DOR_GENERIC, DOD_GENERIC, parseQuickAdd, uid,
});
