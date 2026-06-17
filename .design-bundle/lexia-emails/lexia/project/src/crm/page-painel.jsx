// LexIA · Contencioso — Painel (cockpit do dia): KPIs, prazos próximos (semáforo),
// audiências, caixa de entrada de publicações a triar e tarefas pendentes.

const ProcPainelPage = ({ procStore, crmStore, role, nav, procMut }) => {
  const [modal, setModal] = crmUseState(null);   // {type:'prazo',preset} | {type:'triagem',andamento}

  // ---- derivações ----
  const pend = procStore.prazos.filter((p) => p.status === 'pendente' || p.status === 'em_andamento')
    .map((p) => ({ ...p, du: procDU(p.fatal) }))
    .sort((a, b) => a.fatal.localeCompare(b.fatal));
  const prazosSemana = pend.filter((p) => p.du >= 0 && p.du <= 6);
  const ativos = procStore.processos.filter((p) => p.status !== 'arquivado' && p.status !== 'baixado');
  const aud = procStore.audiencias.map((a) => ({ ...a, dd: procDU(a.dia) })).sort((a, b) => a.dia.localeCompare(b.dia));
  const audHoje = aud.filter((a) => a.dia === PROC_TODAY);
  const audSemana = aud.filter((a) => { const d = procDU(a.dia, PROC_TODAY); return a.dia >= PROC_TODAY && diasCorridos(a.dia) <= 7; });
  const inbox = procStore.andamentos.filter((a) => a.triagem === 'pendente').sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
  const tarefas = (crmStore.tarefas || []).filter((t) => t.status !== 'done').sort((a, b) => (a.prazo || '').localeCompare(b.prazo || ''));

  function diasCorridos(iso) { return Math.round((procParse(iso) - procParse(PROC_TODAY)) / 86400000); }
  const procDe = (id) => procById(procStore, id);

  const onGerar = (andamento) => {
    if (!andamento.processoId) { setModal({ type: 'triagem', andamento }); return; }
    const proc = procDe(andamento.processoId);
    setModal({ type: 'prazo', preset: {
      processoId: andamento.processoId, peca: andamento.prazoSugerido ? andamento.prazoSugerido.peca : 'Manifestação',
      dias: andamento.prazoSugerido ? andamento.prazoSugerido.dias : 15, baseISO: andamento.data,
      responsavel: proc ? proc.responsavel : 'leonardo', movId: andamento.id,
    } });
  };

  return (
    <FxFrame pad="24px 40px 56px">
      {/* cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contencioso</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-subtle)' }}></span>
            <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>NCM Advogados</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--text)' }}>Bom dia, Thiago</h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 5 }}>Quinta-feira, 11 de junho de 2026 · o que precisa da sua atenção hoje</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'prazo', preset: {} })}><Icon name="flag" size={15} />Lançar prazo</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <ProcStat label="Processos ativos" value={ativos.length} icon="scale" onClick={() => nav.navPage('processos')} />
        <ProcStat label="Prazos da semana" value={prazosSemana.length} icon="flag" tone={prazosSemana.some((p) => p.du <= 2) ? 'neg' : 'warn'} sub={prazosSemana.filter((p) => p.du <= 2).length ? `${prazosSemana.filter((p) => p.du <= 2).length} crítico(s)` : 'sob controle'} onClick={() => nav.navPage('prazos')} />
        <ProcStat label="Audiências da semana" value={audSemana.length} icon="users" sub={audHoje.length ? `${audHoje.length} hoje` : 'nenhuma hoje'} />
        <ProcStat label="Publicações a triar" value={inbox.length} icon="inbox" tone={inbox.length ? 'warn' : null} onClick={() => nav.navPage('andamentos')} />
      </div>

      {/* linha 1: prazos próximos (hero) + audiências */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
        {/* prazos próximos */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Icon name="flag" size={16} style={{ color: 'var(--text-subtle)' }} /><span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Prazos próximos</span></div>
            <button className="btn btn-ghost btn-sm" onClick={() => nav.navPage('prazos')} style={{ fontSize: 12 }}>Ver painel<Icon name="arrowRight" size={13} /></button>
          </div>
          <div>
            {pend.slice(0, 6).map((p, i) => {
              const proc = procDe(p.processoId); const u = procUrgency(p.du);
              return (
                <div key={p.id} onClick={() => nav.openProcesso(p.processoId)} className="crm-row" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 18px', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                  <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 3, background: u.color, flexShrink: 0, margin: '2px 0' }}></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.peca}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proc.numero} · {proc.clienteNome}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>fatal {fxDate(p.fatal)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>interno {fxDate(p.interno)}</div>
                  </div>
                  <ProcResp id={p.responsavel} showName={false} />
                  <div style={{ width: 116, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}><ProcSemaforo du={p.du} /></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* audiências */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <Icon name="calendar" size={16} style={{ color: 'var(--text-subtle)' }} /><span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Audiências</span>
          </div>
          {aud.filter((a) => a.dia >= PROC_TODAY).slice(0, 4).map((a, i) => {
            const proc = procDe(a.processoId); const isHoje = a.dia === PROC_TODAY;
            return (
              <div key={a.id} onClick={() => nav.openProcesso(a.processoId)} className="crm-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: isHoje ? 'var(--accent)' : 'var(--text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{procParse(a.dia).getDate()}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][procParse(a.dia).getMonth()]}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.hora} · {proc.clienteNome}</div>
                </div>
                {isHoje && <CrmBadge tone="gold" dot>hoje</CrmBadge>}
              </div>
            );
          })}
        </div>
      </div>

      {/* linha 2: caixa de entrada + tarefas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* caixa de entrada (publicações / intimações a triar) */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Icon name="inbox" size={16} style={{ color: 'var(--text-subtle)' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Caixa de entrada</span>
              {inbox.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--warn-soft)', color: 'var(--warn)', padding: '1px 8px', borderRadius: 999 }}>{inbox.length} a triar</span>}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => nav.navPage('andamentos')} style={{ fontSize: 12 }}>Ver tudo<Icon name="arrowRight" size={13} /></button>
          </div>
          {inbox.length === 0 ? <CrmEmpty icon="checkCircle" title="Tudo triado" sub="Nenhuma publicação aguardando análise." /> : inbox.slice(0, 4).map((a, i) => {
            const proc = a.processoId ? procDe(a.processoId) : null;
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <ProcMovIcon tipo={a.tipo} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.titulo}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3, minWidth: 0 }}>
                    <ProcFonte fonte={a.fonte} />
                    <span style={{ fontSize: 12, color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proc ? proc.clienteNome : 'a vincular'} · {fxDate(a.data)}</span>
                  </div>
                </div>
                {a.prazoSugerido
                  ? <button className="btn btn-secondary btn-sm" onClick={() => onGerar(a)} style={{ fontSize: 12, flexShrink: 0 }}><Icon name="flag" size={13} />Gerar prazo</button>
                  : <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'triagem', andamento: a })} style={{ fontSize: 12, flexShrink: 0 }}>Triar</button>}
              </div>
            );
          })}
        </div>

        {/* tarefas pendentes */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Icon name="listChecks" size={16} style={{ color: 'var(--text-subtle)' }} /><span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Tarefas pendentes</span></div>
            <button className="btn btn-ghost btn-sm" onClick={() => nav.navPage('tarefas')} style={{ fontSize: 12 }}>Ver<Icon name="arrowRight" size={13} /></button>
          </div>
          {tarefas.slice(0, 5).map((t, i) => (
            <div key={t.id} className="crm-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <CrmPrioTag p={t.prioridade} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</span>
              <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fxDate(t.prazo)}</span>
              <ProcResp id={t.responsavel} showName={false} size={20} />
            </div>
          ))}
        </div>
      </div>

      {modal && modal.type === 'prazo' && <ProcPrazoModal procStore={procStore} preset={modal.preset} onClose={() => setModal(null)} onSave={(prazo, movId) => procMut.salvarPrazo(prazo, movId)} />}
      {modal && modal.type === 'triagem' && <ProcTriagemModal andamento={modal.andamento} procStore={procStore} onClose={() => setModal(null)} onTriar={procMut.triar} onGerar={onGerar} />}
    </FxFrame>
  );
};

window.ProcPainelPage = ProcPainelPage;
