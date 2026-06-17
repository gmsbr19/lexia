// LexIA · Contencioso — Andamentos / publicações. Stream cronológico capturado dos tribunais,
// triagem visual relevante × cartorário e geração de prazo a partir da intimação.

const ProcAndamentosPage = ({ procStore, role, nav, procMut }) => {
  const [seg, setSeg] = crmUseState('pendente');
  const [fonte, setFonte] = crmUseState('todas');
  const [q, setQ] = crmUseState('');
  const [modal, setModal] = crmUseState(null);
  const { toast } = useCrmToast();
  const procDe = (id) => id ? procById(procStore, id) : null;
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q.trim());

  const list = procStore.andamentos
    .filter((a) => seg === 'todos' ? true : seg === 'pendente' ? a.triagem === 'pendente' : seg === 'relevante' ? (a.triagem === 'relevante' || (a.triagem === 'pendente' && a.prazoSugerido)) : a.triagem === 'cartorario')
    .filter((a) => fonte === 'todas' || a.fonte === fonte)
    .filter((a) => { if (!nq) return true; const proc = procDe(a.processoId); return norm(a.titulo).includes(nq) || norm(a.descricao).includes(nq) || norm(a.orgao).includes(nq) || (proc && (norm(proc.numero).includes(nq) || norm(proc.clienteNome).includes(nq))); })
    .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));

  const kPend = procStore.andamentos.filter((a) => a.triagem === 'pendente').length;
  const kRel = procStore.andamentos.filter((a) => a.triagem === 'relevante' || (a.triagem === 'pendente' && a.prazoSugerido)).length;
  const kHoje = procStore.andamentos.filter((a) => a.data === PROC_TODAY).length;

  const onGerar = (a) => {
    if (!a.processoId) { setModal({ type: 'triagem', andamento: a }); return; }
    const proc = procDe(a.processoId);
    setModal({ type: 'prazo', preset: {
      processoId: a.processoId, peca: a.prazoSugerido ? a.prazoSugerido.peca : 'Manifestação',
      dias: a.prazoSugerido ? a.prazoSugerido.dias : 15, baseISO: a.data, responsavel: proc ? proc.responsavel : 'leonardo', movId: a.id,
    } });
  };

  // group by day
  const byDay = {}; list.forEach((a) => { (byDay[a.data] = byDay[a.data] || []).push(a); });
  const days = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  return (
    <FxFrame>
      <CrmPageHead title="Andamentos & publicações" sub="Movimentações capturadas automaticamente do PJe, e-SAJ, Projudi e diários oficiais (DJe)" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        <ProcStat label="A triar" value={kPend} icon="inbox" tone={kPend ? 'warn' : null} onClick={() => setSeg('pendente')} />
        <ProcStat label="Relevantes (geram prazo)" value={kRel} icon="flag" />
        <ProcStat label="Capturados hoje" value={kHoje} icon="refreshCw" sub="última sincronização há 12 min" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <ProcSeg options={[{ value: 'pendente', label: 'A triar' }, { value: 'relevante', label: 'Relevantes' }, { value: 'cartorario', label: 'Cartorários' }, { value: 'todos', label: 'Todos' }]} value={seg} onChange={setSeg} />
        <CrmSearch value={q} onChange={setQ} placeholder="Buscar publicação, órgão, processo…" />
        <FxSelect options={['todas', 'PJe', 'e-SAJ', 'Projudi', 'DJe']} value={fonte} onChange={(e) => setFonte(e.target.value)} />
      </div>

      {list.length === 0 ? <div className="card"><CrmEmpty icon="checkCircle" title="Nada por aqui" sub="Nenhuma publicação neste filtro." /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {days.map((iso) => {
            const d = procParse(iso); const isToday = iso === PROC_TODAY;
            return (
              <div key={iso}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{isToday ? 'Hoje' : `${d.getDate()} de ${PROC_MESES[d.getMonth()]}`}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{['domingo','segunda','terça','quarta','quinta','sexta','sábado'][d.getDay()]}-feira</span>
                </div>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {byDay[iso].map((a, i) => {
                    const proc = procDe(a.processoId); const m = PROC_MOV[a.tipo] || PROC_MOV.cartorario;
                    const isRel = a.triagem === 'relevante' || (a.triagem === 'pendente' && a.prazoSugerido);
                    const isPend = a.triagem === 'pendente';
                    return (
                      <div key={a.id} style={{ display: 'flex', gap: 13, padding: '14px 18px', borderTop: i ? '1px solid var(--border)' : 'none', background: isPend ? 'var(--bg-soft)' : 'transparent' }}>
                        <ProcMovIcon tipo={a.tipo} active={isRel} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{a.titulo}</span>
                            {isPend && <CrmBadge tone="warn" dot>a triar</CrmBadge>}
                            {a.triagem === 'relevante' && <CrmBadge tone="gold" dot>relevante</CrmBadge>}
                            {a.triagem === 'cartorario' && <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>cartorário</span>}
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{a.descricao}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8, flexWrap: 'wrap' }}>
                            <ProcFonte fonte={a.fonte} />
                            <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{m.label} · {a.hora}</span>
                            {proc
                              ? <CrmLink onClick={() => nav.openProcesso(a.processoId)} icon="scale">{proc.numero}</CrmLink>
                              : <span style={{ fontSize: 12, color: 'var(--warn)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="alertCircle" size={12} />a vincular</span>}
                          </div>
                          {a.prazoSugerido && isPend && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 9, padding: '5px 10px', borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12 }}>
                              <Icon name="sparkles" size={13} />LexIA sugere <strong>{a.prazoSugerido.peca}</strong> · {a.prazoSugerido.dias} dias úteis
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-end', flexShrink: 0 }}>
                          {(a.prazoSugerido || isRel)
                            ? <button className="btn btn-primary btn-sm" onClick={() => onGerar(a)} style={{ fontSize: 12 }}><Icon name="flag" size={13} />Gerar prazo</button>
                            : isPend ? <button className="btn btn-secondary btn-sm" onClick={() => setModal({ type: 'triagem', andamento: a })} style={{ fontSize: 12 }}>Triar</button> : null}
                          {isPend && <button className="btn btn-ghost btn-sm" onClick={() => { procMut.triar(a.id, 'cartorario'); toast('Marcado como cartorário'); }} style={{ fontSize: 12 }}><Icon name="circleDot" size={12} />Cartorário</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && modal.type === 'prazo' && <ProcPrazoModal procStore={procStore} preset={modal.preset} onClose={() => setModal(null)} onSave={(prazo, movId) => procMut.salvarPrazo(prazo, movId)} />}
      {modal && modal.type === 'triagem' && <ProcTriagemModal andamento={modal.andamento} procStore={procStore} onClose={() => setModal(null)} onTriar={procMut.triar} onGerar={onGerar} />}
    </FxFrame>
  );
};

window.ProcAndamentosPage = ProcAndamentosPage;
