// LexIA · CRM — Clientes list page.

const CRM_CLI_COLS = '1fr 76px 168px 150px 130px 64px';

const CrmClientesPage = ({ store, role, onOpenCliente, onNovo }) => {
  const [q, setQ] = crmUseState('');
  const [seg, setSeg] = crmUseState('todos');
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q.trim());

  const counts = crmUseMemo(() => ({
    total: store.clientes.length,
    pf: store.clientes.filter((c) => c.tipo === 'PF').length,
    pj: store.clientes.filter((c) => c.tipo === 'PJ').length,
    leads: store.clientes.filter((c) => c.classe === 'lead').length,
  }), [store]);

  const rows = crmUseMemo(() => store.clientes.filter((c) => {
    if (seg === 'pf' && c.tipo !== 'PF') return false;
    if (seg === 'pj' && c.tipo !== 'PJ') return false;
    if (seg === 'leads' && c.classe !== 'lead') return false;
    if (nq && !(norm(c.nome).includes(nq) || norm(c.doc).includes(nq) || norm(c.cidade).includes(nq))) return false;
    return true;
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [store, seg, nq]);

  return (
    <FxFrame>
      <CrmPageHead title="Clientes" sub={`${store.clientes.length} contatos importados do Astrea`}
        right={<button className="btn btn-primary" onClick={onNovo}><Icon name="userPlus" size={15} />Novo cliente</button>} />

      <CrmKpiRow kpis={[
        { label: 'Total', value: counts.total, icon: 'users' },
        { label: 'Pessoa física', value: counts.pf, icon: 'user' },
        { label: 'Pessoa jurídica', value: counts.pj, icon: 'building' },
        { label: 'Leads', value: counts.leads, icon: 'flame', accent: 'gold' },
      ]} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <CrmSearch value={q} onChange={setQ} placeholder="Buscar por nome, CPF/CNPJ, cidade…" />
        <FxSegmented options={[{ value: 'todos', label: 'Todos' }, { value: 'pf', label: 'PF' }, { value: 'pj', label: 'PJ' }, { value: 'leads', label: 'Leads' }]} value={seg} onChange={setSeg} />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: CRM_CLI_COLS, gap: 14, padding: '11px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
          {['Cliente', 'Tipo', 'CPF/CNPJ', 'Cidade/UF', 'Classificação', 'Casos'].map((h, i) => (
            <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i >= 5 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {rows.length === 0 ? (
          <CrmEmpty icon="users" title="Nenhum cliente encontrado" sub="Ajuste a busca ou cadastre um novo cliente." cta={<button className="btn btn-secondary" onClick={onNovo}><Icon name="userPlus" size={14} />Novo cliente</button>} />
        ) : rows.map((c, i) => {
          const casos = crmCasosCount(store, c.id);
          return (
            <CrmRow key={c.id} onClick={() => onOpenCliente(c.id)} style={{ display: 'grid', gridTemplateColumns: CRM_CLI_COLS, gap: 14, padding: '12px 18px', alignItems: 'center', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <CrmAvatar name={c.nome} iniciais={c.iniciais} tipo={c.tipo} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</div>
                  {c.apelido && <div style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>{c.apelido}</div>}
                </div>
              </div>
              <div><CrmTipoBadge tipo={c.tipo} /></div>
              <div style={{ fontSize: 12.5, color: c.doc ? 'var(--text-muted)' : 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{c.doc || '—'}</div>
              <div style={{ fontSize: 12.5, color: c.cidade ? 'var(--text-muted)' : 'var(--text-subtle)' }}>{c.cidade ? `${c.cidade}/${c.uf}` : '—'}</div>
              <div><CrmClasseBadge classe={c.classe} /></div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: casos ? 'var(--text)' : 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{casos}</div>
            </CrmRow>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', textAlign: 'center', marginTop: 14 }}>{rows.length} de {store.clientes.length} clientes</div>
    </FxFrame>
  );
};

window.CrmClientesPage = CrmClientesPage;
