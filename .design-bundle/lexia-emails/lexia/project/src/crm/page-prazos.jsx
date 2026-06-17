// LexIA · Contencioso — Painel de prazos & agenda. Lista (agrupada por urgência) + Calendário.
// Distinção clara fatal × interno, semáforo, filtros e ação de lançar prazo.

const PROC_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const PROC_WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const ProcPrazosPage = ({ procStore, role, nav, procMut }) => {
  const [view, setView] = crmUseState('lista');
  const [urg, setUrg] = crmUseState('todos');
  const [resp, setResp] = crmUseState('todos');
  const [cursor, setCursor] = crmUseState(procParse(PROC_TODAY));
  const [modal, setModal] = crmUseState(null);
  const { toast } = useCrmToast();
  const procDe = (id) => procById(procStore, id);

  const all = procStore.prazos.filter((p) => p.status === 'pendente' || p.status === 'em_andamento')
    .map((p) => ({ ...p, du: procDU(p.fatal), urg: procUrgency(procDU(p.fatal)).level }))
    .filter((p) => resp === 'todos' || p.responsavel === resp)
    .filter((p) => urg === 'todos' || (urg === 'critico' ? (p.du <= 2) : urg === 'semana' ? (p.du > 2 && p.du <= 6) : (p.du > 6)))
    .sort((a, b) => a.fatal.localeCompare(b.fatal));

  const buckets = [
    { id: 'crit', label: 'Vencendo · até 2 dias úteis', test: (p) => p.du <= 2, tone: 'neg' },
    { id: 'sem', label: 'Esta semana · 3 a 6 dias úteis', test: (p) => p.du > 2 && p.du <= 6, tone: 'warn' },
    { id: 'mes', label: 'Mais adiante', test: (p) => p.du > 6, tone: 'pos' },
  ];

  const kCrit = all.filter((p) => p.du <= 2).length;
  const kSem = all.filter((p) => p.du > 2 && p.du <= 6).length;

  const Row = ({ p, top }) => {
    const proc = procDe(p.processoId); const u = procUrgency(p.du);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 18px', borderTop: top ? '1px solid var(--border)' : 'none' }}>
        <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 3, background: u.color, margin: '2px 0', flexShrink: 0 }}></div>
        <div onClick={() => nav.openProcesso(p.processoId)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{p.peca}</span>
            {p.status === 'em_andamento' && <CrmBadge tone="gold" dot>em andamento</CrmBadge>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proc.numero} · {proc.clienteNome}</div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>interno</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fxDate(p.interno)}</div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--crit)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>fatal</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fxDate(p.fatal)}</div>
        </div>
        <ProcResp id={p.responsavel} showName={false} />
        <div style={{ width: 116, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}><ProcSemaforo du={p.du} /></div>
        <button className="btn btn-ghost btn-sm" onClick={() => { procMut.protocolar(p.id); toast('Prazo protocolado'); }} style={{ fontSize: 12, flexShrink: 0 }}><Icon name="check" size={13} />Protocolar</button>
      </div>
    );
  };

  // ---- calendário ----
  const renderCal = () => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
    const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    const prazosByDay = (iso) => all.filter((p) => p.fatal === iso);
    const audByDay = (iso) => procStore.audiencias.filter((a) => a.dia === iso);
    return (
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="btn btn-ghost" onClick={() => setCursor(new Date(y, m - 1, 1))} style={{ width: 30, height: 30, padding: 0 }}><Icon name="chevronLeft" size={16} /></button>
            <div style={{ minWidth: 150, textAlign: 'center', fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{PROC_MESES[m]} {y}</div>
            <button className="btn btn-ghost" onClick={() => setCursor(new Date(y, m + 1, 1))} style={{ width: 30, height: 30, padding: 0 }}><Icon name="chevronRight" size={16} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--text-subtle)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ProcDot tone="neg" />vencendo</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ProcDot tone="warn" />esta semana</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ProcDot tone="pos" />adiante</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }}></span>audiência</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {PROC_WD.map((w) => <div key={w} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{w}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridAutoRows: '104px' }}>
          {cells.map((d, i) => {
            const iso = procISO(d); const inMonth = d.getMonth() === m; const isToday = iso === PROC_TODAY;
            const pzs = prazosByDay(iso); const aud = audByDay(iso);
            return (
              <div key={i} style={{ borderTop: '1px solid var(--border)', borderRight: (i % 7 !== 6) ? '1px solid var(--border)' : 'none', padding: 6, background: inMonth ? 'transparent' : 'var(--bg-soft)', display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: isToday ? 700 : 500, fontVariantNumeric: 'tabular-nums', background: isToday ? 'var(--accent)' : 'transparent', color: isToday ? '#020D25' : inMonth ? 'var(--text)' : 'var(--text-subtle)' }}>{d.getDate()}</span>
                </div>
                {pzs.slice(0, 2).map((p) => { const u = procUrgency(p.du); return (
                  <button key={p.id} onClick={() => nav.openProcesso(p.processoId)} style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: u.soft || (PROC_TONE[u.tone] || PROC_TONE.neutral).soft, color: u.color, borderRadius: 5, padding: '2px 6px', fontSize: 11, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    <ProcDot tone={u.tone} size={6} />{p.peca}
                  </button>
                ); })}
                {aud.slice(0, 1).map((a) => (
                  <button key={a.id} onClick={() => nav.openProcesso(a.processoId)} style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 5, padding: '2px 6px', fontSize: 11, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    <Icon name="users" size={10} />{a.hora}
                  </button>
                ))}
                {(pzs.length + aud.length > 3) && <div style={{ fontSize: 10, color: 'var(--text-subtle)', paddingLeft: 4 }}>+{pzs.length + aud.length - 3}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <FxFrame>
      <CrmPageHead title="Prazos & agenda" sub="Todos os prazos processuais em dias úteis · fatal (limite legal) × interno (margem da equipe)"
        right={<button className="btn btn-primary" onClick={() => setModal({ type: 'prazo', preset: {} })}><Icon name="flag" size={15} />Lançar prazo</button>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <ProcStat label="Prazos em aberto" value={all.length} icon="flag" />
        <ProcStat label="Vencendo (≤2 du)" value={kCrit} icon="alertTriangle" tone={kCrit ? 'neg' : null} />
        <ProcStat label="Esta semana" value={kSem} icon="clock" tone={kSem ? 'warn' : null} />
        <ProcStat label="Audiências futuras" value={procStore.audiencias.filter((a) => a.dia >= PROC_TODAY).length} icon="users" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <ProcSeg options={[{ value: 'lista', label: 'Lista', icon: 'list' }, { value: 'calendario', label: 'Calendário', icon: 'calendar' }]} value={view} onChange={setView} />
        {view === 'lista' && <ProcSeg size="sm" options={[{ value: 'todos', label: 'Todas' }, { value: 'critico', label: 'Vencendo' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Adiante' }]} value={urg} onChange={setUrg} />}
        <div style={{ marginLeft: 'auto' }}>
          <FxSelect options={['Todos', ...CRM_USERS.filter((u) => u.ativo).map((u) => u.nome)]} value={resp === 'todos' ? 'Todos' : crmUser(resp).nome} onChange={(e) => setResp(e.target.value === 'Todos' ? 'todos' : (CRM_USERS.find((u) => u.nome === e.target.value) || {}).id)} />
        </div>
      </div>

      {view === 'lista' ? (
        all.length === 0 ? <div className="card"><CrmEmpty icon="checkCircle" title="Nenhum prazo nesse filtro" sub="Ajuste a urgência ou o responsável." /></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {buckets.map((b) => {
              const items = all.filter(b.test);
              if (items.length === 0) return null;
              return (
                <div key={b.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                    <ProcDot tone={b.tone} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{b.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>· {items.length}</span>
                  </div>
                  <div className="card" style={{ overflow: 'hidden' }}>
                    {items.map((p, i) => <Row key={p.id} p={p} top={i > 0} />)}
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', borderRadius: 10, background: 'var(--bg-sunken)', fontSize: 12.5, color: 'var(--text-muted)' }}>
              <Icon name="inbox" size={15} style={{ color: 'var(--text-subtle)' }} />
              Para lançar um prazo direto de uma intimação capturada, use a <CrmLink onClick={() => nav.navPage('andamentos')}>caixa de Andamentos</CrmLink>.
            </div>
          </div>
        )
      ) : renderCal()}

      {modal && modal.type === 'prazo' && <ProcPrazoModal procStore={procStore} preset={modal.preset} onClose={() => setModal(null)} onSave={(prazo, movId) => procMut.salvarPrazo(prazo, movId)} />}
    </FxFrame>
  );
};

window.ProcPrazosPage = ProcPrazosPage;
