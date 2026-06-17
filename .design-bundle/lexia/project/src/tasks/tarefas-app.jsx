// Tarefas — orchestrator. Owns task state + all callbacks; hosts quick-add,
// view switcher, filters, the Plano→tarefas generator, modal and toast.

// ---- quick add with live natural-language parse preview ----
const QuickAddBar = ({ onAdd }) => {
  const { useState } = React;
  const [v, setV] = useState('');
  const parsed = v.trim() ? parseQuickAdd(v) : null;
  const hasTokens = parsed && (parsed.project || parsed.assignee || parsed.prio || parsed.data || parsed.hora);
  const submit = () => { if (!parsed || !parsed.title) return; onAdd(parsed); setV(''); };
  return (
    <div className="card" style={{ padding: hasTokens ? '11px 14px 9px' : '11px 14px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <Icon name="plus" size={17} strokeWidth={2} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <input
          value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Adicionar tarefa…  ex.: Protocolar recurso amanhã 14h #trabalhista @joão !alta"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, color: 'var(--text)' }}
        />
        <span style={{ fontSize: 10.5, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>#projeto · @pessoa · !prioridade · data</span>
        <button className="btn btn-primary" onClick={submit} disabled={!parsed || !parsed.title} style={{ height: 30, fontSize: 12.5, opacity: parsed && parsed.title ? 1 : 0.5 }}>Adicionar</button>
      </div>
      {hasTokens && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Detectado:</span>
          {parsed.data && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 999 }}><Icon name="calendar" size={11} />{dataLabel(parsed.data)}{parsed.hora ? ` ${parsed.hora}` : ''}</span>}
          {parsed.project && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--bg-sunken)', padding: '2px 8px', borderRadius: 999 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: project(parsed.project).color }} />{project(parsed.project).name}</span>}
          {parsed.assignee && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--bg-sunken)', padding: '2px 8px 2px 4px', borderRadius: 999 }}><AssigneeAvatar id={parsed.assignee} size={15} title={false} />{member(parsed.assignee).first}</span>}
          {parsed.prio && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: PRIO[parsed.prio].color, background: 'var(--bg-sunken)', padding: '2px 8px', borderRadius: 999 }}><Icon name="flag" size={10} strokeWidth={2.2} />{PRIO[parsed.prio].label}</span>}
        </div>
      )}
    </div>
  );
};

// ---- plano → tarefas banner ----
const PlanoBanner = ({ onGenerate }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 16, padding: '15px 18px', marginBottom: 16,
    background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 14,
    boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 100% 0%, var(--accent-soft) 0%, transparent 46%)' }} />
    <div style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name="sparkles" size={19} strokeWidth={1.9} />
    </div>
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Plano da semana · LexIA</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>5 ações priorizadas prontas para virar tarefas — já vinculadas aos casos e clientes.</div>
    </div>
    <button className="btn btn-gold" onClick={onGenerate} style={{ height: 34, fontSize: 12.5, flexShrink: 0 }}>
      <Icon name="listChecks" size={14} strokeWidth={2} />Gerar 5 tarefas
    </button>
  </div>
);

// ---- toast ----
const Toast = ({ msg }) => msg ? (
  <div style={{
    position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
    display: 'flex', alignItems: 'center', gap: 9, padding: '11px 16px', borderRadius: 11,
    background: 'var(--brand-navy)', color: '#F5F1E4', boxShadow: 'var(--shadow-lg)', fontSize: 13, fontWeight: 500,
    border: '1px solid rgba(192,161,71,0.3)',
  }}>
    <Icon name="checkCircle" size={15} strokeWidth={2} style={{ color: 'var(--brand-gold)' }} />{msg}
  </div>
) : null;

// ---- filter trigger button ----
const FilterBtn = ({ icon, label, active, children }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 7, height: 32, padding: '0 11px', borderRadius: 9,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`, background: active ? 'var(--accent-soft)' : 'var(--surface)',
    cursor: 'pointer', fontSize: 12.5, fontWeight: 500, color: active ? 'var(--accent)' : 'var(--text-muted)', whiteSpace: 'nowrap',
  }}>{icon && <Icon name={icon} size={14} strokeWidth={1.85} />}{children || label}<Icon name="chevronDown" size={12} /></span>
);

const TarefasApp = ({ theme, onToggleTheme }) => {
  const { useState, useEffect } = React;
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [view, setView] = useState('hoje');
  const [groupBy, setGroupBy] = useState('projeto');
  const [fProject, setFProject] = useState(null);
  const [fAssignee, setFAssignee] = useState(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [planoDone, setPlanoDone] = useState(false);
  const [toast, setToast] = useState('');

  const flash = (m) => { setToast(m); };
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3400); return () => clearTimeout(t); }, [toast]);

  const update = (id, patch) => setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  const toggle = (id) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done, status: !t.done ? 'done' : (t.status === 'done' ? 'todo' : t.status) } : t));
  const move = (id, status) => update(id, { status, done: status === 'done' });
  const schedule = (id, hora) => update(id, { data: TODAY, hora });
  const del = (id) => setTasks(ts => ts.filter(t => t.id !== id));
  const addTask = (parsed) => {
    const t = { id: uid(), title: parsed.title, project: parsed.project || 'inbox', assignee: parsed.assignee || null, prio: parsed.prio || 4, data: parsed.data || null, hora: parsed.hora || null, prazo: null, status: 'todo', subtasks: [] };
    setTasks(ts => [t, ...ts]);
    flash('Tarefa adicionada' + (t.project !== 'inbox' ? ` em ${project(t.project).name}` : ' na Caixa de entrada'));
  };
  const newBlank = () => { const t = { id: uid(), title: 'Nova tarefa', project: 'inbox', assignee: ME, prio: 4, data: TODAY, hora: null, prazo: null, status: 'todo', subtasks: [] }; setTasks(ts => [t, ...ts]); setOpenId(t.id); };
  const generatePlano = () => { setTasks(ts => [...buildPlanoTasks(), ...ts]); setPlanoDone(true); setFProject('inbox'); setView('lista'); setGroupBy('projeto'); flash('5 tarefas criadas na Caixa de entrada, vinculadas aos casos'); };
  const onLinkClick = (l) => flash(`Abrindo ${l.type}: ${l.label}`);

  // filtering
  let filtered = tasks;
  if (fProject) filtered = filtered.filter(t => t.project === fProject);
  if (fAssignee) filtered = filtered.filter(t => t.assignee === fAssignee);
  if (onlyMine) filtered = filtered.filter(t => t.assignee === ME);

  const cb = { onToggle: toggle, onOpen: setOpenId, onLinkClick };
  const openTask = tasks.find(t => t.id === openId) || null;
  const mineCount = tasks.filter(t => t.assignee === ME && !t.done).length;

  return (
    <AppShell
      active="tarefas"
      breadcrumb={['Tarefas', view === 'hoje' ? 'Hoje' : view === 'lista' ? 'Lista' : view === 'quadro' ? 'Quadro' : view === 'calendario' ? 'Calendário' : 'Agenda do dia']}
      actions={
        <>
          <button onClick={onToggleTheme} className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0 }} title="Alternar tema">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
          <button className="btn btn-primary" onClick={newBlank} style={{ height: 32, fontSize: 12.5 }}><Icon name="plus" size={13} strokeWidth={2.2} />Nova tarefa</button>
        </>
      }
    >
      <PageFrame>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)' }}>Tarefas</h1>
            <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Delegue, agende e acompanhe o trabalho do escritório.</p>
          </div>
        </div>

        <QuickAddBar onAdd={addTask} />
        {!planoDone && <PlanoBanner onGenerate={generatePlano} />}

        {/* controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <ViewSwitcher view={view} setView={setView} />
          <div style={{ flex: 1 }} />
          {view === 'lista' && (
            <Menu align="right" width={190} trigger={<FilterBtn icon="layoutGrid" label={`Agrupar: ${GROUP_OPTS.find(g => g.id === groupBy).label}`} />}>
              {(close) => GROUP_OPTS.map(g => <MenuItem key={g.id} icon={g.icon} label={g.label} active={groupBy === g.id} onClick={() => { setGroupBy(g.id); close(); }} />)}
            </Menu>
          )}
          <Menu align="right" width={220} trigger={<FilterBtn active={!!fProject}>{fProject ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: project(fProject).color }} />{project(fProject).name}</span> : 'Projeto'}</FilterBtn>}>
            {(close) => <>
              <MenuItem label="Todos os projetos" active={!fProject} onClick={() => { setFProject(null); close(); }} />
              {PROJECTS.map(p => <MenuItem key={p.id} dot={p.color} label={p.name} active={fProject === p.id} onClick={() => { setFProject(p.id); close(); }} />)}
            </>}
          </Menu>
          <Menu align="right" width={220} trigger={<FilterBtn active={!!fAssignee} icon="user">{fAssignee ? member(fAssignee).first : 'Responsável'}</FilterBtn>}>
            {(close) => <>
              <MenuItem label="Toda a equipe" active={!fAssignee} onClick={() => { setFAssignee(null); close(); }} />
              {TEAM.map(m => <MenuItem key={m.id} label={m.name} sub={m.role} active={fAssignee === m.id} onClick={() => { setFAssignee(m.id); close(); }} right={<AssigneeAvatar id={m.id} size={18} title={false} />} />)}
            </>}
          </Menu>
          <button onClick={() => setOnlyMine(v => !v)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, height: 32, padding: '0 11px', borderRadius: 9, cursor: 'pointer',
            border: `1px solid ${onlyMine ? 'var(--accent)' : 'var(--border-strong)'}`, background: onlyMine ? 'var(--accent-soft)' : 'var(--surface)',
            fontSize: 12.5, fontWeight: 500, color: onlyMine ? 'var(--accent)' : 'var(--text-muted)', whiteSpace: 'nowrap',
          }}>
            <Icon name="inbox" size={14} strokeWidth={1.85} />Atribuídas a mim
            <span style={{ fontSize: 10.5, fontWeight: 600, background: onlyMine ? 'var(--accent)' : 'var(--bg-sunken)', color: onlyMine ? '#fff' : 'var(--text-subtle)', padding: '1px 6px', borderRadius: 999 }}>{mineCount}</span>
          </button>
        </div>

        {view === 'hoje' && <HojeView tasks={filtered} {...cb} />}
        {view === 'lista' && <ListaView tasks={filtered} groupBy={groupBy} {...cb} />}
        {view === 'quadro' && <QuadroView tasks={filtered} onMove={move} {...cb} />}
        {view === 'calendario' && <CalendarioView tasks={filtered} {...cb} />}
        {view === 'agenda' && <AgendaView tasks={filtered} onSchedule={schedule} {...cb} />}
      </PageFrame>

      {openTask && <TaskModal task={openTask} onClose={() => setOpenId(null)} onChange={update} onDelete={del} />}
      <Toast msg={toast} />
    </AppShell>
  );
};

Object.assign(window, { TarefasApp, QuickAddBar, PlanoBanner, Toast });
