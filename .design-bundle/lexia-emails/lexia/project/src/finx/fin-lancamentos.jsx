// LexIA · Financeiro — Lançamentos: unified table.
// Read-only cells (edit via modal), minimalist baixa (click status -> Pago + data),
// multi-select with bulk actions, série shortcut, CSV export, pinned totals bar.

const FX_TODAY_ISO = '2026-06-09';
const fxAgingLabel = (days) => (days <= 30 ? '1–30 dias' : days <= 60 ? '31–60 dias' : '+60 dias');

// ---------- CSV export ----------
function fxExportCSV(rows) {
  const dirLabel = (d) => (d === 'in' ? 'A receber' : 'A pagar');
  const head = ['Tipo', 'Descrição', 'Cliente/Fornecedor', 'Caso', 'Categoria', 'Vencimento', 'Pagamento', 'Valor', 'Status'];
  const esc = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
  const lines = [head.map(esc).join(';')];
  rows.forEach((r) => {
    lines.push([
      dirLabel(r.dir), r.desc, r.party, r.caso || '', r.cat,
      r.venc, r.pago ? r.pagoData : '',
      (r.dir === 'out' ? '-' : '') + r.valor.toFixed(2).replace('.', ','),
      FX_STATUS_LABEL[fxStatus(r)],
    ].map(esc).join(';'));
  });
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `lexia-lancamentos-${FX_TODAY_ISO}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const FxCatChip = ({ label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--bg-sunken)', padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap' }}>{label}</span>
);

// ---------- faceted filter dropdown (button doubles as active-value chip) ----------
const FxDot = ({ color }) => <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />;

const FxFilter = ({ label, icon, value, allValue = '', options, onChange, align = 'left' }) => {
  const { useState } = React;
  const [open, setOpen] = useState(false);
  const active = value !== allValue && value != null;
  const cur = options.find((o) => o.value === value);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        height: 34, display: 'inline-flex', alignItems: 'center', gap: 6, padding: active ? '0 5px 0 10px' : '0 9px 0 11px',
        borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
        whiteSpace: 'nowrap', letterSpacing: '-0.01em', transition: 'border-color .12s, background .12s, color .12s',
        border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border-strong)'),
        background: active ? 'var(--accent-soft)' : 'var(--surface)',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
      }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface-hover)'; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface)'; }}>
        {active && cur ? (
          <>
            {cur.dot ? <FxDot color={cur.dot} /> : (icon ? <Icon name={icon} size={13} style={{ opacity: 0.9 }} /> : null)}
            <span style={{ fontWeight: 500, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 128 }}>{cur.label}</span>
            <span role="button" title="Remover filtro" onClick={(e) => { e.stopPropagation(); onChange(allValue); setOpen(false); }} className="fx-deb" style={{ display: 'inline-flex', width: 18, height: 18, borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="plus" size={12} style={{ transform: 'rotate(45deg)' }} /></span>
          </>
        ) : (
          <>
            {icon && <Icon name={icon} size={14} style={{ opacity: 0.7 }} />}
            <span>{label}</span>
            <Icon name="chevronDown" size={14} style={{ opacity: 0.6 }} />
          </>
        )}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div className="card" style={{ position: 'absolute', [align]: 0, top: 40, zIndex: 41, minWidth: 192, maxHeight: 320, overflowY: 'auto', padding: 6, boxShadow: 'var(--shadow-lg)' }}>
            <button className="fx-menu-item" onClick={() => { onChange(allValue); setOpen(false); }} style={{ justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Todos</span>
              {!active && <Icon name="check" size={13} style={{ color: 'var(--accent)' }} />}
            </button>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 4px' }} />
            {options.map((o) => (
              <button key={o.value} className="fx-menu-item" onClick={() => { onChange(o.value); setOpen(false); }} style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>{o.dot && <FxDot color={o.dot} />}<span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span></span>
                {value === o.value && <Icon name="check" size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// clickable status: unpaid -> mark paid; paid -> static
const FxStatusCell = ({ it, onMarkPaid }) => {
  const status = fxStatus(it);
  if (it.pago) return <FxStatusPill status="pago" />;
  return (
    <button className="fx-pay" onClick={() => onMarkPaid(it.id)} title="Clique para dar baixa (registra hoje)"
      style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', borderRadius: 999 }}>
      <FxStatusPill status={status} />
    </button>
  );
};

// checkbox: FxCheck (custom, no estilo do kit) — definido em fin-ui.jsx

// ---------- row ----------
const FxRow = ({ it, selected, onSelect, onMarkPaid, onUnpay, onEdit, onDelete, onOpenSerie }) => {
  const { useState } = React;
  const [menu, setMenu] = useState(false);
  return (
    <tr style={{ borderTop: '1px solid var(--border)', background: selected ? 'var(--accent-soft)' : undefined }} className="fx-row">
      <td style={{ padding: '8px 8px 8px 16px', width: 32 }}><FxCheck checked={selected} onChange={() => onSelect(it.id)} /></td>
      <td style={{ padding: '8px 8px', width: 30 }}><FxDirChip dir={it.dir} compact /></td>
      <td style={{ padding: '8px 14px' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{it.desc}</div>
        <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span>{it.party}{it.caso ? ` · ${it.caso}` : ''}</span>
          {it.grupo && (it.serie
            ? <button onClick={() => onOpenSerie(it.serie)} className="fx-serie" title="Ver série / editar parcelas"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--accent)', fontWeight: 500, fontSize: 11, border: 'none', background: 'var(--accent-soft)', padding: '1px 7px', borderRadius: 999, cursor: 'pointer' }}>
                <Icon name="refreshCw" size={10} />{it.grupo}<Icon name="arrowRight" size={10} /></button>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--accent)', fontWeight: 500 }}><Icon name="refreshCw" size={10} />{it.grupo}</span>)}
        </div>
      </td>
      <td style={{ padding: '8px 14px' }}><FxCatChip label={it.cat} /></td>
      <td style={{ padding: '8px 14px' }}><span style={{ fontSize: 12, ...FX_NUM, color: 'var(--text-muted)' }}>{fxDate(it.venc)}</span></td>
      <td style={{ padding: '8px 14px' }}>{it.pago ? <span style={{ fontSize: 12, ...FX_NUM, color: 'var(--text-subtle)' }}>{fxDate(it.pagoData)}</span> : <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>—</span>}</td>
      <td style={{ padding: '8px 14px', textAlign: 'right' }}><FxMoney value={it.valor} dir={it.dir} size={12.5} weight={500} /></td>
      <td style={{ padding: '8px 14px' }}><FxStatusCell it={it} onMarkPaid={onMarkPaid} /></td>
      <td style={{ padding: '8px 16px 8px 8px', textAlign: 'right' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button className="btn btn-ghost" onClick={() => setMenu((m) => !m)} style={{ width: 28, height: 28, padding: 0 }}><Icon name="moreHorizontal" size={15} /></button>
          {menu && (
            <>
              <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div className="card" style={{ position: 'absolute', right: 0, top: 32, zIndex: 41, minWidth: 168, padding: 6, boxShadow: 'var(--shadow-lg)' }}>
                <button className="fx-menu-item" onClick={() => { setMenu(false); onEdit(it); }}><Icon name="edit" size={13} />Editar</button>
                {it.serie && <button className="fx-menu-item" onClick={() => { setMenu(false); onOpenSerie(it.serie); }}><Icon name="refreshCw" size={13} />Ver série</button>}
                {it.pago && <button className="fx-menu-item" onClick={() => { setMenu(false); onUnpay(it.id); }}><Icon name="refreshCw" size={13} />Reabrir (desfazer baixa)</button>}
                <button className="fx-menu-item" onClick={() => { setMenu(false); onDelete(it.id); }} style={{ color: 'var(--fin-neg,#C0492F)' }}><Icon name="minusCircle" size={13} />Excluir</button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

// ---------- totals bar ----------
const FxTotalsBar = ({ rows }) => {
  const ent = rows.filter((r) => r.dir === 'in').reduce((s, r) => s + r.valor, 0);
  const sai = rows.filter((r) => r.dir === 'out').reduce((s, r) => s + r.valor, 0);
  const saldo = ent - sai;
  const cell = (label, value, color, icon) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-sunken)', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={14} /></div>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 500, color, ...FX_NUM, letterSpacing: '-0.02em' }}>{fxMoney(value)}</div>
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 36, padding: '12px 40px', borderTop: '1px solid var(--border-strong)', background: 'var(--bg-soft)', flexShrink: 0 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'}</span>
      {cell('Entradas', ent, 'var(--fin-pos,#2E9E5B)', 'arrowDownRight')}
      {cell('Saídas', sai, 'var(--fin-neg,#C0492F)', 'arrowUpRight')}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: saldo >= 0 ? 'rgba(46,158,91,0.12)' : 'rgba(192,73,47,0.12)', color: saldo >= 0 ? 'var(--fin-pos,#2E9E5B)' : 'var(--fin-neg,#C0492F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="sigma" size={15} /></div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Saldo do período</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: saldo >= 0 ? 'var(--fin-pos,#2E9E5B)' : 'var(--fin-neg,#C0492F)', ...FX_NUM, letterSpacing: '-0.02em' }}>{fxMoney(saldo)}</div>
        </div>
      </div>
    </div>
  );
};

const FxTh = ({ children, align = 'left', w, sticky = false }) => (
  <th style={{
    textAlign: align, padding: '9px 14px', fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)',
    letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap', width: w,
    ...(sticky ? { position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-soft)' } : {}),
  }}>{children}</th>
);

// ---------- Lançamentos screen ----------
const FxLancamentos = ({ items, injectFilter, onNew, onMarkPaid, onUnpay, onEdit, onDelete, onOpenSerie, onBulkPaid, onBulkUnpay, onBulkDelete }) => {
  const { useState, useMemo, useEffect } = React;
  const [dir, setDir] = useState('todos');
  const [stat, setStat] = useState('todos');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [aging, setAging] = useState('');
  const [sel, setSel] = useState(() => new Set());

  // apply a filter pushed from elsewhere (e.g. inadimplência drilldown)
  useEffect(() => {
    if (!injectFilter) return;
    setDir(injectFilter.dir || 'todos');
    setStat(injectFilter.stat || 'todos');
    setCat(injectFilter.cat || '');
    setQ(injectFilter.q || '');
    setAging(injectFilter.aging || '');
  }, [injectFilter && injectFilter.nonce]);

  const allCats = useMemo(() => [...new Set(items.map((i) => i.cat))].sort(), [items]);
  const rows = useMemo(() => items.filter((it) => {
    if (dir !== 'todos' && it.dir !== dir) return false;
    if (stat !== 'todos' && fxStatus(it) !== stat) return false;
    if (cat && it.cat !== cat) return false;
    if (aging) { if (fxStatus(it) !== 'vencido') return false; if (fxAgingLabel(-fxDaysTo(it.venc)) !== aging) return false; }
    if (q) { const s = (it.desc + ' ' + it.party + ' ' + (it.caso || '')).toLowerCase(); if (!s.includes(q.toLowerCase())) return false; }
    return true;
  }), [items, dir, stat, cat, aging, q]);

  // prune selection to visible rows
  const rowIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  useEffect(() => { setSel((prev) => { const n = new Set([...prev].filter((id) => rowIds.has(id))); return n.size === prev.size ? prev : n; }); }, [rowIds]);

  const toggle = (id) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const someOn = sel.size > 0 && !allOn;
  const toggleAll = () => setSel(allOn ? new Set() : new Set(rows.map((r) => r.id)));
  const clearSel = () => setSel(new Set());
  const selArr = [...sel];

  const hasFilter = dir !== 'todos' || stat !== 'todos' || cat || q || aging;
  const activeCount = (dir !== 'todos' ? 1 : 0) + (stat !== 'todos' ? 1 : 0) + (cat ? 1 : 0) + (aging ? 1 : 0) + (q ? 1 : 0);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* filter bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '16px 40px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, rowGap: 10, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <div style={{ position: 'relative', flex: '0 1 220px', minWidth: 170 }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}><Icon name="search" size={15} /></div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por descrição, cliente, caso…" style={{ paddingLeft: 38, height: 34, fontSize: 13 }} />
          </div>
          <div style={{ width: 1, height: 22, background: 'var(--border)', flexShrink: 0 }} />
          <Icon name="filter" size={15} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
          <FxFilter label="Tipo" value={dir} allValue="todos" onChange={setDir} options={[{ value: 'in', label: 'Entradas', dot: '#2E9E5B' }, { value: 'out', label: 'Saídas', dot: '#C0492F' }]} />
          <FxFilter label="Status" value={stat} allValue="todos" onChange={setStat} options={[{ value: 'avencer', label: 'A vencer', dot: 'rgba(2,13,37,0.32)' }, { value: 'vencido', label: 'Vencido', dot: '#C0492F' }, { value: 'pago', label: 'Pago', dot: '#2E9E5B' }]} />
          <FxFilter label="Categoria" value={cat} allValue="" onChange={setCat} options={allCats.map((c) => ({ value: c, label: c }))} />
          <FxFilter label="Atraso" icon="clock" value={aging} allValue="" onChange={setAging} options={[{ value: '1–30 dias', label: '1–30 dias' }, { value: '31–60 dias', label: '31–60 dias' }, { value: '+60 dias', label: '+60 dias' }]} />
          {activeCount > 0 && (
            <button className="btn btn-ghost" onClick={() => { setDir('todos'); setStat('todos'); setCat(''); setQ(''); setAging(''); }} title="Limpar filtros" style={{ height: 34, fontSize: 12, gap: 4, padding: '0 8px', color: 'var(--text-muted)' }}>
              <Icon name="plus" size={12} style={{ transform: 'rotate(45deg)' }} />Limpar
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={() => fxExportCSV(rows)} title="Exportar CSV" style={{ width: 38, height: 34, padding: 0 }}><Icon name="download" size={15} /></button>
          {onNew && <button className="btn btn-primary" onClick={onNew} style={{ height: 34, fontSize: 12, padding: '0 16px' }}><Icon name="plus" size={14} />Novo lançamento</button>}
        </div>
      </div>

      {/* bulk action bar */}
      {sel.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 40px', margin: '0 40px 6px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--r-sm)', flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)' }}>{sel.size} selecionado{sel.size > 1 ? 's' : ''}</span>
          <div style={{ width: 1, height: 18, background: 'var(--border-strong)' }} />
          <button className="btn btn-secondary" onClick={() => { onBulkPaid(selArr); clearSel(); }} style={{ height: 30, fontSize: 12, borderColor: 'rgba(46,158,91,0.4)', color: '#2E9E5B' }}><Icon name="check" size={13} strokeWidth={2.3} />Dar baixa</button>
          <button className="btn btn-secondary" onClick={() => { onBulkUnpay(selArr); clearSel(); }} style={{ height: 30, fontSize: 12 }}><Icon name="refreshCw" size={12} />Reabrir</button>
          <button className="btn btn-secondary" onClick={() => { onBulkDelete(selArr); clearSel(); }} style={{ height: 30, fontSize: 12, color: 'var(--fin-neg,#C0492F)' }}><Icon name="minusCircle" size={13} />Excluir</button>
          <div style={{ marginLeft: 'auto' }}><button className="btn btn-ghost" onClick={clearSel} style={{ height: 30, fontSize: 12 }}>Cancelar</button></div>
        </div>
      )}

      {/* table */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 40px' }}>
        <div className="card" style={{ padding: 0, overflow: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-soft)', position: 'sticky', top: 0, zIndex: 2 }}>
                <FxTh w={32}><FxCheck checked={allOn} indeterminate={someOn} onChange={toggleAll} title="Selecionar todos" /></FxTh>
                <FxTh w={30}></FxTh>
                <FxTh>Descrição</FxTh>
                <FxTh>Categoria</FxTh>
                <FxTh>Vencimento</FxTh>
                <FxTh>Pagamento</FxTh>
                <FxTh align="right">Valor</FxTh>
                <FxTh>Status</FxTh>
                <FxTh align="right"></FxTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => <FxRow key={it.id} it={it} selected={sel.has(it.id)} onSelect={toggle} onMarkPaid={onMarkPaid} onUnpay={onUnpay} onEdit={onEdit} onDelete={onDelete} onOpenSerie={onOpenSerie} />)}
              {rows.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '56px 16px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: 13 }}>
                  <Icon name="search" size={22} style={{ opacity: 0.5 }} /><div style={{ marginTop: 8 }}>Nenhum lançamento neste período ou filtro.</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ height: 16 }} />
      </div>

      <FxTotalsBar rows={rows} />
    </div>
  );
};

Object.assign(window, { FxLancamentos, FX_TODAY_ISO, fxExportCSV });
