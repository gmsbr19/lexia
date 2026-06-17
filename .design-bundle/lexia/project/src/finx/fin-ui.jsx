// LexIA · Financeiro interativo — shared UI primitives (prefixed Fx / fx).
// Self-contained; relies only on tokens.css classes + the Icon component.

// ---- money value, sign-aware ----
// Typography rule: every number in the app uses the sans family with tabular
// figures ("tnum") — the mono face is reserved for code, never for valores.
const FxMoney = ({ value, dir, size = 13, weight = 600, plain = false }) => {
  // dir 'in' => green(+), 'out' => red(−). plain => neutral text.
  const neg = dir === 'out';
  const color = plain ? 'var(--text)' : (neg ? 'var(--fin-neg, #C0492F)' : 'var(--fin-pos, #2E9E5B)');
  const prefix = plain ? '' : (neg ? '−' : '+');
  return (
    <span style={{
      fontSize: size, fontWeight: weight, color,
      fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    }}>{prefix}{fxMoney(value).replace('−', '')}</span>
  );
};

// ---- shared style for any numeric cell (sans + tabular) ----
const FX_NUM = { fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums' };

// ---- status pill — dot + label, quieter than the old icon version ----
const FX_PILL = {
  pago:    { bg: 'rgba(46,158,91,0.10)',  fg: 'var(--fin-pos, #2E9E5B)' },
  vencido: { bg: 'rgba(192,73,47,0.10)',  fg: 'var(--fin-neg, #C0492F)' },
  avencer: { bg: 'var(--bg-sunken)',      fg: 'var(--text-muted)' },
};
const FxStatusPill = ({ status }) => {
  const t = FX_PILL[status] || FX_PILL.avencer;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
      padding: '3px 9px', borderRadius: 999, background: t.bg, color: t.fg, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }}></span>
      {FX_STATUS_LABEL[status]}
    </span>
  );
};

// ---- custom checkbox (replaces the native input — matches the kit) ----
const FxCheck = ({ checked, indeterminate, onChange, title }) => (
  <button type="button" role="checkbox" aria-checked={indeterminate ? 'mixed' : !!checked} title={title}
    onClick={(e) => { e.stopPropagation(); onChange(e); }}
    className={`fx-check${checked || indeterminate ? ' on' : ''}`}>
    {checked && <Icon name="check" size={11} strokeWidth={3.2} />}
    {!checked && indeterminate && <span style={{ width: 8, height: 2, borderRadius: 2, background: 'currentColor' }}></span>}
  </button>
);

// ---- direction chip (a receber / a pagar) ----
const FxDirChip = ({ dir, compact = false }) => {
  const inc = dir === 'in';
  const c = inc ? '#2E9E5B' : '#C0492F';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
      color: c, whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 5, background: inc ? 'rgba(46,158,91,0.13)' : 'rgba(192,73,47,0.13)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}><Icon name={inc ? 'arrowDownRight' : 'arrowUpRight'} size={12} strokeWidth={2.2} /></span>
      {!compact && (inc ? 'A receber' : 'A pagar')}
    </span>
  );
};

// ---- segmented control (controlled) ----
const FxSegmented = ({ options, value, onChange, size = 'md' }) => {
  const h = size === 'sm' ? 28 : 32;
  return (
    <div style={{ display: 'inline-flex', gap: 3, background: 'var(--bg-sunken)', borderRadius: 9, padding: 3 }}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const lab = typeof o === 'string' ? o : o.label;
        const on = val === value;
        return (
          <button key={val} onClick={() => onChange(val)} style={{
            height: h, padding: '0 13px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: on ? 'var(--surface)' : 'transparent',
            color: on ? 'var(--text)' : 'var(--text-muted)',
            fontSize: 12.5, fontWeight: on ? 600 : 500, fontFamily: 'var(--font-sans)',
            letterSpacing: '-0.01em', boxShadow: on ? 'var(--shadow-sm)' : 'none', whiteSpace: 'nowrap', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background .12s',
          }}>{typeof o !== 'string' && o.icon && <Icon name={o.icon} size={13} />}{lab}</button>
        );
      })}
    </div>
  );
};

// ---- theme toggle ----
const FxThemeToggle = ({ theme, onToggle }) => (
  <button onClick={onToggle} title="Alternar tema" style={{
    width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border-strong)',
    background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} /></button>
);

// ---- month / period navigator (applies to every tab) ----
const FxPeriodBar = ({ ref0, setRef, period, setPeriod, scopeLabel, right }) => {
  const shift = (delta) => {
    let { y, m } = ref0;
    if (period === 'ano') y += delta;
    else if (period === 'trimestre') { m += delta * 3; }
    else { m += delta; }
    while (m < 0) { m += 12; y -= 1; }
    while (m > 11) { m -= 12; y += 1; }
    setRef({ y, m });
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 40px',
      borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button className="btn btn-ghost" onClick={() => shift(-1)} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="chevronLeft" size={16} /></button>
        <div style={{ minWidth: 150, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>{scopeLabel.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{scopeLabel.sub}</div>
        </div>
        <button className="btn btn-ghost" onClick={() => shift(1)} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="chevronRight" size={16} /></button>
      </div>
      <button className="btn btn-secondary" onClick={() => setRef({ y: 2026, m: 5 })} style={{ height: 30, fontSize: 12, padding: '0 11px' }}>Hoje</button>
      <FxSegmented options={[{ value: 'mes', label: 'Mês' }, { value: 'trimestre', label: 'Trimestre' }, { value: 'ano', label: 'Ano' }]} value={period} onChange={setPeriod} size="sm" />
      <div style={{ marginLeft: 'auto' }}>{right}</div>
    </div>
  );
};

// ---- tab strip (controlled) ----
const FxTabs = ({ tabs, active, onChange }) => (
  <div style={{
    display: 'flex', alignItems: 'stretch', gap: 0, padding: '0 28px',
    borderBottom: '1px solid var(--border)', background: 'var(--bg)', minHeight: 44, flexShrink: 0,
    overflowX: 'auto', scrollbarWidth: 'none',
  }}>
    {tabs.map((t) => {
      const on = active === t.id;
      return (
        <div key={t.id} onClick={() => onChange(t.id)} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '0 11px', cursor: 'pointer',
          fontSize: 12.5, fontWeight: on ? 600 : 500, color: on ? 'var(--text)' : 'var(--text-muted)',
          letterSpacing: '-0.01em', whiteSpace: 'nowrap', flexShrink: 0,
          borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1,
        }}>
          <Icon name={t.icon} size={14} strokeWidth={on ? 2 : 1.75} />{t.label}
          {t.badge != null && (
            <span style={{
              fontSize: 10.5, fontWeight: 600, background: on ? 'var(--accent-soft)' : 'var(--bg-sunken)',
              color: on ? 'var(--accent)' : 'var(--text-subtle)', padding: '1px 6px', borderRadius: 999, fontFeatureSettings: '"tnum"',
            }}>{t.badge}</span>
          )}
        </div>
      );
    })}
  </div>
);

// ---- page frame ----
const FxFrame = ({ children, pad = '24px 40px 48px' }) => (
  <div style={{ padding: pad, maxWidth: 1240, margin: '0 auto' }}>{children}</div>
);
const FxCardTitle = ({ title, sub, right }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginTop: 3 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

// ---- form fields ----
const FxLabel = ({ children, hint }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>{children}</span>
    {hint && <span style={{ fontSize: 10.5, color: 'var(--text-subtle)' }}>{hint}</span>}
  </div>
);
const FxInput = (props) => <input {...props} className="input" style={{ height: 38, fontSize: 13.5, ...(props.style || {}) }} />;
const FxSelect = ({ options, value, onChange, placeholder, ...rest }) => (
  <div style={{ position: 'relative' }}>
    <select value={value} onChange={onChange} {...rest} className="input" style={{
      height: 38, fontSize: 13.5, appearance: 'none', WebkitAppearance: 'none', paddingRight: 34, cursor: 'pointer',
    }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-subtle)' }}><Icon name="chevronDown" size={15} /></div>
  </div>
);

// ---- modal shell ----
const FxModal = ({ title, sub, onClose, children, footer, width = 560 }) => {
  React.useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div onMouseDown={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(2,13,37,0.42)', backdropFilter: 'blur(3px)', padding: 24,
    }}>
      <div onMouseDown={(e) => e.stopPropagation()} className="card" style={{
        width, maxWidth: '100%', maxHeight: '92%', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--r-lg)', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{title}</div>
            {sub && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="plus" size={17} style={{ transform: 'rotate(45deg)' }} /></button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto' }}>{children}</div>
        {footer && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-soft)' }}>{footer}</div>}
      </div>
    </div>
  );
};

// ---- KPI card ----
const FxKpi = ({ label, value, sub, icon, accent, tone }) => (
  <div className="card" style={{ padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: 9, minHeight: 104 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      {icon && <div style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
        background: accent === 'gold' ? 'var(--accent-soft)' : 'var(--bg-sunken)',
        color: accent === 'gold' ? 'var(--accent)' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name={icon} size={14} strokeWidth={1.8} /></div>}
    </div>
    <span style={{
      fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
      color: tone === 'neg' ? 'var(--fin-neg,#C0492F)' : tone === 'pos' ? 'var(--fin-pos,#2E9E5B)' : 'var(--text)',
    }}>{value}</span>
    {sub && <span style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>{sub}</span>}
  </div>
);

Object.assign(window, {
  FxMoney, FX_NUM, FxStatusPill, FxDirChip, FxSegmented, FxThemeToggle, FxPeriodBar, FxTabs,
  FxFrame, FxCardTitle, FxLabel, FxInput, FxSelect, FxModal, FxKpi, FxCheck,
});
