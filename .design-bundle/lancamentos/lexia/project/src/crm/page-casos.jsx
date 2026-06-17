// LexIA · CRM — Casos list + Caso modal (rateio slider with snap 0/50/100).

// ---------- rateio slider ----------
const CrmRateioSlider = ({ value, onChange, total }) => {
  // value = leandro %. snap toward 0/50/100 within window.
  const trackRef = crmUseRef(null);
  const [drag, setDrag] = crmUseState(false);
  const snap = (v) => {
    for (const s of [0, 50, 100]) if (Math.abs(v - s) <= 6) return s;
    return v;
  };
  const setFromClientX = (clientX) => {
    const el = trackRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    let pct = Math.round(((clientX - r.left) / r.width) * 100);
    pct = Math.max(0, Math.min(100, pct));
    onChange(snap(pct));
  };
  crmUseEffect(() => {
    if (!drag) return;
    const mv = (e) => setFromClientX(e.clientX);
    const up = () => setDrag(false);
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
  }, [drag]);
  const leandro = value, leonardo = 100 - value;
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') onChange(Math.max(0, value - 5));
    if (e.key === 'ArrowRight') onChange(Math.min(100, value + 5));
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', fontWeight: 500 }}>Leandro</div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{leandro}<span style={{ fontSize: 16, color: 'var(--text-subtle)' }}>%</span></div>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fxMoney(Math.round(total * leandro / 100))}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', fontWeight: 500 }}>Leonardo</div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{leonardo}<span style={{ fontSize: 16, color: 'var(--text-subtle)' }}>%</span></div>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fxMoney(Math.round(total * leonardo / 100))}</div>
        </div>
      </div>
      <div ref={trackRef} onMouseDown={(e) => { setDrag(true); setFromClientX(e.clientX); }} style={{ position: 'relative', height: 38, cursor: 'pointer', userSelect: 'none', padding: '14px 0' }}>
        <div style={{ position: 'relative', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--bg-sunken)' }}>
          <div style={{ position: 'absolute', inset: 0, width: `${leandro}%`, background: 'linear-gradient(90deg,#d8be7a,#9a7f2e)' }}></div>
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${leonardo}%`, background: 'var(--brand-navy)', opacity: 0.85 }}></div>
        </div>
        {/* snap ticks */}
        {[0, 50, 100].map((s) => (
          <div key={s} style={{ position: 'absolute', top: 9, left: `calc(${s}% )`, transform: 'translateX(-50%)', width: 2, height: 20, background: 'var(--border-strong)', borderRadius: 2, pointerEvents: 'none' }}></div>
        ))}
        <div role="slider" aria-valuenow={leandro} tabIndex={0} onKeyDown={onKey} style={{
          position: 'absolute', top: '50%', left: `${leandro}%`, transform: 'translate(-50%,-50%)',
          width: 24, height: 24, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--accent)',
          boxShadow: '0 2px 8px rgba(2,13,37,0.2)', cursor: 'grab', outline: 'none',
        }}></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        {[{ l: '100% Leandro', v: 100 }, { l: '50 / 50', v: 50 }, { l: '100% Leonardo', v: 0 }].map((p) => (
          <button key={p.v} onClick={() => onChange(p.v)} style={{
            flex: 1, height: 30, borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600,
            border: `1px solid ${value === p.v ? 'var(--accent)' : 'var(--border-strong)'}`,
            background: value === p.v ? 'var(--accent-soft)' : 'var(--surface)', color: value === p.v ? 'var(--accent)' : 'var(--text-muted)',
          }}>{p.l}</button>
        ))}
      </div>
    </div>
  );
};

// ---------- caso modal ----------
const CrmCasoModal = ({ store, casoId, role, onClose, mut, nav }) => {
  const { toast } = useCrmToast();
  const k = store.casos.find((x) => x.id === casoId);
  const cli = store.clientes.find((c) => c.id === (k && k.clienteId));
  const [rateio, setRateio] = crmUseState(k ? k.rateio.leandro : 50);
  crmUseEffect(() => { const h = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  if (!k) return null;
  const fin = crmCasoFin(store, k.id);
  const contratos = store.contratos.filter((h) => h.casoId === k.id);
  const tarefas = store.tarefas.filter((t) => t.casoId === k.id);
  const eventos = store.eventos.filter((e) => e.casoId === k.id);
  const dirty = rateio !== k.rateio.leandro;
  const p = k.processo;
  const Field = ({ label, value }) => (
    <div><div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 500, marginBottom: 3 }}>{label}</div><div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{value}</div></div>
  );

  return (
    <div onMouseDown={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,13,37,0.42)', backdropFilter: 'blur(4px)', padding: 24 }}>
      <div onMouseDown={(e) => e.stopPropagation()} className="crm-pop-in card" style={{ width: 720, maxWidth: '100%', maxHeight: '92%', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <CrmCasoTipoPill tipo={k.tipo} />
              <CrmBadge tone={k.status === 'ativo' ? 'pos' : 'neutral'} dot>{k.status === 'ativo' ? 'Ativo' : 'Arquivado'}</CrmBadge>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)' }}>{k.titulo}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
              {cli && <CrmLink onClick={() => nav.openCliente(cli.id)} icon="user">{cli.nome}</CrmLink>}
              <span style={{ margin: '0 8px', color: 'var(--text-subtle)' }}>·</span>resp. {crmFirst(k.responsavel)}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0, borderRadius: 9 }}><Icon name="x" size={17} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* processo */}
          {p && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Dados do processo</div>
                <button className="btn btn-ghost" onClick={() => toast('Modo de edição')} style={{ height: 28, fontSize: 12 }}><Icon name="edit" size={13} />Editar</button>
              </div>
              <div className="card" style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 18px', background: 'var(--bg-soft)' }}>
                <Field label="Nº do processo" value={p.numero} />
                <Field label="Tribunal" value={p.tribunal} />
                <Field label="Vara" value={p.vara} />
                <Field label="Instância" value={p.instancia} />
                <Field label="Tipo de ação" value={p.acao} />
                <Field label="Valor da causa" value={fxMoney(p.valorCausa)} />
                <Field label="Distribuição" value={fxDate(p.distribuicao)} />
                <Field label="Última movimentação" value={fxDate(p.ultimaMov)} />
                <Field label="Status" value={k.status === 'ativo' ? 'Em andamento' : 'Arquivado'} />
              </div>
            </div>
          )}

          {/* financeiro */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Financeiro do caso</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <FxKpi label="Total honorários" value={fxMoney(fin.total)} icon="receipt" accent="gold" />
              <FxKpi label="Recebido" value={fxMoney(fin.recebido)} icon="checkCircle" tone="pos" />
              <FxKpi label="Em aberto" value={fxMoney(fin.aberto)} icon="clock" />
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {fin.lancamentos.length === 0 ? <CrmEmpty icon="wallet" title="Sem lançamentos" /> : fin.lancamentos.map((l, i) => (
                <div key={l.id} className="crm-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <FxDirChip dir={l.dir} compact />
                  <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text)', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.descricao}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{fxDate(l.venc)}</span>
                  <CrmContratoStatus status={l.status} venc={l.venc} />
                  <span style={{ width: 96, textAlign: 'right' }}><FxMoney value={l.valor} dir="in" /></span>
                </div>
              ))}
            </div>
          </div>

          {/* rateio — hidden for staff */}
          {role !== 'staff' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Rateio entre sócios</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 14 }}>Divisão dos honorários deste caso. Pontos de atração em 0, 50 e 100%.</div>
              <div className="card" style={{ padding: '18px 18px 16px' }}>
                <CrmRateioSlider value={rateio} onChange={setRateio} total={fin.total} />
              </div>
            </div>
          )}

          {/* tarefas + eventos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>Tarefas</div>
                <button className="btn btn-ghost" onClick={() => mut.openTarefa(k.clienteId)} style={{ height: 26, fontSize: 11.5, padding: '0 8px' }}><Icon name="plus" size={12} />Nova</button>
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {tarefas.length === 0 ? <div style={{ padding: 14, fontSize: 12, color: 'var(--text-subtle)', textAlign: 'center' }}>Sem tarefas</div> : tarefas.map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    <CrmPrioTag p={t.prioridade} />
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</span>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.status === 'done' ? 'var(--fin-pos,#2E9E5B)' : 'var(--accent)' }}></span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>Eventos</div>
                <button className="btn btn-ghost" onClick={() => mut.action('novo-evento')} style={{ height: 26, fontSize: 11.5, padding: '0 8px' }}><Icon name="plus" size={12} />Novo</button>
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {eventos.length === 0 ? <div style={{ padding: 14, fontSize: 12, color: 'var(--text-subtle)', textAlign: 'center' }}>Sem eventos</div> : eventos.map((e, i) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: CRM_EVT[e.tipo].color, flexShrink: 0 }}></span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.titulo}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{fxDate(e.dia)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {role !== 'staff' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
            <span style={{ fontSize: 12, color: dirty ? 'var(--accent)' : 'var(--text-subtle)' }}>{dirty ? 'Alteração de rateio não salva' : 'Rateio atualizado'}</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setRateio(k.rateio.leandro)} disabled={!dirty}>Descartar</button>
              <button className="btn btn-primary" disabled={!dirty} onClick={() => { mut.updateRateio(k.id, { leandro: rateio, leonardo: 100 - rateio }); toast('Rateio salvo: ' + rateio + '/' + (100 - rateio)); }}>Salvar rateio</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- casos list ----------
const CRM_CASO_COLS = '1fr 120px 140px 150px';
const CrmCasosPage = ({ store, role, onOpenCaso }) => {
  const [q, setQ] = crmUseState('');
  const [seg, setSeg] = crmUseState('todos');
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q.trim());
  const withFin = (k) => crmCasoFin(store, k.id).total > 0;

  const counts = crmUseMemo(() => ({
    total: store.casos.length,
    comHon: store.casos.filter(withFin).length,
    semRateio: 0,
  }), [store]);

  const rows = crmUseMemo(() => store.casos.filter((k) => {
    if (seg === 'com' && !withFin(k)) return false;
    if (seg === 'sem' && withFin(k)) return false;
    const cli = store.clientes.find((c) => c.id === k.clienteId);
    if (nq && !(norm(k.titulo).includes(nq) || (cli && norm(cli.nome).includes(nq)) || norm(crmFirst(k.responsavel)).includes(nq))) return false;
    return true;
  }), [store, seg, nq]);

  return (
    <FxFrame>
      <CrmPageHead title="Casos" sub="Defina os responsáveis sócios e o rateio dos honorários de cada caso" />
      <CrmKpiRow kpis={[
        { label: 'Total de casos', value: counts.total, icon: 'briefcase' },
        { label: 'Com honorário', value: counts.comHon, icon: 'receipt', accent: 'gold' },
        { label: 'Sem rateio', value: counts.semRateio, icon: 'percent' },
      ]} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <CrmSearch value={q} onChange={setQ} placeholder="Buscar por caso, cliente, responsável…" />
        <FxSegmented options={[{ value: 'todos', label: 'Todos' }, { value: 'com', label: 'Com honorário' }, { value: 'sem', label: 'Sem rateio' }]} value={seg} onChange={setSeg} />
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: CRM_CASO_COLS, gap: 14, padding: '11px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
          {['Caso', 'Tipo', 'Honorários', 'Rateio (sócios)'].map((h, i) => (
            <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {rows.length === 0 ? <CrmEmpty icon="briefcase" title="Nenhum caso encontrado" sub="Ajuste a busca ou os filtros." /> : rows.map((k, i) => {
          const f = crmCasoFin(store, k.id);
          const cli = store.clientes.find((c) => c.id === k.clienteId);
          return (
            <CrmRow key={k.id} onClick={() => onOpenCaso(k.id)} style={{ display: 'grid', gridTemplateColumns: CRM_CASO_COLS, gap: 14, padding: '13px 18px', alignItems: 'center', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.titulo}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginTop: 2 }}>{cli ? (cli.apelido || cli.nome) : ''} · resp. {crmFirst(k.responsavel)}</div>
              </div>
              <div><CrmCasoTipoPill tipo={k.tipo} /></div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: f.total ? 'var(--text)' : 'var(--text-subtle)' }}>{f.total ? fxMoney(f.total) : '—'}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                {role === 'staff' ? <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>—</span> : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 54, height: 7, borderRadius: 999, overflow: 'hidden', background: 'var(--brand-navy)', display: 'flex' }}>
                      <div style={{ width: `${k.rateio.leandro}%`, background: 'linear-gradient(90deg,#d8be7a,#9a7f2e)' }}></div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{k.rateio.leandro}/{k.rateio.leonardo}</span>
                  </div>
                )}
              </div>
            </CrmRow>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', textAlign: 'center', marginTop: 14 }}>{rows.length} de {store.casos.length} casos</div>
    </FxFrame>
  );
};

Object.assign(window, { CrmCasosPage, CrmCasoModal });
