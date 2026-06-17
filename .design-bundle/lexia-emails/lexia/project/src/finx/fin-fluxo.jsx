// LexIA · Financeiro — Fluxo de caixa.
// Projeção do saldo acumulado com seletor de horizonte (6m / 12m / 24m / completo).
// Regras de legibilidade: rótulos do eixo X com thinning automático (nunca
// sobrepostos), gridlines horizontais com escala, marcador "hoje" e legendas
// que quebram linha em vez de cortar.

const FX_OPENING = 95000;            // saldo inicial de caixa
const FX_CUR_MONTH = '2026-06';      // mês corrente (hoje)

function fxMonthlyAgg(items) {
  const keys = [...new Set(items.map((i) => fxMonthKey(i.venc)))].sort();
  let acc = FX_OPENING;
  return keys.map((k) => {
    const ms = items.filter((i) => fxMonthKey(i.venc) === k);
    const ent = ms.filter((i) => i.dir === 'in').reduce((s, i) => s + i.valor, 0);
    const sai = ms.filter((i) => i.dir === 'out').reduce((s, i) => s + i.valor, 0);
    const saldo = ent - sai;
    acc += saldo;
    const [y, m] = k.split('-');
    return { key: k, label: `${FX_MON[Number(m) - 1]}`, ano: y, ent, sai, saldo, acc, proj: k > FX_CUR_MONTH };
  });
}

// which indices get an x-axis label (thinning so labels never overlap)
function fxTickIdx(n, maxTicks = 14) {
  const every = Math.max(1, Math.ceil(n / maxTicks));
  const set = new Set();
  for (let i = 0; i < n; i += every) set.add(i);
  return { set, every };
}
const fxTickLabel = (d, i) => (i === 0 || d.label === 'jan' ? `${d.label} ${d.ano.slice(2)}` : d.label);
const fxAxisMoney = (v) => (v === 0 ? 'R$ 0' : `${v < 0 ? '−' : ''}${Math.round(Math.abs(v) / 1000)} mil`);

// ---------- accumulated balance area chart ----------
const FxCashChart = ({ data }) => {
  const W = 980, H = 250, padL = 14, padR = 14, padT = 16, padB = 30;
  const iw = W - padL - padR, ih = H - padT - padB;
  const accs = data.map((d) => d.acc).concat([FX_OPENING]);
  const min = Math.min(0, ...accs), max = Math.max(...accs);
  const x = (i) => padL + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v) => padT + ih - ((v - min) / (max - min || 1)) * ih;
  const pts = data.map((d, i) => [x(i), y(d.acc)]);
  const firstProj = data.findIndex((d) => d.proj);
  const curIdx = firstProj === -1 ? data.length - 1 : firstProj - 1;
  const solid = pts.slice(0, curIdx + 1);
  const dashed = pts.slice(curIdx);
  const line = (arr) => arr.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const areaPath = solid.length > 1 ? `${line(solid)} L${solid[solid.length - 1][0].toFixed(1)} ${y(min).toFixed(1)} L${padL} ${y(min).toFixed(1)} Z` : '';
  const { set: ticks } = fxTickIdx(data.length);
  // 4 gridlines em valores uniformes entre min e max
  const grid = [0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="fxArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.20" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {grid.map((v, gi) => (
        <g key={gi}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
          <text x={padL + 2} y={y(v) - 4} fontSize="10" fill="var(--text-subtle)" style={{ fontFamily: 'var(--font-sans)', fontFeatureSettings: '"tnum"' }}>{fxAxisMoney(v)}</text>
        </g>
      ))}
      {min < 0 && <line x1={padL} y1={y(0)} x2={W - padR} y2={y(0)} stroke="var(--fin-neg,#C0492F)" strokeOpacity="0.4" strokeDasharray="3 3" />}
      {/* marcador "hoje" */}
      {curIdx >= 0 && curIdx < data.length - 1 && (
        <g>
          <line x1={x(curIdx)} y1={padT - 2} x2={x(curIdx)} y2={H - padB} stroke="var(--text-subtle)" strokeOpacity="0.45" strokeDasharray="2 4" />
          <text x={x(curIdx)} y={padT - 5} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--text-subtle)" style={{ fontFamily: 'var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>hoje</text>
        </g>
      )}
      {areaPath && <path d={areaPath} fill="url(#fxArea)" />}
      <path d={line(solid)} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d={line(dashed)} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeDasharray="5 4" strokeOpacity="0.7" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={d.key}>
          <circle cx={x(i)} cy={y(d.acc)} r={d.proj ? 2.8 : 3.4} fill={d.proj ? 'var(--bg)' : 'var(--accent)'} stroke="var(--accent)" strokeWidth="1.8">
            <title>{`${d.label}/${d.ano.slice(2)} · acumulado ${fxMoney(d.acc)}`}</title>
          </circle>
          {ticks.has(i) && (
            <text x={x(i)} y={H - 9} textAnchor="middle" fontSize="10.5" fill="var(--text-subtle)" style={{ fontFamily: 'var(--font-sans)' }}>{fxTickLabel(d, i)}{d.proj ? '*' : ''}</text>
          )}
        </g>
      ))}
    </svg>
  );
};

// ---------- grouped bars: entradas vs saídas ----------
const FxBars = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => Math.max(d.ent, d.sai)));
  const { set: ticks } = fxTickIdx(data.length, 12);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, height: 172, padding: '0 2px' }}>
      {data.map((d, i) => (
        <div key={d.key} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: d.proj ? 0.55 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 134, width: '100%', justifyContent: 'center' }}>
            <div title={`${d.label}/${d.ano.slice(2)} · entradas ${fxMoney(d.ent)}`} style={{ width: '36%', maxWidth: 13, minWidth: 3, height: `${(d.ent / max) * 100}%`, minHeight: 2, background: 'var(--fin-pos,#2E9E5B)', borderRadius: '3px 3px 0 0' }}></div>
            <div title={`${d.label}/${d.ano.slice(2)} · saídas ${fxMoney(d.sai)}`} style={{ width: '36%', maxWidth: 13, minWidth: 3, height: `${(d.sai / max) * 100}%`, minHeight: 2, background: 'var(--fin-neg,#C0492F)', borderRadius: '3px 3px 0 0' }}></div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-subtle)', whiteSpace: 'nowrap', visibility: ticks.has(i) ? 'visible' : 'hidden' }}>{fxTickLabel(d, i)}{d.proj ? '*' : ''}</span>
        </div>
      ))}
    </div>
  );
};

const FxLegend = ({ items }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
    {items.map((it) => (
      <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color, flexShrink: 0, ...(it.dash ? { background: 'none', border: `1.5px dashed ${it.color}` } : {}) }}></span>{it.label}
      </span>
    ))}
  </div>
);

const FX_HORIZONS = [
  { value: 'h6', label: '6m', months: 6 },
  { value: 'h12', label: '12m', months: 12 },
  { value: 'h24', label: '24m', months: 24 },
  { value: 'all', label: 'Completo', months: Infinity },
];

const FxFluxo = ({ items }) => {
  const { useMemo, useState } = React;
  const [horizon, setHorizon] = useState('h12');
  const all = useMemo(() => fxMonthlyAgg(items), [items]);

  const data = useMemo(() => {
    const h = FX_HORIZONS.find((o) => o.value === horizon);
    if (!h || h.months === Infinity) return all;
    const end = fxAddMonths(FX_CUR_MONTH + '-01', h.months).slice(0, 7);
    return all.filter((d) => d.key <= end);
  }, [all, horizon]);

  const totEnt = data.reduce((s, d) => s + d.ent, 0);
  const totSai = data.reduce((s, d) => s + d.sai, 0);
  const finalAcc = data.length ? data[data.length - 1].acc : FX_OPENING;
  const lowest = data.reduce((m, d) => Math.min(m, d.acc), FX_OPENING);
  const curRow = data.find((d) => d.key === FX_CUR_MONTH);
  const saldoHoje = curRow ? curRow.acc : FX_OPENING;
  const first = data[0], last = data[data.length - 1];
  const span = first ? `${first.label}/${first.ano.slice(2)} – ${last.label}/${last.ano.slice(2)}` : '';
  const curLabel = FX_MON_FULL[Number(FX_CUR_MONTH.slice(5)) - 1].toLowerCase();

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      <FxFrame>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--text)' }}>Fluxo de caixa</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{span} · meses com * são projeção, com recorrentes em aberto</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontWeight: 500 }}>Horizonte</span>
            <FxSegmented size="sm" value={horizon} onChange={setHorizon} options={FX_HORIZONS.map(({ value, label }) => ({ value, label }))} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
          <FxKpi label="Saldo inicial" value={fxCompact(FX_OPENING)} sub={first ? `Caixa de abertura · ${first.label}/${first.ano.slice(2)}` : 'Caixa de abertura'} icon="wallet" />
          <FxKpi label={`Saldo em ${curLabel}`} value={fxCompact(saldoHoje)} sub="Posição de caixa atual" icon="banknote" accent="gold" tone={saldoHoje >= 0 ? 'pos' : 'neg'} />
          <FxKpi label="Saldo ao final do horizonte" value={fxCompact(finalAcc)} sub={last ? `Projetado para ${last.label}/${last.ano.slice(2)}` : ''} icon="trendingUp" tone={finalAcc >= 0 ? 'pos' : 'neg'} />
          <FxKpi label="Menor saldo do horizonte" value={fxCompact(lowest)} sub="Ponto de maior aperto" icon="alertTriangle" tone={lowest < 0 ? 'neg' : undefined} />
        </div>

        <div className="card" style={{ padding: '18px 22px', marginBottom: 20 }}>
          <FxCardTitle title="Projeção de caixa · saldo acumulado" sub="Linha cheia: realizado. Linha tracejada: projetado a partir de hoje."
            right={<FxLegend items={[{ label: 'Realizado', color: 'var(--accent)' }, { label: 'Projetado', color: 'var(--accent)', dash: true }]} />} />
          <FxCashChart data={data} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 20, alignItems: 'start' }}>
          <div className="card" style={{ padding: '18px 22px' }}>
            <FxCardTitle title="Entradas vs saídas" sub="Por mês de competência"
              right={<FxLegend items={[{ label: 'Entradas', color: 'var(--fin-pos,#2E9E5B)' }, { label: 'Saídas', color: 'var(--fin-neg,#C0492F)' }]} />} />
            <FxBars data={data} />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <FxTh sticky>Mês</FxTh>
                    <FxTh sticky align="right">Entradas</FxTh>
                    <FxTh sticky align="right">Saídas</FxTh>
                    <FxTh sticky align="right">Saldo</FxTh>
                    <FxTh sticky align="right">Acumulado</FxTh>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr key={d.key} style={{ opacity: d.proj ? 0.66 : 1 }}>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize', borderTop: '1px solid var(--border)' }}>{d.label}/{d.ano.slice(2)}{d.proj && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)' }}>proj.</span>}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', borderTop: '1px solid var(--border)' }}><span style={{ fontSize: 12, ...FX_NUM, color: 'var(--fin-pos,#2E9E5B)' }}>{fxCompact(d.ent)}</span></td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', borderTop: '1px solid var(--border)' }}><span style={{ fontSize: 12, ...FX_NUM, color: 'var(--fin-neg,#C0492F)' }}>{fxCompact(d.sai)}</span></td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', borderTop: '1px solid var(--border)' }}><span style={{ fontSize: 12, ...FX_NUM, fontWeight: 500, color: d.saldo >= 0 ? 'var(--text)' : 'var(--fin-neg,#C0492F)' }}>{fxCompact(d.saldo)}</span></td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', borderTop: '1px solid var(--border)' }}><span style={{ fontSize: 12, ...FX_NUM, fontWeight: 500, color: d.acc >= 0 ? 'var(--accent)' : 'var(--fin-neg,#C0492F)' }}>{fxCompact(d.acc)}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 500, color: 'var(--text)', position: 'sticky', bottom: 0, background: 'var(--bg-soft)', borderTop: '2px solid var(--border-strong)' }}>Total</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', position: 'sticky', bottom: 0, background: 'var(--bg-soft)', borderTop: '2px solid var(--border-strong)' }}><span style={{ fontSize: 12, ...FX_NUM, fontWeight: 500, color: 'var(--fin-pos,#2E9E5B)' }}>{fxCompact(totEnt)}</span></td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', position: 'sticky', bottom: 0, background: 'var(--bg-soft)', borderTop: '2px solid var(--border-strong)' }}><span style={{ fontSize: 12, ...FX_NUM, fontWeight: 500, color: 'var(--fin-neg,#C0492F)' }}>{fxCompact(totSai)}</span></td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', position: 'sticky', bottom: 0, background: 'var(--bg-soft)', borderTop: '2px solid var(--border-strong)' }}><span style={{ fontSize: 12, ...FX_NUM, fontWeight: 500, color: 'var(--text)' }}>{fxCompact(totEnt - totSai)}</span></td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', position: 'sticky', bottom: 0, background: 'var(--bg-soft)', borderTop: '2px solid var(--border-strong)' }}><span style={{ fontSize: 12, ...FX_NUM, fontWeight: 500, color: 'var(--accent)' }}>{fxCompact(finalAcc)}</span></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </FxFrame>
    </div>
  );
};

Object.assign(window, { FxFluxo, fxMonthlyAgg, FX_OPENING, FX_CUR_MONTH });
