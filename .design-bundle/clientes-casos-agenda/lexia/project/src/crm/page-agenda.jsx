// LexIA · CRM — Agenda: Mês / Semana / Dia / Lista, filters, create/edit, drag-to-reschedule.

const CRM_WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const CRM_WD_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const crmISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const crmParse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const crmHourToMin = (h) => { if (!h) return 0; const [a, b] = h.split(':').map(Number); return a * 60 + (b || 0); };
const crmMinToHour = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// ---------- event chip ----------
const CrmEvtChip = ({ e, onClick, compact }) => {
  const m = CRM_EVT[e.tipo];
  return (
    <button onClick={(ev) => { ev.stopPropagation(); onClick(e); }} style={{
      display: 'flex', alignItems: 'center', gap: 5, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
      background: m.soft, color: m.color, borderRadius: 6, padding: compact ? '2px 6px' : '4px 7px', fontFamily: 'var(--font-sans)',
      fontSize: 11, fontWeight: 500, letterSpacing: '-0.01em', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      borderLeft: `2px solid ${m.color}`,
    }}>
      {e.hIni && !e.allDay && <span style={{ opacity: 0.85, fontVariantNumeric: 'tabular-nums' }}>{e.hIni}</span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.titulo}</span>
    </button>
  );
};

// ---------- event create/edit modal ----------
const CrmEventoModal = ({ store, evento, onClose, onSave }) => {
  const { toast } = useCrmToast();
  const [f, setF] = crmUseState(evento || { titulo: '', tipo: 'reunião', dia: CRM_TODAY, hIni: '09:00', hFim: '10:00', allDay: false, responsavel: 'thiago', local: '', clienteId: null, casoId: null });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  crmUseEffect(() => { const h = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <FxModal title={evento && evento.id ? 'Editar evento' : 'Novo evento'} sub="Audiência, prazo, reunião ou outro" onClose={onClose} width={520}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => { onSave(f); toast(evento && evento.id ? 'Evento atualizado' : 'Evento criado'); onClose(); }}>Salvar</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><FxLabel>Título</FxLabel><FxInput value={f.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex.: Audiência de instrução" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><FxLabel>Tipo</FxLabel><FxSelect options={['audiência', 'prazo', 'reunião', 'outro']} value={f.tipo} onChange={(e) => set('tipo', e.target.value)} /></div>
          <div><FxLabel>Responsável</FxLabel><FxSelect options={CRM_USERS.filter((u) => u.ativo).map((u) => u.nome)} value={crmUser(f.responsavel).nome} onChange={(e) => set('responsavel', CRM_USERS.find((u) => u.nome === e.target.value).id)} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12 }}>
          <div><FxLabel>Data</FxLabel><FxInput type="date" value={f.dia} onChange={(e) => set('dia', e.target.value)} /></div>
          <div><FxLabel>Início</FxLabel><FxInput type="time" value={f.hIni} disabled={f.allDay} onChange={(e) => set('hIni', e.target.value)} /></div>
          <div><FxLabel>Fim</FxLabel><FxInput type="time" value={f.hFim} disabled={f.allDay} onChange={(e) => set('hFim', e.target.value)} /></div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
          <FxCheck checked={f.allDay} onChange={() => set('allDay', !f.allDay)} /> Dia inteiro
        </label>
        <div><FxLabel>Local ou link</FxLabel><FxInput value={f.local} onChange={(e) => set('local', e.target.value)} placeholder="Fórum, sala ou link de vídeo" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><FxLabel>Cliente (opcional)</FxLabel><FxSelect options={['—', ...store.clientes.map((c) => c.apelido || c.nome)]} value={f.clienteId ? (store.clientes.find((c) => c.id === f.clienteId)?.apelido || '') : '—'} onChange={(e) => { const c = store.clientes.find((x) => (x.apelido || x.nome) === e.target.value); set('clienteId', c ? c.id : null); }} /></div>
          <div><FxLabel>Caso (opcional)</FxLabel><FxSelect options={['—', ...store.casos.map((k) => k.titulo.slice(0, 30))]} value={'—'} onChange={(e) => { const k = store.casos.find((x) => x.titulo.slice(0, 30) === e.target.value); set('casoId', k ? k.id : null); }} /></div>
        </div>
      </div>
    </FxModal>
  );
};

// ---------- main ----------
const CRM_HOURS = []; for (let h = 8; h <= 20; h++) CRM_HOURS.push(h);
const HOUR_PX = 52;

const CrmAgendaPage = ({ store, mut, nav }) => {
  const [view, setView] = crmUseState('mes');
  const [cursor, setCursor] = crmUseState(crmParse(CRM_TODAY));   // reference date
  const [fResp, setFResp] = crmUseState('todos');
  const [fTipo, setFTipo] = crmUseState('todos');
  const [modal, setModal] = crmUseState(null);   // evento or {dia,hIni} for new
  const [drag, setDrag] = crmUseState(null);

  const evFiltered = crmUseMemo(() => store.eventos.filter((e) => (fResp === 'todos' || e.responsavel === fResp) && (fTipo === 'todos' || e.tipo === fTipo)), [store, fResp, fTipo]);
  const tasksWithDate = crmUseMemo(() => store.tarefas.filter((t) => t.prazo && (fResp === 'todos' || t.responsavel === fResp)), [store, fResp]);
  const evByDay = (iso) => evFiltered.filter((e) => e.dia === iso);
  const tasksByDay = (iso) => (fTipo === 'todos' || fTipo === 'prazo') ? tasksWithDate.filter((t) => t.prazo === iso) : [];

  const shift = (n) => { const d = new Date(cursor); if (view === 'mes') d.setMonth(d.getMonth() + n); else if (view === 'semana') d.setDate(d.getDate() + 7 * n); else d.setDate(d.getDate() + n); setCursor(d); };
  const title = crmUseMemo(() => {
    if (view === 'mes') return `${FX_MON_FULL[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === 'dia') return `${cursor.getDate()} de ${FX_MON_FULL[cursor.getMonth()]}`;
    const ws = new Date(cursor); ws.setDate(ws.getDate() - ws.getDay());
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    return `${ws.getDate()} ${FX_MON[ws.getMonth()]} – ${we.getDate()} ${FX_MON[we.getMonth()]}`;
  }, [view, cursor]);

  const openEvt = (e) => setModal(e);
  const newAt = (dia, hIni) => setModal({ dia, hIni: hIni || '09:00', hFim: hIni ? crmMinToHour(crmHourToMin(hIni) + 60) : '10:00', tipo: 'reunião', titulo: '', allDay: false, responsavel: 'thiago', local: '' });

  // ----- month grid -----
  const renderMonth = () => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const startDow = first.getDay();
    const start = new Date(y, m, 1 - startDow);
    const cells = []; for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push(d); }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {CRM_WD.map((w) => <div key={w} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{w}</div>)}
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridAutoRows: '1fr', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
          {cells.map((d, i) => {
            const iso = crmISO(d); const inMonth = d.getMonth() === m; const isToday = iso === CRM_TODAY;
            const evs = evByDay(iso); const tks = tasksByDay(iso);
            return (
              <div key={i} onClick={() => newAt(iso)} style={{ borderRight: (i % 7 !== 6) ? '1px solid var(--border)' : 'none', borderBottom: i < 35 ? '1px solid var(--border)' : 'none', padding: 6, minHeight: 92, background: inMonth ? 'transparent' : 'var(--bg-soft)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: isToday ? 700 : 500, fontVariantNumeric: 'tabular-nums', background: isToday ? 'var(--accent)' : 'transparent', color: isToday ? '#020D25' : inMonth ? 'var(--text)' : 'var(--text-subtle)' }}>{d.getDate()}</span>
                </div>
                {evs.slice(0, 3).map((e) => <CrmEvtChip key={e.id} e={e} onClick={openEvt} compact />)}
                {tks.slice(0, 1).map((t) => (
                  <div key={t.id} onClick={(ev) => { ev.stopPropagation(); nav.navPage('tarefas'); }} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', padding: '1px 4px' }}>
                    <Icon name="listChecks" size={11} style={{ color: 'var(--text-subtle)' }} /><span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.titulo}</span>
                  </div>
                ))}
                {(evs.length + tks.length > 4) && <div style={{ fontSize: 10, color: 'var(--text-subtle)', paddingLeft: 4 }}>+{evs.length + tks.length - 4} mais</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ----- timeline (week/day) with drag -----
  const renderTimeline = (days) => {
    const onDrop = (clientY, colDate) => {
      if (!drag) return;
      const rel = clientY - drag.gridTop - drag.grab;
      let mins = Math.round(rel / HOUR_PX * 60 / 30) * 30 + 8 * 60;
      mins = Math.max(8 * 60, Math.min(20 * 60, mins));
      const dur = drag.dur;
      mut.moveEvento(drag.id, crmISO(colDate), crmMinToHour(mins), crmMinToHour(mins + dur));
      setDrag(null);
    };
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
        {/* all-day row */}
        <div style={{ display: 'grid', gridTemplateColumns: `52px repeat(${days.length},1fr)`, borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-subtle)', padding: '7px 6px', textAlign: 'right' }}>dia todo</div>
          {days.map((d, i) => {
            const iso = crmISO(d); const isToday = iso === CRM_TODAY;
            const allday = [...evByDay(iso).filter((e) => e.allDay), ...tasksByDay(iso)];
            return (
              <div key={i} style={{ borderLeft: '1px solid var(--border)', padding: 6, minHeight: 38, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: isToday ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 2 }}>{CRM_WD[d.getDay()]} {d.getDate()}{isToday ? ' · hoje' : ''}</div>
                {allday.map((x) => x.tipo ? <CrmEvtChip key={x.id} e={x} onClick={openEvt} compact /> : (
                  <div key={x.id} onClick={() => nav.navPage('tarefas')} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}><Icon name="flag" size={10} style={{ color: CRM_EVT.prazo.color }} />{x.titulo}</div>
                ))}
              </div>
            );
          })}
        </div>
        {/* hours grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `52px repeat(${days.length},1fr)`, position: 'relative' }}>
            <div>
              {CRM_HOURS.map((h) => <div key={h} style={{ height: HOUR_PX, fontSize: 11, color: 'var(--text-subtle)', textAlign: 'right', paddingRight: 7, transform: 'translateY(-6px)' }}>{h}:00</div>)}
            </div>
            {days.map((d, ci) => {
              const iso = crmISO(d);
              const timed = evByDay(iso).filter((e) => !e.allDay && e.hIni);
              return (
                <div key={ci} data-col={ci}
                  onMouseUp={(e) => { if (drag) { const grid = e.currentTarget.getBoundingClientRect(); onDrop(e.clientY, d); } }}
                  onClick={(e) => { if (drag) return; const r = e.currentTarget.getBoundingClientRect(); const mins = Math.round((e.clientY - r.top) / HOUR_PX * 60 / 30) * 30 + 8 * 60; newAt(iso, crmMinToHour(Math.max(480, Math.min(1200, mins)))); }}
                  style={{ position: 'relative', borderLeft: '1px solid var(--border)', cursor: 'pointer' }}>
                  {CRM_HOURS.map((h) => <div key={h} style={{ height: HOUR_PX, borderBottom: '1px solid var(--border)' }}></div>)}
                  {timed.map((e) => {
                    const top = (crmHourToMin(e.hIni) - 480) / 60 * HOUR_PX;
                    const dur = Math.max(30, crmHourToMin(e.hFim || crmMinToHour(crmHourToMin(e.hIni) + 60)) - crmHourToMin(e.hIni));
                    const m = CRM_EVT[e.tipo];
                    const dragging = drag && drag.id === e.id;
                    return (
                      <div key={e.id}
                        onMouseDown={(ev) => { ev.stopPropagation(); const grid = ev.currentTarget.parentElement.getBoundingClientRect(); setDrag({ id: e.id, dur, grab: ev.clientY - (grid.top + top), gridTop: grid.top }); }}
                        onClick={(ev) => { ev.stopPropagation(); if (!drag) openEvt(e); }}
                        style={{ position: 'absolute', top: top + 1, left: 3, right: 3, height: dur / 60 * HOUR_PX - 2, background: m.soft, borderLeft: `3px solid ${m.color}`, borderRadius: 7, padding: '4px 7px', overflow: 'hidden', cursor: 'grab', opacity: dragging ? 0.6 : 1, boxShadow: dragging ? 'var(--shadow-md)' : 'none', zIndex: dragging ? 5 : 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: m.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.titulo}</div>
                        <div style={{ fontSize: 10, color: m.color, opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>{e.hIni}{e.hFim ? `–${e.hFim}` : ''}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const weekDays = crmUseMemo(() => { const ws = new Date(cursor); ws.setDate(ws.getDate() - ws.getDay()); return Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(ws.getDate() + i); return d; }); }, [cursor]);

  // ----- list view -----
  const renderList = () => {
    const upcoming = evFiltered.filter((e) => e.dia >= CRM_TODAY).sort((a, b) => a.dia.localeCompare(b.dia) || (a.hIni || '').localeCompare(b.hIni || ''));
    const byDay = {}; upcoming.forEach((e) => { (byDay[e.dia] = byDay[e.dia] || []).push(e); });
    tasksWithDate.filter((t) => t.prazo >= CRM_TODAY && (fTipo === 'todos' || fTipo === 'prazo')).forEach((t) => { (byDay[t.prazo] = byDay[t.prazo] || []).push({ ...t, _task: true }); });
    const days = Object.keys(byDay).sort();
    if (days.length === 0) return <div className="card"><CrmEmpty icon="calendar" title="Nenhum compromisso futuro" sub="Crie um evento para começar." cta={<button className="btn btn-primary" onClick={() => newAt(CRM_TODAY)}><Icon name="plus" size={14} />Novo evento</button>} /></div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720 }}>
        {days.map((iso) => {
          const d = crmParse(iso); const isToday = iso === CRM_TODAY;
          return (
            <div key={iso}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em' }}>{isToday ? 'Hoje' : CRM_WD_FULL[d.getDay()]}</span>
                <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{d.getDate()} {FX_MON[d.getMonth()]}</span>
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {byDay[iso].map((e, i) => {
                  if (e._task) return (
                    <div key={e.id} onClick={() => nav.navPage('tarefas')} className="crm-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg-sunken)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="listChecks" size={15} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{e.titulo}</div><div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Tarefa · prazo · {crmFirst(e.responsavel)}</div></div>
                      <CrmPrioTag p={e.prioridade} />
                    </div>
                  );
                  const m = CRM_EVT[e.tipo];
                  return (
                    <div key={e.id} onClick={() => openEvt(e)} className="crm-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                      <div style={{ width: 52, flexShrink: 0, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{e.allDay ? 'dia' : e.hIni}</div>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: m.soft, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={m.icon} size={15} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{e.titulo}</div><div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{m.label}{e.local ? ' · ' + e.local : ''} · {crmFirst(e.responsavel)}</div></div>
                      <CrmBadge tone="neutral">{m.label}</CrmBadge>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '20px 32px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--text)' }}>Agenda</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="btn btn-ghost" onClick={() => shift(-1)} style={{ width: 30, height: 30, padding: 0 }}><Icon name="chevronLeft" size={16} /></button>
            <div style={{ minWidth: 180, textAlign: 'center', fontSize: 14.5, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em', textTransform: 'capitalize' }}>{title}</div>
            <button className="btn btn-ghost" onClick={() => shift(1)} style={{ width: 30, height: 30, padding: 0 }}><Icon name="chevronRight" size={16} /></button>
          </div>
          <button className="btn btn-secondary" onClick={() => setCursor(crmParse(CRM_TODAY))} style={{ height: 30, fontSize: 12 }}>Hoje</button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => newAt(CRM_TODAY)}><Icon name="plus" size={14} />Novo evento</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <FxSegmented options={[{ value: 'mes', label: 'Mês' }, { value: 'semana', label: 'Semana' }, { value: 'dia', label: 'Dia' }, { value: 'lista', label: 'Lista' }]} value={view} onChange={setView} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FxSelect options={['Todos', ...CRM_USERS.filter((u) => u.ativo).map((u) => u.nome)]} value={fResp === 'todos' ? 'Todos' : crmUser(fResp).nome} onChange={(e) => setFResp(e.target.value === 'Todos' ? 'todos' : CRM_USERS.find((u) => u.nome === e.target.value).id)} />
            <div style={{ display: 'flex', gap: 4 }}>
              {['todos', 'audiência', 'prazo', 'reunião', 'outro'].map((t) => {
                const on = fTipo === t; const m = CRM_EVT[t];
                return <button key={t} onClick={() => setFTipo(t)} style={{ height: 32, padding: '0 11px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, border: `1px solid ${on ? (m ? m.color : 'var(--accent)') : 'var(--border-strong)'}`, background: on ? (m ? m.soft : 'var(--accent-soft)') : 'var(--surface)', color: on ? (m ? m.color : 'var(--accent)') : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {m && <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.color }}></span>}{t === 'todos' ? 'Todos' : m.label}
                </button>;
              })}
            </div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '16px 32px 28px', display: 'flex', flexDirection: 'column' }}>
        {view === 'mes' && renderMonth()}
        {view === 'semana' && renderTimeline(weekDays)}
        {view === 'dia' && renderTimeline([cursor])}
        {view === 'lista' && <div style={{ overflowY: 'auto' }}>{renderList()}</div>}
      </div>
      {modal && <CrmEventoModal store={store} evento={modal.id ? modal : modal} onClose={() => setModal(null)} onSave={(f) => { if (f.id) mut.updateEvento(f); else mut.addEvento(f); }} />}
    </div>
  );
};

window.CrmAgendaPage = CrmAgendaPage;
