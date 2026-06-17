// LexIA · CRM — Spotlight search (⌘K). Live grouped results, full keyboard nav.

const CrmSpotlight = ({ store, onClose, onOpenCliente, onOpenCaso, onOpenContrato, onNavPage, onAction }) => {
  const [q, setQ] = crmUseState('');
  const [sel, setSel] = crmUseState(0);
  const inputRef = crmUseRef(null);
  const listRef = crmUseRef(null);

  crmUseEffect(() => { inputRef.current && inputRef.current.focus(); }, []);

  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q.trim());

  // build grouped results
  const groups = crmUseMemo(() => {
    const g = [];
    const fmt = (n) => fxMoney(n);

    if (!nq) {
      g.push({ key: 'acoes', label: 'Ações rápidas', items: [
        { id: 'a1', icon: 'plus', title: 'Novo cliente', sub: 'Cadastrar PF ou PJ', run: () => onAction('novo-cliente') },
        { id: 'a2', icon: 'listChecks', title: 'Nova tarefa', sub: 'Criar tarefa', run: () => onAction('nova-tarefa') },
        { id: 'a3', icon: 'receipt', title: 'Novo lançamento', sub: 'Honorário ou despesa', run: () => onAction('novo-lancamento') },
        { id: 'a4', icon: 'calendar', title: 'Novo evento', sub: 'Audiência, prazo, reunião', run: () => onAction('novo-evento') },
      ]});
      g.push({ key: 'ir', label: 'Ir para', items: [
        { id: 'p1', icon: 'users', title: 'Clientes', sub: `${store.clientes.length} contatos`, run: () => onNavPage('clientes') },
        { id: 'p2', icon: 'briefcase', title: 'Casos', sub: `${store.casos.length} casos`, run: () => onNavPage('casos') },
        { id: 'p3', icon: 'receipt', title: 'Contratos', sub: 'Honorários', run: () => onNavPage('contratos') },
        { id: 'p4', icon: 'calendar', title: 'Agenda', sub: 'Compromissos e prazos', run: () => onNavPage('agenda') },
      ]});
      return g;
    }

    const cli = store.clientes.filter((c) => norm(c.nome).includes(nq) || norm(c.apelido).includes(nq) || norm(c.doc).includes(nq) || norm(c.cidade).includes(nq)).slice(0, 5);
    if (cli.length) g.push({ key: 'clientes', label: 'Clientes', items: cli.map((c) => ({
      id: c.id, icon: c.tipo === 'PJ' ? 'building' : 'user', title: c.nome,
      sub: `${c.tipo} · ${c.cidade ? c.cidade + '/' + c.uf : 'sem cidade'} · ${crmCasosCount(store, c.id)} casos`, run: () => onOpenCliente(c.id),
    }))});

    const cas = store.casos.filter((k) => norm(k.titulo).includes(nq)).slice(0, 5);
    if (cas.length) g.push({ key: 'casos', label: 'Casos', items: cas.map((k) => ({
      id: k.id, icon: 'briefcase', title: k.titulo, sub: `${k.tipo} · resp. ${crmFirst(k.responsavel)}`, run: () => onOpenCaso(k.id),
    }))});

    const con = store.contratos.filter((h) => norm(h.descricao).includes(nq)).slice(0, 5);
    if (con.length) g.push({ key: 'contratos', label: 'Contratos', items: con.map((h) => {
      const cli2 = store.clientes.find((c) => c.id === h.clienteId);
      return { id: h.id, icon: 'receipt', title: h.descricao, sub: `${cli2 ? cli2.apelido || cli2.nome : ''} · ${fmt(h.valor)} · ${h.tipo}`, run: () => onOpenContrato(h.id) };
    })});

    const tar = store.tarefas.filter((t) => norm(t.titulo).includes(nq)).slice(0, 4);
    if (tar.length) g.push({ key: 'tarefas', label: 'Tarefas', items: tar.map((t) => ({
      id: t.id, icon: 'listChecks', title: t.titulo, sub: `${CRM_TASK_STATUS[t.status].label} · ${t.prioridade}`, run: () => onNavPage('tarefas'),
    }))});

    const lan = store.lancamentos.filter((l) => norm(l.descricao).includes(nq)).slice(0, 4);
    if (lan.length) g.push({ key: 'lanc', label: 'Lançamentos', items: lan.map((l) => ({
      id: l.id, icon: 'banknote', title: l.descricao, sub: `${fmt(l.valor)} · venc. ${fxDate(l.venc)} · ${l.status}`, run: () => onOpenContrato(l.contratoId),
    }))});

    return g;
  }, [nq, store]);

  const flat = crmUseMemo(() => groups.flatMap((g) => g.items), [groups]);
  crmUseEffect(() => { setSel(0); }, [nq]);

  crmUseEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); const it = flat[sel]; if (it) { it.run(); onClose(); } }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [flat, sel, onClose]);

  crmUseEffect(() => {
    const el = listRef.current && listRef.current.querySelector(`[data-idx="${sel}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  let idx = -1;
  return (
    <div onMouseDown={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '12vh', background: 'rgba(2,13,37,0.40)', backdropFilter: 'blur(6px)',
    }}>
      <div onMouseDown={(e) => e.stopPropagation()} className="crm-pop-in" style={{
        width: 620, maxWidth: '92%', maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 16,
        boxShadow: '0 30px 80px rgba(2,13,37,0.35), 0 8px 24px rgba(2,13,37,0.20)', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          <Icon name="search" size={20} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar clientes, casos, contratos, ações…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 18, color: 'var(--text)', letterSpacing: '-0.01em' }} />
          <kbd style={{ fontSize: 10.5, color: 'var(--text-subtle)', background: 'var(--bg-sunken)', padding: '3px 7px', borderRadius: 5, fontFamily: 'var(--font-mono)' }}>esc</kbd>
        </div>

        <div ref={listRef} style={{ overflowY: 'auto', padding: '8px 8px 10px' }}>
          {flat.length === 0 && (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Nenhum resultado para “{q}”</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 5 }}>Tente outro termo ou crie algo novo.</div>
            </div>
          )}
          {groups.map((g) => (
            <div key={g.key} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px 4px' }}>{g.label}</div>
              {g.items.map((it) => {
                idx++;
                const active = idx === sel;
                const myIdx = idx;
                return (
                  <div key={it.id} data-idx={myIdx} onMouseEnter={() => setSel(myIdx)} onClick={() => { it.run(); onClose(); }} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                    background: active ? 'var(--accent-soft)' : 'transparent',
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: active ? 'var(--surface)' : 'var(--bg-sunken)', color: active ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={it.icon} size={16} strokeWidth={1.8} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.sub}</div>
                    </div>
                    {active && <Icon name="arrowRight" size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '9px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-soft)', fontSize: 11, color: 'var(--text-subtle)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><kbd className="crm-kbd">↑</kbd><kbd className="crm-kbd">↓</kbd> navegar</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><kbd className="crm-kbd">↵</kbd> abrir</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><kbd className="crm-kbd">esc</kbd> fechar</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, color: 'var(--accent)' }}>LexIA</span> Buscar
          </span>
        </div>
      </div>
    </div>
  );
};

window.CrmSpotlight = CrmSpotlight;
