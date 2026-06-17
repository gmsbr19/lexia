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
  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--bg-sunken)', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{label}</span>
);

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
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>{it.desc}</div>
        <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span>{it.party}{it.caso ? ` · ${it.caso}` : ''}</span>
          {it.grupo && (it.serie
            ? <button onClick={() => onOpenSerie(it.serie)} className="fx-serie" title="Ver série / editar parcelas"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--accent)', fontWeight: 600, fontSize: 11, border: 'none', background: 'var(--accent-soft)', padding: '1px 7px', borderRadius: 999, cursor: 'pointer' }}>
                <Icon name="refreshCw" size={10} />{it.grupo}<Icon name="arrowRight" size={10} /></button>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--accent)', fontWeight: 500 }}><Icon name="refreshCw" size={10} />{it.grupo}</span>)}
        </div>
      </td>
      <td style={{ padding: '8px 14px' }}><FxCatChip label={it.cat} /></td>
      <td style={{ padding: '8px 14px' }}><span style={{ fontSize: 12, ...FX_NUM, color: 'var(--text-muted)' }}>{fxDate(it.venc)}</span></td>
      <td style={{ padding: '8px 14px' }}>{it.pago ? <span style={{ fontSize: 12, ...FX_NUM, color: 'var(--text-subtle)' }}>{fxDate(it.pagoData)}</span> : <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>—</span>}</td>
      <td style={{ padding: '8px 14px', textAlign: 'right' }}><FxMoney value={it.valor} dir={it.dir} size={12.5} weight={600} /></td>
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
        <div style={{ fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color, ...FX_NUM, letterSpacing: '-0.02em' }}>{fxMoney(value)}</div>
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 36, padding: '12px 40px', borderTop: '1px solid var(--border-strong)', background: 'var(--bg-soft)', flexShrink: 0 }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>{rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'}</span>
      {cell('Entradas', ent, 'var(--fin-pos,#2E9E5B)', 'arrowDownRight')}
      {cell('Saídas', sai, 'var(--fin-neg,#C0492F)', 'arrowUpRight')}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: saldo >= 0 ? 'rgba(46,158,91,0.12)' : 'rgba(192,73,47,0.12)', color: saldo >= 0 ? 'var(--fin-pos,#2E9E5B)' : 'var(--fin-neg,#C0492F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="sigma" size={15} /></div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Saldo do período</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: saldo >= 0 ? 'var(--fin-pos,#2E9E5B)' : 'var(--fin-neg,#C0492F)', ...FX_NUM, letterSpacing: '-0.02em' }}>{fxMoney(saldo)}</div>
        </div>
      </div>
    </div>
  );
};

const FxTh = ({ children, align = 'left', w, sticky = false }) => (
  <th style={{
    textAlign: align, padding: '9px 14px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-subtle)',
    letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap', width: w,
    ...(sticky ? { position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-soft)' } : {}),
  }}>{children}</th>
);

// ---------- Lançamentos screen ----------
const FxLancamentos = ({ items, injectFilter, onMarkPaid, onUnpay, onEdit, onDelete, onOpenSerie, onBulkPaid, onBulkUnpay, onBulkDelete }) => {
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

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* filter bar (no Novo button here — it lives in the top bar) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 40px 14px', flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: '0 1 260px', minWidth: 170 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}><Icon name="search" size={14} /></div>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." style={{ paddingLeft: 36, height: 34, fontSize: 13 }} />
        </div>
        <FxSegmented size="sm" value={dir} onChange={setDir} options={[{ value: 'todos', label: 'Todos' }, { value: 'in', label: 'A receber' }, { value: 'out', label: 'A pagar' }]} />
        <FxSegmented size="sm" value={stat} onChange={setStat} options={[{ value: 'todos', label: 'Todos' }, { value: 'avencer', label: 'A vencer' }, { value: 'vencido', label: 'Vencido' }, { value: 'pago', label: 'Pago' }]} />
        <div style={{ width: 162 }}><FxSelect options={allCats} value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Categorias" /></div>
        {aging && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '0 6px 0 11px', height: 34, borderRadius: 999 }}>Atraso: {aging}<button onClick={() => setAging('')} className="btn btn-ghost" style={{ width: 22, height: 22, padding: 0, borderRadius: 999 }}><Icon name="plus" size={13} style={{ transform: 'rotate(45deg)' }} /></button></span>}
        {hasFilter && <button className="btn btn-ghost" onClick={() => { setDir('todos'); setStat('todos'); setCat(''); setQ(''); setAging(''); }} style={{ height: 34, fontSize: 12.5 }}>Limpar</button>}
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-secondary" onClick={() => fxExportCSV(rows)} style={{ height: 34, fontSize: 12.5 }}><Icon name="download" size={13} />Exportar</button>
        </div>
      </div>

      {/* bulk action bar */}
      {sel.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 40px', margin: '0 40px 6px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--r-sm)', flexShrink: 0 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>{sel.size} selecionado{sel.size > 1 ? 's' : ''}</span>
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
