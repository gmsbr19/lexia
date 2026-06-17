// Financeiro UI kit — primitives themed with LexIA tokens.
// MoneyValue, KpiCard, StatusPill, FinTabStrip, PageFrame, FilterBar bits,
// TableShell, ProximoPassoQueue, AlertBanner, section helpers.

// ---- BRL formatting ----
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompact = (n) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1000) return `${sign}R$ ${(abs / 1000).toLocaleString('pt-BR', { minimumFractionDigits: abs >= 100000 ? 0 : 1, maximumFractionDigits: 1 })} mil`;
  return brl.format(n);
};
const fmtBRL = (n) => brl.format(n).replace('-', '−');

// ---- MoneyValue — sign-aware color ----
const MoneyValue = ({ value, size = 14, weight = 600, mono = true, colorSign = false, muted = false }) => {
  const neg = value < 0;
  const color = muted ? 'var(--text-muted)'
    : colorSign ? (neg ? 'var(--fin-neg, #C0492F)' : 'var(--fin-pos, #2E9E5B)')
    : 'var(--text)';
  return (
    <span style={{
      fontSize: size, fontWeight: weight, color,
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontFeatureSettings: '"tnum"', letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    }}>{fmtBRL(value)}</span>
  );
};

// ---- KpiCard ----
const KpiCard = ({ label, value, delta, deltaDir, sub, icon, accent }) => (
  <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 112 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', letterSpacing: '0.01em', fontWeight: 500 }}>{label}</span>
      {icon && (
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: accent === 'gold' ? 'var(--accent-soft)' : 'var(--bg-sunken)',
          color: accent === 'gold' ? 'var(--accent)' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name={icon} size={14} strokeWidth={1.8} />
        </div>
      )}
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 25, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.025em', fontFeatureSettings: '"tnum"', fontFamily: 'var(--font-sans)' }}>{value}</span>
      {delta && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 11.5, fontWeight: 600,
          color: deltaDir === 'down' ? 'var(--fin-neg, #C0492F)' : 'var(--fin-pos, #2E9E5B)',
        }}>
          <Icon name={deltaDir === 'down' ? 'trendingDown' : 'trendingUp'} size={12} strokeWidth={2} />
          {delta}
        </span>
      )}
    </div>
    {sub && <span style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginTop: -2 }}>{sub}</span>}
  </div>
);

// ---- StatusPill — generalized ----
const PILL_TONES = {
  recebido:  { bg: 'rgba(46,158,91,0.12)',  fg: '#2E9E5B' },
  lancado:   { bg: 'var(--accent-soft)',    fg: 'var(--accent)' },
  ativo:     { bg: 'rgba(46,158,91,0.12)',  fg: '#2E9E5B' },
  lead:      { bg: 'var(--bg-sunken)',      fg: 'var(--text-muted)' },
  estrategico:{ bg: 'rgba(31,58,110,0.12)', fg: 'var(--accent)' },
  vencido:   { bg: 'rgba(192,73,47,0.12)',  fg: '#C0492F' },
  alerta:    { bg: 'rgba(217,138,43,0.14)', fg: '#C77E1F' },
  pf:        { bg: 'var(--bg-sunken)',      fg: 'var(--text-muted)' },
  pj:        { bg: 'var(--bg-sunken)',      fg: 'var(--text-muted)' },
  neutro:    { bg: 'var(--bg-sunken)',      fg: 'var(--text-muted)' },
};
const StatusPill = ({ label, tone = 'neutro', dot = true }) => {
  const t = PILL_TONES[tone] || PILL_TONES.neutro;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 600, padding: dot ? '3px 9px 3px 8px' : '3px 9px',
      borderRadius: 999, background: t.bg, color: t.fg, letterSpacing: '0.005em', whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />}
      {label}
    </span>
  );
};

// ---- FinTabStrip — six tabs for Financeiro ----
const FIN_TABS = [
  { id: 'visao',     label: 'Visão geral' },
  { id: 'receita',   label: 'Receita' },
  { id: 'receber',   label: 'A receber', badge: '20' },
  { id: 'custos',    label: 'Custos & DRE' },
  { id: 'semfee',    label: 'Casos sem fee', badge: '5' },
  { id: 'import',    label: 'Importação' },
];
const FinTabStrip = ({ active }) => (
  <div style={{
    display: 'flex', alignItems: 'stretch', gap: 0, padding: '0 28px',
    borderBottom: '1px solid var(--border)', background: 'var(--bg)', minHeight: 42, overflowX: 'auto',
  }}>
    {FIN_TABS.map(t => {
      const on = active === t.id;
      return (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px',
          fontSize: 13, fontWeight: on ? 600 : 500, color: on ? 'var(--text)' : 'var(--text-muted)',
          letterSpacing: '-0.005em', cursor: 'pointer', whiteSpace: 'nowrap',
          borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1,
        }}>
          <span>{t.label}</span>
          {t.badge && (
            <span style={{
              fontSize: 10.5, fontWeight: 500,
              background: on ? 'var(--accent-soft)' : 'var(--bg-sunken)',
              color: on ? 'var(--accent)' : 'var(--text-subtle)',
              padding: '1px 6px', borderRadius: 999, fontFeatureSettings: '"tnum"',
            }}>{t.badge}</span>
          )}
        </div>
      );
    })}
  </div>
);

// ---- Page frame (max 1180, centered) ----
const PageFrame = ({ children, pad = '28px 40px 44px' }) => (
  <div style={{ padding: pad, maxWidth: 1180, margin: '0 auto' }}>{children}</div>
);

const PageHeader = ({ title, sub, right }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
    <div>
      <h1 style={{ margin: 0, fontSize: 25, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)' }}>{title}</h1>
      {sub && <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
    {right}
  </div>
);

const CardTitle = ({ title, sub, right }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginTop: 3 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

// ---- Filter bar bits ----
const SearchInput = ({ placeholder = 'Buscar...', width = 300 }) => (
  <div style={{ position: 'relative', flex: `0 1 ${width}px`, minWidth: 160 }}>
    <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}>
      <Icon name="search" size={14} />
    </div>
    <input className="input" placeholder={placeholder} style={{ paddingLeft: 36, height: 34, fontSize: 13 }} />
  </div>
);

const Segmented = ({ options, active = 0 }) => (
  <div style={{ display: 'flex', gap: 3, background: 'var(--bg-soft)', borderRadius: 8, padding: 3 }}>
    {options.map((o, i) => (
      <button key={o} style={{
        height: 28, padding: '0 12px', borderRadius: 6, border: 'none',
        background: i === active ? 'var(--surface)' : 'transparent',
        color: i === active ? 'var(--text)' : 'var(--text-muted)',
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        boxShadow: i === active ? 'var(--shadow-sm)' : 'none',
      }}>{o}</button>
    ))}
  </div>
);

const FilterBar = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>{children}</div>
);

// ---- Table shell ----
const Th = ({ children, align = 'left' }) => (
  <th style={{
    textAlign: align, padding: '10px 16px', fontSize: 10.5, fontWeight: 600,
    color: 'var(--text-subtle)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap',
  }}>{children}</th>
);
const Td = ({ children, align = 'left', muted, subtle, style }) => (
  <td style={{
    padding: '12px 16px', fontSize: 12.5, textAlign: align,
    color: subtle ? 'var(--text-subtle)' : muted ? 'var(--text-muted)' : 'var(--text)', ...style,
  }}>{children}</td>
);

const TableShell = ({ head, children, footer }) => (
  <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: 'var(--bg-soft)' }}>{head}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
    {footer}
  </div>
);

const FooterBar = ({ showing, total, label = 'registros' }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px',
    borderTop: '1px solid var(--border)', background: 'var(--bg-soft)', fontSize: 11.5, color: 'var(--text-muted)',
  }}>
    <span>Mostrando {showing} de {total} {label}</span>
    <div style={{ display: 'flex', gap: 4 }}>
      <button className="btn btn-ghost" style={{ width: 24, height: 24, padding: 0 }}><Icon name="chevronLeft" size={13} /></button>
      <button className="btn btn-ghost" style={{ width: 24, height: 24, padding: 0 }}><Icon name="chevronRight" size={13} /></button>
    </div>
  </div>
);

const Avatar = ({ name, gold }) => (
  <div style={{
    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
    background: gold ? 'linear-gradient(135deg,#020D25,#1a2c5a)' : 'var(--bg-sunken)',
    color: gold ? '#C0A147' : 'var(--text)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 600,
  }}>{name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
);

// ---- Alert banner ----
const AlertBanner = ({ tone = 'vencido', icon = 'alertTriangle', title, children, action }) => {
  const map = {
    vencido: { bg: 'rgba(192,73,47,0.08)', bd: 'rgba(192,73,47,0.28)', fg: '#C0492F' },
    alerta:  { bg: 'rgba(217,138,43,0.10)', bd: 'rgba(217,138,43,0.30)', fg: '#C77E1F' },
  };
  const t = map[tone] || map.vencido;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
      background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 'var(--r-md)', marginBottom: 20,
    }}>
      <div style={{ color: t.fg, flexShrink: 0 }}><Icon name={icon} size={18} strokeWidth={1.9} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{children}</div>
      </div>
      {action}
    </div>
  );
};

// ---- KPI strip wrapper ----
const KpiStrip = ({ children, cols = 4 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 22 }}>{children}</div>
);

Object.assign(window, {
  fmtBRL, brlCompact, MoneyValue, KpiCard, StatusPill, FinTabStrip, FIN_TABS,
  PageFrame, PageHeader, CardTitle, SearchInput, Segmented, FilterBar,
  Th, Td, TableShell, FooterBar, Avatar, AlertBanner, KpiStrip,
});
