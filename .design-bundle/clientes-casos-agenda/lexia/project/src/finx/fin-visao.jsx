// LexIA · Financeiro — Visão geral (monthly). KPIs do período + situação + próximos vencimentos.

const FxSituacaoBar = ({ items }) => {
  const groups = ['avencer', 'vencido', 'pago'].map((s) => {
    const rows = items.filter((i) => fxStatus(i) === s);
    return { s, count: rows.length, value: rows.reduce((a, b) => a + b.valor, 0) };
  });
  const total = Math.max(1, groups.reduce((a, g) => a + g.value, 0));
  const meta = { avencer: { c: 'var(--text-muted)', l: 'A vencer' }, vencido: { c: '#C0492F', l: 'Vencido' }, pago: { c: '#2E9E5B', l: 'Pago / recebido' } };
  return (
    <div>
      <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--bg-sunken)', marginBottom: 16 }}>
        {groups.map((g) => g.value > 0 && <div key={g.s} title={`${meta[g.s].l}: ${fxMoney(g.value)}`} style={{ width: `${(g.value / total) * 100}%`, background: meta[g.s].c, opacity: g.s === 'avencer' ? 0.5 : 0.9 }} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {groups.map((g) => (
          <div key={g.s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: meta[g.s].c, opacity: g.s === 'avencer' ? 0.6 : 1, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{meta[g.s].l}</span>
            <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{g.count}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', ...FX_NUM, width: 96, textAlign: 'right' }}>{fxCompact(g.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const FxVencRow = ({ it, onMarkPaid }) => {
  const status = fxStatus(it);
  const days = fxDaysTo(it.venc);
  const when = status === 'vencido' ? `há ${Math.abs(days)}d` : days === 0 ? 'hoje' : `em ${days}d`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: '1px solid var(--border)' }}>
      <FxDirChip dir={it.dir} compact />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.desc}</div>
        <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{it.party} · {fxDate(it.venc)} · <span style={{ color: status === 'vencido' ? '#C0492F' : 'var(--text-subtle)' }}>{when}</span></div>
      </div>
      <FxMoney value={it.valor} dir={it.dir} size={12.5} />
      <button className="fx-baixa" onClick={() => onMarkPaid(it.id)} title="Dar baixa (registra hoje)"><Icon name="check" size={12} strokeWidth={2.4} />Baixa</button>
    </div>
  );
};

// ---------- inadimplência (overdue receivables, global) ----------
const FxInadimplencia = ({ allItems, onDrill }) => {
  const over = allItems.filter((i) => i.dir === 'in' && !i.pago && fxStatus(i) === 'vencido');
  const total = over.reduce((a, b) => a + b.valor, 0);
  const clientes = [...new Set(over.map((i) => i.party))];
  const buckets = [
    { label: '1–30 dias', test: (d) => d <= 30, c: '#D98A2B' },
    { label: '31–60 dias', test: (d) => d > 30 && d <= 60, c: '#C77E1F' },
    { label: '+60 dias', test: (d) => d > 60, c: '#C0492F' },
  ].map((b) => { const rows = over.filter((i) => b.test(-fxDaysTo(i.venc))); return { ...b, value: rows.reduce((a, x) => a + x.valor, 0), count: rows.length }; });
  const maxB = Math.max(1, ...buckets.map((b) => b.value));
  const top = Object.values(over.reduce((m, i) => {
    const k = i.party; if (!m[k]) m[k] = { party: k, value: 0, dias: 0 };
    m[k].value += i.valor; m[k].dias = Math.max(m[k].dias, -fxDaysTo(i.venc)); return m;
  }, {})).sort((a, b) => b.value - a.value).slice(0, 3);

  return (
    <div className="card" style={{ padding: '18px 22px' }}>
      <FxCardTitle title="Inadimplência" sub="Honorários vencidos e não recebidos (carteira toda)"
        right={over.length > 0 && <button className="btn btn-ghost" onClick={() => onDrill({ dir: 'in', stat: 'vencido' })} style={{ height: 28, fontSize: 12, padding: '0 9px', color: 'var(--accent)' }}>Ver títulos<Icon name="arrowRight" size={13} /></button>} />
      {over.length === 0 ? (
        <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-subtle)' }}>Sem inadimplência. 🎉</div>
      ) : (
        <React.Fragment>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 25, fontWeight: 500, color: 'var(--fin-neg,#C0492F)', letterSpacing: '-0.025em', ...FX_NUM }}>{fxCompact(total)}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{over.length} títulos · {clientes.length} cliente{clientes.length > 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
            {buckets.map((b) => (
              <button key={b.label} onClick={() => b.count > 0 && onDrill({ dir: 'in', stat: 'vencido', aging: b.label })} className={b.count > 0 ? 'fx-deb' : ''}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 8px', margin: '0 -8px', border: 'none', background: 'transparent', borderRadius: 7, cursor: b.count > 0 ? 'pointer' : 'default', width: 'calc(100% + 16px)', textAlign: 'left' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 64, flexShrink: 0 }}>{b.label}</span>
                <div style={{ flex: 1, height: 7, background: 'var(--bg-sunken)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${(b.value / maxB) * 100}%`, height: '100%', background: b.c, borderRadius: 4, opacity: 0.9 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)', width: 16, textAlign: 'right' }}>{b.count}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', ...FX_NUM, width: 74, textAlign: 'right' }}>{fxCompact(b.value)}</span>
              </button>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 4 }}>Maiores devedores · clique para cobrar</div>
            {top.map((t) => (
              <button key={t.party} onClick={() => onDrill({ dir: 'in', stat: 'vencido', q: t.party })} className="fx-deb"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', margin: '0 -8px', width: 'calc(100% + 16px)', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(192,73,47,0.12)', color: '#C0492F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500, flexShrink: 0 }}>{t.party.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.party}</span>
                <span style={{ fontSize: 11, color: '#C0492F', fontWeight: 500 }}>{t.dias}d</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', ...FX_NUM, width: 76, textAlign: 'right' }}>{fxCompact(t.value)}</span>
                <Icon name="chevronRight" size={14} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

const FxVisao = ({ items, allItems, scopeLabel, onMarkPaid, onNew, onDrill }) => {
  const { useMemo } = React;
  const recebido = items.filter((i) => i.dir === 'in' && i.pago).reduce((a, b) => a + b.valor, 0);
  const aReceber = items.filter((i) => i.dir === 'in' && !i.pago).reduce((a, b) => a + b.valor, 0);
  const gastos = items.filter((i) => i.dir === 'out' && i.pago).reduce((a, b) => a + b.valor, 0);
  const aPagar = items.filter((i) => i.dir === 'out' && !i.pago).reduce((a, b) => a + b.valor, 0);
  const resultado = recebido - gastos;
  const vencidos = items.filter((i) => fxStatus(i) === 'vencido');
  const venc = useMemo(() => items.filter((i) => !i.pago).sort((a, b) => a.venc.localeCompare(b.venc)).slice(0, 7), [items]);
  const nRec = items.filter((i) => i.dir === 'in' && i.pago).length;
  const nAbe = items.filter((i) => i.dir === 'in' && !i.pago).length;

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      <FxFrame>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--text)' }}>Visão geral · {scopeLabel.title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{items.length} lançamentos no período · {scopeLabel.sub}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
          <FxKpi label="Recebido" value={fxCompact(recebido)} sub={nRec === 1 ? '1 entrada baixada' : `${nRec} entradas baixadas`} icon="banknote" accent="gold" tone={recebido > 0 ? 'pos' : undefined} />
          <FxKpi label="A receber em aberto" value={fxCompact(aReceber)} sub={nAbe === 1 ? '1 honorário' : `${nAbe} honorários`} icon="clock" />
          <FxKpi label="Gastos pagos" value={fxCompact(gastos)} sub={`${fxCompact(aPagar)} ainda a pagar`} icon="arrowUpRight" />
          <FxKpi label="Resultado do período" value={fxCompact(resultado)} sub="Recebido − gastos pagos" icon="sigma" tone={resultado === 0 ? undefined : resultado > 0 ? 'pos' : 'neg'} />
        </div>

        {vencidos.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 16px', background: 'rgba(192,73,47,0.07)', border: '1px solid rgba(192,73,47,0.22)', borderRadius: 'var(--r-md)', marginBottom: 22 }}>
            <div style={{ color: '#C0492F', flexShrink: 0 }}><Icon name="alertTriangle" size={17} strokeWidth={1.9} /></div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{vencidos.length} {vencidos.length === 1 ? 'lançamento vencido' : 'lançamentos vencidos'} · <span style={FX_NUM}>{fxMoney(vencidos.reduce((a, b) => a + b.valor, 0))}</span></span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}> — requerem cobrança ou pagamento.</span>
            </div>
            <button className="btn btn-secondary" onClick={() => onDrill({ stat: 'vencido' })} style={{ height: 28, fontSize: 12, padding: '0 11px', flexShrink: 0 }}>Ver vencidos<Icon name="arrowRight" size={13} /></button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <FxInadimplencia allItems={allItems} onDrill={onDrill} />
            <div className="card" style={{ padding: '18px 22px' }}>
              <FxCardTitle title="Por situação" sub="Distribuição dos lançamentos do período" />
              <FxSituacaoBar items={items} />
            </div>
          </div>
          <div className="card" style={{ padding: '18px 22px' }}>
            <FxCardTitle title="Próximos vencimentos" sub="Em aberto, ordenados por data" right={venc.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{venc.length} de {items.filter((i) => !i.pago).length}</span>} />
            {venc.length === 0
              ? <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-subtle)' }}>Nada em aberto neste período. 🎉</div>
              : <div style={{ marginTop: -4 }}>{venc.map((it) => <FxVencRow key={it.id} it={it} onMarkPaid={onMarkPaid} />)}</div>}
          </div>
        </div>
      </FxFrame>
    </div>
  );
};

Object.assign(window, { FxVisao });
