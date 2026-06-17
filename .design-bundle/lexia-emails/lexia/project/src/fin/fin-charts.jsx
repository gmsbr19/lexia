// Financeiro charts — hand-built SVG, stylized. No chart lib.
// RevenueAreaChart (recebido vs a receber + melting projection),
// CompositionDonut, BreakEvenBar, AgingBars.

const niceMax = (v) => {
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / pow) * pow;
};

// ---------- Revenue area chart ----------
const RevenueAreaChart = ({ data = REVENUE_SERIES, height = 260 }) => {
  const W = 760, H = height, padL = 8, padR = 8, padT = 18, padB = 28;
  const iw = W - padL - padR, ih = H - padT - padB;
  const totals = data.map(d => d.recebido + d.receber);
  const max = niceMax(Math.max(...totals) * 1.05);
  const n = data.length;
  const x = (i) => padL + (iw * i) / (n - 1);
  const y = (v) => padT + ih - (ih * v) / max;

  // stacked: base = recebido, top = recebido + receber
  const baseLine = data.map((d, i) => [x(i), y(d.recebido)]);
  const topLine  = data.map((d, i) => [x(i), y(d.recebido + d.receber)]);
  const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = (pts) => `${path(pts)} L${x(n - 1).toFixed(1)} ${y(0)} L${padL} ${y(0)} Z`;
  const band = (lower, upper) => `${path(lower)} ${upper.slice().reverse().map(p => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')} Z`;

  const projStart = data.findIndex(d => d.proj);
  const splitX = projStart > 0 ? x(projStart - 0.5) : W;
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map(f => f * max);

  return (
    <div style={{ width: '100%', height: H }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={FIN.c.recebido} stopOpacity="0.28" />
            <stop offset="100%" stopColor={FIN.c.recebido} stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="rebGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={FIN.c.receber} stopOpacity="0.34" />
            <stop offset="100%" stopColor={FIN.c.receber} stopOpacity="0.06" />
          </linearGradient>
          <pattern id="meltHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={FIN.c.receber} fillOpacity="0.10" />
            <line x1="0" y1="0" x2="0" y2="6" stroke={FIN.c.receber} strokeOpacity="0.42" strokeWidth="1.4" />
          </pattern>
          <clipPath id="histClip"><rect x="0" y="0" width={splitX} height={H} /></clipPath>
          <clipPath id="projClip"><rect x={splitX} y="0" width={W - splitX} height={H} /></clipPath>
        </defs>

        {/* gridlines */}
        {gridVals.map((v, i) => (
          <line key={i} x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
        ))}

        {/* a receber band (gold) — historical solid, projection hatched */}
        <g clipPath="url(#histClip)">
          <path d={band(baseLine, topLine)} fill="url(#rebGrad)" />
        </g>
        <g clipPath="url(#projClip)">
          <path d={band(baseLine, topLine)} fill="url(#meltHatch)" />
        </g>

        {/* recebido area (navy) */}
        <path d={area(baseLine)} fill="url(#recGrad)" />

        {/* recebido line — solid then dashed in projection */}
        <g clipPath="url(#histClip)"><path d={path(baseLine)} fill="none" stroke={FIN.c.recebido} strokeWidth="2.4" /></g>
        <g clipPath="url(#projClip)"><path d={path(baseLine)} fill="none" stroke={FIN.c.recebido} strokeWidth="2.4" strokeDasharray="2 4" strokeOpacity="0.6" /></g>
        {/* a receber top line */}
        <g clipPath="url(#histClip)"><path d={path(topLine)} fill="none" stroke={FIN.c.receber} strokeWidth="2" /></g>
        <g clipPath="url(#projClip)"><path d={path(topLine)} fill="none" stroke={FIN.c.receber} strokeWidth="2" strokeDasharray="3 4" /></g>

        {/* projection divider */}
        {projStart > 0 && (
          <line x1={splitX} y1={padT - 6} x2={splitX} y2={padT + ih} stroke="var(--text-subtle)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        )}

        {/* dots on recebido at historical points */}
        {data.map((d, i) => !d.proj && (
          <circle key={i} cx={x(i)} cy={y(d.recebido)} r="2.6" fill="var(--surface)" stroke={FIN.c.recebido} strokeWidth="1.6" />
        ))}
      </svg>
      {/* x labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px', marginTop: -22 }}>
        {data.map((d, i) => (
          <span key={i} style={{ fontSize: 11, color: d.proj ? 'var(--text-subtle)' : 'var(--text-muted)', fontWeight: d.proj ? 400 : 500, fontFeatureSettings: '"tnum"' }}>{d.mes}</span>
        ))}
      </div>
    </div>
  );
};

const ChartLegend = ({ items }) => (
  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
    {items.map((it, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted)' }}>
        <span style={{
          width: 12, height: it.dash ? 0 : 10, borderRadius: it.dash ? 0 : 3,
          background: it.dash ? 'transparent' : it.color,
          borderTop: it.dash ? `2px dashed ${it.color}` : 'none',
        }} />
        {it.label}
      </div>
    ))}
  </div>
);

// ---------- Composition donut ----------
const CompositionDonut = ({ data = COMPOSITION, size = 168 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2, ir = r * 0.62, cx = r, cy = r;
  let acc = -90;
  const seg = (val) => {
    const ang = (val / total) * 360;
    const a0 = acc * Math.PI / 180, a1 = (acc + ang) * Math.PI / 180;
    acc += ang;
    const large = ang > 180 ? 1 : 0;
    const p = (ra, a) => [cx + ra * Math.cos(a), cy + ra * Math.sin(a)];
    const [x0, y0] = p(r, a0), [x1, y1] = p(r, a1);
    const [x2, y2] = p(ir, a1), [x3, y3] = p(ir, a0);
    return `M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${ir} ${ir} 0 ${large} 0 ${x3} ${y3} Z`;
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {data.map((d, i) => <path key={i} d={seg(d.value)} fill={d.color} />)}
          <circle cx={cx} cy={cy} r={ir - 1} fill="var(--surface)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.02em' }}>Total</span>
          <span style={{ fontSize: 17, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>{brlCompact(total)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1, minWidth: 150 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{d.label}</span>
            <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontFeatureSettings: '"tnum"' }}>{Math.round(d.value / total * 100)}%</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum"', minWidth: 78, textAlign: 'right' }}>{brlCompact(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Aging bars (horizontal) ----------
const AgingBars = ({ data = AGING }) => {
  const max = Math.max(...data.map(d => d.value));
  const colorOf = (tone) => tone === 'vermelho' ? FIN.c.vermelho : tone === 'amber' ? FIN.c.amber : FIN.c.positivo;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 84, flexShrink: 0 }}>{d.bucket}</span>
          <div style={{ flex: 1, height: 22, background: 'var(--bg-sunken)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: colorOf(d.tone), borderRadius: 6, opacity: 0.9 }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum"', width: 84, textAlign: 'right' }}>{brlCompact(d.value)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-subtle)', width: 64, textAlign: 'right' }}>{d.count} títulos</span>
        </div>
      ))}
    </div>
  );
};

// ---------- Break-even bar ----------
const BreakEvenBar = ({ be = BREAKEVEN }) => {
  const scaleMax = Math.max(be.receita, be.custoFixo) * 1.18;
  const recPct = (be.receita / scaleMax) * 100;
  const bePct = (be.custoFixo / scaleMax) * 100;
  const acima = be.receita >= be.custoFixo;
  return (
    <div>
      <div style={{ position: 'relative', height: 34, background: 'var(--bg-sunken)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${recPct}%`, background: acima ? FIN.c.positivo : FIN.c.amber, opacity: 0.88, borderRadius: 8, transition: 'width .3s' }} />
        <div style={{ position: 'absolute', left: `${bePct}%`, top: -6, bottom: -6, width: 0, borderLeft: '2px dashed var(--text)' }} />
      </div>
      <div style={{ position: 'relative', height: 18, marginTop: 4 }}>
        <span style={{ position: 'absolute', left: `${bePct}%`, transform: 'translateX(-50%)', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          break-even · {brlCompact(be.custoFixo)}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: FIN.c.positivo }} />
          Receita realizada
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: acima ? 'var(--fin-pos,#2E9E5B)' : 'var(--fin-neg,#C0492F)' }}>
          {acima ? '+' : '−'}{brlCompact(Math.abs(be.receita - be.custoFixo))} {acima ? 'acima do ponto' : 'abaixo'}
        </span>
      </div>
    </div>
  );
};

Object.assign(window, { RevenueAreaChart, CompositionDonut, AgingBars, BreakEvenBar, ChartLegend });
