// LexIA · Contencioso — lista de processos (judiciais). Clique abre a Ficha.

const PROC_COLS = '1.7fr 1.3fr 150px 150px';
const ProcProcessosPage = ({ procStore, role, nav }) => {
  const [q, setQ] = crmUseState('');
  const [seg, setSeg] = crmUseState('todos');
  const [resp, setResp] = crmUseState('todos');
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q.trim());

  const proxPrazo = (pid) => procStore.prazos.filter((p) => p.processoId === pid && (p.status === 'pendente' || p.status === 'em_andamento'))
    .map((p) => ({ ...p, du: procDU(p.fatal) })).sort((a, b) => a.fatal.localeCompare(b.fatal))[0] || null;

  const rows = crmUseMemo(() => procStore.processos.filter((p) => {
    if (seg === 'civel' && !(p.tribunal.startsWith('TJ'))) return false;
    if (seg === 'federal' && !(p.tribunal.startsWith('TRF'))) return false;
    if (seg === 'trabalho' && !(p.tribunal.startsWith('TRT'))) return false;
    if (resp !== 'todos' && p.responsavel !== resp) return false;
    if (nq && !(norm(p.numero).includes(nq) || norm(p.clienteNome).includes(nq) || norm(p.classe).includes(nq) || norm(p.assunto).includes(nq) || (p.partes || []).some((x) => norm(x.nome).includes(nq)))) return false;
    return true;
  }), [procStore, seg, resp, nq]);

  const ativos = procStore.processos.filter((p) => p.status !== 'arquivado').length;
  const comPrazo = procStore.processos.filter((p) => proxPrazo(p.id)).length;
  const criticos = procStore.processos.filter((p) => { const pz = proxPrazo(p.id); return pz && pz.du <= 2; }).length;

  return (
    <FxFrame>
      <CrmPageHead title="Processos" sub="Acervo judicial do escritório · clique para abrir a ficha consolidada"
        right={<button className="btn btn-primary" onClick={() => nav.navPage('andamentos')}><Icon name="plus" size={15} />Novo processo</button>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        <ProcStat label="Processos ativos" value={ativos} icon="scale" />
        <ProcStat label="Com prazo aberto" value={comPrazo} icon="flag" />
        <ProcStat label="Prazos críticos" value={criticos} icon="alertTriangle" tone={criticos ? 'neg' : null} />
        <ProcStat label="Valor em discussão" value={fxCompact(procStore.processos.reduce((s, p) => s + p.valorCausa, 0))} icon="scale" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <CrmSearch value={q} onChange={setQ} placeholder="Buscar por nº CNJ, cliente, parte, classe…" />
        <ProcSeg options={[{ value: 'todos', label: 'Todos' }, { value: 'civel', label: 'Estadual' }, { value: 'federal', label: 'Federal' }, { value: 'trabalho', label: 'Trabalho' }]} value={seg} onChange={setSeg} />
        <FxSelect options={['Todos', ...CRM_USERS.filter((u) => u.ativo).map((u) => u.nome)]} value={resp === 'todos' ? 'Todos' : crmUser(resp).nome} onChange={(e) => setResp(e.target.value === 'Todos' ? 'todos' : (CRM_USERS.find((u) => u.nome === e.target.value) || {}).id)} />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: PROC_COLS, gap: 14, padding: '11px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
          {['Processo', 'Partes', 'Foro / fase', 'Próximo prazo'].map((h, i) => (
            <div key={h} style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i === 3 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {rows.length === 0 ? <CrmEmpty icon="scale" title="Nenhum processo encontrado" sub="Ajuste a busca ou os filtros." /> : rows.map((p, i) => {
          const pz = proxPrazo(p.id); const contraria = procContraria(p);
          return (
            <CrmRow key={p.id} onClick={() => nav.openProcesso(p.id)} style={{ display: 'grid', gridTemplateColumns: PROC_COLS, gap: 14, padding: '14px 18px', alignItems: 'center', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{p.numero}</span>
                  {p.segredo && <span title="Segredo de justiça" style={{ color: 'var(--text-subtle)', display: 'inline-flex' }}><Icon name="eye" size={13} /></span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.classe} · {p.assunto}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.clienteNome}</div>
                <div style={{ fontSize: 12, color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ textTransform: 'capitalize' }}>{p.nossoPolo}</span> × {contraria ? contraria.nome : '—'}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.tribunal} · {p.comarca}</div>
                <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>{(PROC_FASE[p.fase] || {}).label}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                <ProcResp id={p.responsavel} showName={false} size={22} />
                {pz ? <ProcSemaforo du={pz.du} /> : <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>sem prazo</span>}
              </div>
            </CrmRow>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-subtle)', textAlign: 'center', marginTop: 14 }}>{rows.length} de {procStore.processos.length} processos</div>
    </FxFrame>
  );
};

window.ProcProcessosPage = ProcProcessosPage;
