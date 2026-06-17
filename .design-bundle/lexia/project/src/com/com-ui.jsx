// LexIA · Comercial — shared UI primitives (prefixed Cm / cm).
// Mirrors the Financeiro kit feel; relies on tokens.css + the Icon component.

// ---- delta badge (period-over-period) ----
const CmDelta = ({ value, invert = false, suffix = '%' }) => {
  if (value == null) return <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 500 }}>novo</span>;
  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  const good = invert ? !up : up;
  const color = flat ? 'var(--text-subtle)' : good ? 'var(--cm-pos,#2E9E5B)' : 'var(--cm-neg,#C0492F)';
  const txt = `${up ? '+' : '−'}${Math.abs(value).toLocaleString('pt-BR', { maximumFractionDigits: value % 1 === 0 ? 0 : 1 })}${suffix}`;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 600, color, fontFeatureSettings: '"tnum"', whiteSpace: 'nowrap' }}>
      {!flat && <Icon name={up ? 'trendingUp' : 'trendingDown'} size={12} strokeWidth={2.2} />}{flat ? '—' : txt}
    </span>
  );
};

// ---- KPI card with delta ----
const CmKpi = ({ label, value, delta, deltaInvert, sub, icon, accent, tone, big }) => (
  <div className="card" style={{ padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 108 }}>
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
      fontSize: big ? 27 : 24, fontWeight: 600, letterSpacing: '-0.025em', fontFeatureSettings: '"tnum"', lineHeight: 1.05,
      color: tone === 'neg' ? 'var(--cm-neg,#C0492F)' : tone === 'pos' ? 'var(--cm-pos,#2E9E5B)' : 'var(--text)',
    }}>{value}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 'auto' }}>
      {delta !== undefined && <CmDelta value={delta} invert={deltaInvert} />}
      {sub && <span style={{ fontSize: 11, color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
    </div>
  </div>
);

// ---- origin chip ----
const CmOriginChip = ({ origem, compact }) => {
  const m = CM_ORIGEM_META[origem] || { c: 'var(--text-muted)', short: '?' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
      <span style={{ width: 8, height: 8, borderRadius: 3, background: m.c, flexShrink: 0 }} />{!compact && origem}
    </span>
  );
};

// ---- platform badge ----
const CmPlatformBadge = ({ plataforma }) => {
  const m = CM_ORIGEM_META[plataforma] || { c: 'var(--text-muted)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--text)', background: 'var(--bg-sunken)', padding: '3px 10px 3px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      <span style={{ width: 14, height: 14, borderRadius: 4, background: m.c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, flexShrink: 0 }}>{plataforma === 'Google Ads' ? 'G' : 'M'}</span>{plataforma}
    </span>
  );
};

// ---- stage pill ----
const CmStagePill = ({ etapa }) => {
  const s = etapa === 'perdido' ? CM_STAGE_PERDIDO : (CM_STAGE_MAP[etapa] || CM_STAGE_PERDIDO);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '3px 9px 3px 8px', borderRadius: 999, color: s.color, background: s.color + '22', whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />{s.label}
    </span>
  );
};

// ---- campaign status chip ----
const CmStatusChip = ({ status }) => {
  const map = { ativa: { c: '#2E9E5B', d: true }, pausada: { c: '#C0A147', d: false }, encerrada: { c: 'var(--text-subtle)', d: false } };
  const t = map[status] || map.encerrada;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: t.c, whiteSpace: 'nowrap' }}>
      <span className={status === 'ativa' ? 'pulse' : ''} style={{ width: 7, height: 7, borderRadius: '50%', background: t.c, flexShrink: 0 }} />{CM_CAMP_STATUS_LABEL[status]}
    </span>
  );
};

// ---- segmented control ----
const CmSegmented = ({ options, value, onChange, size = 'md' }) => {
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
            background: on ? 'var(--surface)' : 'transparent', color: on ? 'var(--text)' : 'var(--text-muted)',
            fontSize: 12.5, fontWeight: on ? 600 : 500, fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em',
            boxShadow: on ? 'var(--shadow-sm)' : 'none', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background .12s',
          }}>{typeof o !== 'string' && o.icon && <Icon name={o.icon} size={13} />}{lab}</button>
        );
      })}
    </div>
  );
};

const CmThemeToggle = ({ theme, onToggle }) => (
  <button onClick={onToggle} title="Alternar tema" style={{
    width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border-strong)',
    background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} /></button>
);

// ---- period bar ----
const CmPeriodBar = ({ ref0, setRef, period, setPeriod, scopeLabel, right }) => {
  const shift = (d) => setRef(cmShiftRef(ref0, period, d));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 40px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)', flexShrink: 0, flexWrap: 'wrap', rowGap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button className="btn btn-ghost" onClick={() => shift(-1)} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="chevronLeft" size={16} /></button>
        <div style={{ minWidth: 150, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>{scopeLabel.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{scopeLabel.sub}</div>
        </div>
        <button className="btn btn-ghost" onClick={() => shift(1)} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="chevronRight" size={16} /></button>
      </div>
      <button className="btn btn-secondary" onClick={() => setRef({ ...CM_REF0 })} style={{ height: 30, fontSize: 12, padding: '0 11px' }}>Hoje</button>
      <CmSegmented options={[{ value: 'mes', label: 'Mês' }, { value: 'trimestre', label: 'Trimestre' }, { value: 'ano', label: 'Ano' }]} value={period} onChange={setPeriod} size="sm" />
      <div style={{ marginLeft: 'auto' }}>{right}</div>
    </div>
  );
};

// ---- tab strip ----
const CmTabs = ({ tabs, active, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, padding: '0 40px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', minHeight: 44, flexShrink: 0, overflowX: 'auto' }}>
    {tabs.map((t) => {
      const on = active === t.id;
      return (
        <div key={t.id} onClick={() => onChange(t.id)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', cursor: 'pointer', whiteSpace: 'nowrap',
          fontSize: 13.5, fontWeight: on ? 600 : 500, color: on ? 'var(--text)' : 'var(--text-muted)',
          letterSpacing: '-0.01em', borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1,
        }}>
          <Icon name={t.icon} size={15} strokeWidth={on ? 2 : 1.75} />{t.label}
          {t.badge != null && (
            <span style={{ fontSize: 10.5, fontWeight: 600, background: on ? 'var(--accent-soft)' : 'var(--bg-sunken)', color: on ? 'var(--accent)' : 'var(--text-subtle)', padding: '1px 6px', borderRadius: 999, fontFeatureSettings: '"tnum"' }}>{t.badge}</span>
          )}
        </div>
      );
    })}
  </div>
);

// ---- page frame ----
const CmFrame = ({ children, pad = '24px 40px 56px' }) => (
  <div style={{ padding: pad, maxWidth: 1280, margin: '0 auto' }}>{children}</div>
);
const CmCardTitle = ({ title, sub, right }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginTop: 3 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

// ---- empty state ----
const CmEmpty = ({ icon = 'inbox', title, desc, action }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px', gap: 10 }}>
    <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg-sunken)', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={24} strokeWidth={1.6} /></div>
    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
    {desc && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.5 }}>{desc}</div>}
    {action}
  </div>
);

// ---- form fields ----
const CmLabel = ({ children, hint }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>{children}</span>
    {hint && <span style={{ fontSize: 10.5, color: 'var(--text-subtle)' }}>{hint}</span>}
  </div>
);
const CmField = ({ label, hint, children }) => (<div>{label && <CmLabel hint={hint}>{label}</CmLabel>}{children}</div>);
const CmInput = (props) => <input {...props} className="input" style={{ height: 38, fontSize: 13.5, ...(props.style || {}) }} />;
const CmSelect = ({ options, value, onChange, placeholder, ...rest }) => (
  <div style={{ position: 'relative' }}>
    <select value={value} onChange={onChange} {...rest} className="input" style={{ height: 38, fontSize: 13.5, appearance: 'none', WebkitAppearance: 'none', paddingRight: 34, cursor: 'pointer' }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-subtle)' }}><Icon name="chevronDown" size={15} /></div>
  </div>
);
const CmMoneyInput = ({ value, onChange, placeholder = '0,00', ...rest }) => (
  <div style={{ position: 'relative' }}>
    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>R$</span>
    <CmInput value={value} onChange={onChange} placeholder={placeholder} inputMode="decimal" style={{ paddingLeft: 36, fontFamily: 'var(--font-mono)' }} {...rest} />
  </div>
);

// ---- modal shell (slide-in) ----
const CmModal = ({ title, sub, onClose, children, footer, width = 580 }) => {
  React.useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div onMouseDown={onClose} style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', background: 'rgba(2,13,37,0.42)', backdropFilter: 'blur(3px)' }}>
      <div onMouseDown={(e) => e.stopPropagation()} className="cm-slidein" style={{
        width, maxWidth: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', borderLeft: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{title}</div>
            {sub && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="x" size={17} /></button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-soft)', flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  );
};

// ---- table header cell ----
const CmTh = ({ children, align = 'left', w }) => (
  <th style={{ textAlign: align, padding: '11px 14px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap', width: w }}>{children}</th>
);

// ---- mono number ----
const CmNum = ({ children, color = 'var(--text)', weight = 600, size = 12.5 }) => (
  <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum"', fontSize: size, fontWeight: weight, color, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{children}</span>
);

Object.assign(window, {
  CmDelta, CmKpi, CmOriginChip, CmPlatformBadge, CmStagePill, CmStatusChip, CmSegmented, CmThemeToggle,
  CmPeriodBar, CmTabs, CmFrame, CmCardTitle, CmEmpty, CmLabel, CmField, CmInput, CmSelect, CmMoneyInput, CmModal, CmTh, CmNum,
});
