// LexIA · CRM — shared UI primitives + derived selectors. Builds on Fx* + Icon.
const { useState: crmUseState, useEffect: crmUseEffect, useRef: crmUseRef, useMemo: crmUseMemo } = React;

// ---------- derived selectors ----------
const crmStatusContrato = (l) => l.status; // 'lançado' | 'recebido'
const crmIsVencido = (l) => l.status === 'lançado' && l.venc < CRM_TODAY;

function crmClienteFin(store, clienteId) {
  const ls = store.lancamentos.filter((l) => l.clienteId === clienteId);
  const recebido = ls.filter((l) => l.status === 'recebido').reduce((s, l) => s + l.valor, 0);
  const aReceber = ls.filter((l) => l.status === 'lançado').reduce((s, l) => s + l.valor, 0);
  const vencido = ls.filter(crmIsVencido).reduce((s, l) => s + l.valor, 0);
  return { recebido, aReceber, vencido, count: ls.length, lancamentos: ls };
}
function crmCasoFin(store, casoId) {
  const ls = store.lancamentos.filter((l) => l.casoId === casoId);
  const recebido = ls.filter((l) => l.status === 'recebido').reduce((s, l) => s + l.valor, 0);
  const aberto = ls.filter((l) => l.status === 'lançado').reduce((s, l) => s + l.valor, 0);
  return { recebido, aberto, total: recebido + aberto, count: ls.length, lancamentos: ls };
}
const crmCasosDoCliente = (store, id) => store.casos.filter((k) => k.clienteId === id);
const crmCasosCount = (store, id) => crmCasosDoCliente(store, id).filter((k) => k.status === 'ativo').length;

// ---------- avatar ----------
const CrmAvatar = ({ name, iniciais, size = 34, tipo }) => {
  const txt = iniciais || crmInitials(name || '?');
  const isPJ = tipo === 'PJ';
  return (
    <div style={{
      width: size, height: size, borderRadius: isPJ ? Math.round(size * 0.26) : '50%', flexShrink: 0,
      background: 'var(--accent-soft)', color: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 500, letterSpacing: '-0.02em',
      border: '1px solid var(--border)',
    }}>{txt}</div>
  );
};

// ---------- badges ----------
const CrmBadge = ({ children, tone = 'neutral', dot }) => {
  // cores semânticas — verde / âmbar / vermelho / neutro + dourado (IA). Sem azul.
  const tones = {
    neutral: { bg: 'var(--neutral-soft)', fg: 'var(--text-muted)' },
    gold:    { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
    pos:     { bg: 'var(--ok-soft)', fg: 'var(--ok)' },
    neg:     { bg: 'var(--crit-soft)', fg: 'var(--crit)' },
    warn:    { bg: 'var(--warn-soft)', fg: 'var(--warn)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 22, fontSize: 12, fontWeight: 500,
      padding: '0 9px', borderRadius: 6, background: t.bg, color: t.fg, whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>}
      {children}
    </span>
  );
};
const CrmTipoBadge = ({ tipo }) => <CrmBadge tone="neutral">{tipo}</CrmBadge>;
const CrmClasseBadge = ({ classe }) => classe === 'lead'
  ? <CrmBadge tone="gold" dot>Lead</CrmBadge>
  : <CrmBadge tone="pos" dot>Cliente</CrmBadge>;
const CrmCasoTipoPill = ({ tipo }) => <CrmBadge tone={tipo === 'litígio' ? 'neg' : 'neutral'} dot>{tipo === 'litígio' ? 'Litígio' : 'Consultivo'}</CrmBadge>;
const CrmContratoStatus = ({ status, venc }) => {
  if (status === 'recebido') return <CrmBadge tone="pos" dot>Recebido</CrmBadge>;
  if (venc && venc < CRM_TODAY) return <CrmBadge tone="neg" dot>Vencido</CrmBadge>;
  return <CrmBadge tone="neutral" dot>Lançado</CrmBadge>;
};

// ---------- event type meta ----------
const CRM_EVT = {
  'audiência': { label: 'Audiência', color: '#C0492F', soft: 'rgba(192,73,47,0.12)', icon: 'gavel' },
  'prazo':     { label: 'Prazo', color: '#C9962F', soft: 'rgba(201,150,47,0.14)', icon: 'flag' },
  'reunião':   { label: 'Reunião', color: '#7A8194', soft: 'rgba(122,129,148,0.14)', icon: 'users' },
  'outro':     { label: 'Outro', color: '#7A8194', soft: 'rgba(122,129,148,0.14)', icon: 'circleDot' },
};

// ---------- task meta ----------
const CRM_TASK_STATUS = {
  todo:   { label: 'A fazer', tone: 'neutral' },
  doing:  { label: 'Fazendo', tone: 'neutral' },
  review: { label: 'Revisão', tone: 'warn' },
  done:   { label: 'Concluída', tone: 'pos' },
};
const CRM_PRIO = {
  P1: { label: 'P1', color: '#C0492F' },
  P2: { label: 'P2', color: '#C9962F' },
  P3: { label: 'P3', color: '#7A8194' },
  P4: { label: 'P4', color: '#7A8194' },
};
const CrmPrioTag = ({ p }) => {
  const m = CRM_PRIO[p] || CRM_PRIO.P4;
  return <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 20,
    padding: '0 6px', borderRadius: 6, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em',
    color: m.color, background: m.color + '1f', fontVariantNumeric: 'tabular-nums',
  }}>{m.label}</span>;
};

// ---------- empty state ----------
const CrmEmpty = ({ icon = 'inbox', title, sub, cta }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', textAlign: 'center' }}>
    <div style={{ color: 'var(--text-subtle)', marginBottom: 16 }}><Icon name={icon} size={32} strokeWidth={1.5} /></div>
    <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>{title}</div>
    {sub && <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6, maxWidth: 320, lineHeight: 1.5 }}>{sub}</div>}
    {cta && <div style={{ marginTop: 18 }}>{cta}</div>}
  </div>
);

// ---------- page heading ----------
const CrmPageHead = ({ title, sub, right }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
    <div>
      <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--text)' }}>{title}</h1>
      {sub && <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 5 }}>{sub}</div>}
    </div>
    {right && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{right}</div>}
  </div>
);

// ---------- search field (list pages) ----------
const CrmSearch = ({ value, onChange, placeholder }) => (
  <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
    <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}>
      <Icon name="search" size={16} />
    </div>
    <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ paddingLeft: 36, height: 40, fontSize: 14, background: 'var(--surface)' }} />
  </div>
);

// ---------- KPI strip ----------
const CrmKpiRow = ({ kpis }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, gap: 14, marginBottom: 22 }}>
    {kpis.map((k, i) => <FxKpi key={i} {...k} />)}
  </div>
);

// ---------- clickable list row wrapper ----------
const CrmRow = ({ children, onClick, style }) => (
  <div onClick={onClick} className="crm-row" style={{ cursor: onClick ? 'pointer' : 'default', ...style }}>{children}</div>
);

// ---------- toast system ----------
const CrmToastCtx = React.createContext({ toast: () => {} });
const useCrmToast = () => React.useContext(CrmToastCtx);
const CrmToastHost = ({ children }) => {
  const [items, setItems] = crmUseState([]);
  const toast = (msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setItems((p) => [...p, { id, msg, icon: opts.icon || 'checkCircle', tone: opts.tone || 'pos' }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), opts.duration || 5000);
  };
  return (
    <CrmToastCtx.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'absolute', bottom: 22, right: 22, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', pointerEvents: 'none' }}>
        {items.map((t) => (
          <div key={t.id} className="crm-toast" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 10,
            background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)',
            fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em', maxWidth: 460,
          }}>
            <Icon name={t.icon} size={17} style={{ color: t.tone === 'neg' ? 'var(--crit)' : t.tone === 'warn' ? 'var(--warn)' : t.tone === 'ai' || t.tone === 'gold' ? 'var(--accent)' : 'var(--ok)' }} />
            {t.msg}
          </div>
        ))}
      </div>
    </CrmToastCtx.Provider>
  );
};

// ---------- linked chip (navigate to entity) ----------
const CrmLink = ({ children, onClick, icon }) => (
  <button onClick={(e) => { e.stopPropagation(); onClick && onClick(); }} style={{
    display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent',
    color: 'var(--accent)', fontFamily: 'var(--font-sans)', fontSize: 'inherit', fontWeight: 500,
    cursor: 'pointer', padding: 0, letterSpacing: '-0.01em',
  }}>{icon && <Icon name={icon} size={13} />}{children}</button>
);

Object.assign(window, {
  crmStatusContrato, crmIsVencido, crmClienteFin, crmCasoFin, crmCasosDoCliente, crmCasosCount,
  CrmAvatar, CrmBadge, CrmTipoBadge, CrmClasseBadge, CrmCasoTipoPill, CrmContratoStatus,
  CRM_EVT, CRM_TASK_STATUS, CRM_PRIO, CrmPrioTag, CrmEmpty, CrmPageHead, CrmSearch, CrmKpiRow,
  CrmRow, CrmToastHost, useCrmToast, CrmLink,
});
