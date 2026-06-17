// Tarefas — shared UI primitives.

// ---- priority-colored round checkbox (Todoist-style) ----
const TaskCheck = ({ done, prio = 4, onToggle, size = 19 }) => {
  const c = (PRIO[prio] || PRIO[4]).color;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle && onToggle(); }}
      aria-label={done ? 'Reabrir tarefa' : 'Concluir tarefa'}
      className="task-check"
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', padding: 0,
        border: `1.7px solid ${done ? c : c}`, background: done ? c : 'transparent',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .14s', position: 'relative',
      }}
    >
      <Icon name="check" size={size - 7} strokeWidth={3} style={{ opacity: done ? 1 : 0, transition: 'opacity .12s' }} />
    </button>
  );
};

// ---- priority flag ----
const PriorityFlag = ({ prio, size = 13, showLabel = false }) => {
  if (prio >= 4) return showLabel ? <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Normal</span> : null;
  const p = PRIO[prio];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: p.color, flexShrink: 0 }}>
      <Icon name="flag" size={size} strokeWidth={2} />
      {showLabel && <span style={{ fontSize: 11.5, fontWeight: 600 }}>{p.label}</span>}
    </span>
  );
};

// ---- assignee avatar ----
const AssigneeAvatar = ({ id, size = 22, ring = false, title = true }) => {
  const m = member(id);
  if (!m) return null;
  return (
    <div title={title ? `${m.name} · ${m.role}` : undefined} style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: m.color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, letterSpacing: '0.01em',
      boxShadow: ring ? '0 0 0 2px var(--surface)' : 'none',
    }}>{m.initials}</div>
  );
};

// ---- project dot (+ optional name) ----
const ProjectDot = ({ id, showName = false, size = 8 }) => {
  const p = project(id);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
      <span style={{ width: size, height: size, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
      {showName && <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>}
    </span>
  );
};

// ---- relation chip (caso/cliente/processo · clicável) ----
const LinkChip = ({ linkId, onClick }) => {
  const l = LINKS[linkId];
  if (!l) return null;
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick && onClick(l); }}
      title={`${l.label} · ${l.sub}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
        fontSize: 11, fontWeight: 500, color: 'var(--text-muted)',
        background: 'var(--bg-sunken)', border: '1px solid var(--border)',
        padding: '2px 8px 2px 6px', borderRadius: 999, cursor: 'pointer', maxWidth: 160,
      }}
    >
      <Icon name={LINK_ICON[l.type]} size={11} strokeWidth={1.9} style={{ flexShrink: 0 }} />
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.label}</span>
    </span>
  );
};

// ---- scheduled-date chip (data = quando fazer) ----
const DataChip = ({ data, hora, faded }) => {
  if (!data) return null;
  const lbl = dataLabel(data);
  const today = tDiff(data) === 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
      fontSize: 11.5, fontWeight: 500, color: faded ? 'var(--text-subtle)' : (today ? 'var(--accent)' : 'var(--text-muted)'),
    }}>
      <Icon name="calendar" size={12} strokeWidth={1.85} />
      {lbl}{hora && <span style={{ fontFeatureSettings: '"tnum"' }}>· {hora}</span>}
    </span>
  );
};

// ---- deadline chip (prazo = limite) — urgency-colored, distinct icon ----
const PRAZO_TONE = {
  vencido: { fg: 'var(--fin-neg, #C0492F)', bg: 'rgba(192,73,47,0.10)' },
  urgente: { fg: '#C77E1F',                 bg: 'rgba(217,138,43,0.12)' },
  proximo: { fg: 'var(--text-muted)',       bg: 'var(--bg-sunken)' },
  neutro:  { fg: 'var(--text-subtle)',      bg: 'transparent' },
};
const PrazoChip = ({ prazo, done, compact = false }) => {
  const info = prazoInfo(prazo, done);
  if (!info) return null;
  const t = PRAZO_TONE[info.tone];
  const icon = info.tone === 'vencido' ? 'flame' : 'flag';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
      fontSize: 11, fontWeight: 600, color: t.fg, background: t.bg,
      padding: t.bg === 'transparent' ? '0' : '2px 8px', borderRadius: 999,
    }}>
      <Icon name={icon} size={11} strokeWidth={2} />
      {compact ? info.label : <>Prazo {info.label}</>}
    </span>
  );
};

// ---- subtasks progress ----
const SubProgress = ({ subtasks }) => {
  if (!subtasks || !subtasks.length) return null;
  const done = subtasks.filter(s => s.done).length;
  const all = done === subtasks.length;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, fontSize: 11, fontWeight: 500, color: all ? 'var(--fin-pos, #2E9E5B)' : 'var(--text-subtle)' }}>
      <Icon name="listChecks" size={12} strokeWidth={1.9} />{done}/{subtasks.length}
    </span>
  );
};

// ---- IA badge ----
const IaBadge = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 999, flexShrink: 0 }}>
    <Icon name="sparkles" size={9} strokeWidth={2} />IA
  </span>
);

// ---- generic popover menu ----
const Menu = ({ trigger, children, align = 'left', width = 220 }) => {
  const { useState, useRef, useEffect } = React;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', [align]: 0, zIndex: 50, width,
          background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 12,
          boxShadow: 'var(--shadow-lg)', padding: 6, maxHeight: 320, overflowY: 'auto',
        }}>
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
};

const MenuItem = ({ icon, dot, label, sub, active, onClick, right }) => (
  <div onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 8, cursor: 'pointer',
    background: active ? 'var(--accent-soft)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text)',
  }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface-hover)'; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
  >
    {dot && <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
    {icon && <Icon name={icon} size={15} strokeWidth={1.8} style={{ flexShrink: 0, color: active ? 'var(--accent)' : 'var(--text-muted)' }} />}
    <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    {sub && <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{sub}</span>}
    {right}
    {active && <Icon name="check" size={14} strokeWidth={2.4} />}
  </div>
);

// ---- view switcher ----
const VIEWS = [
  { id: 'hoje',       label: 'Hoje',       icon: 'sun' },
  { id: 'lista',      label: 'Lista',      icon: 'list' },
  { id: 'quadro',     label: 'Quadro',     icon: 'kanban' },
  { id: 'calendario', label: 'Calendário', icon: 'calendar' },
  { id: 'agenda',     label: 'Agenda do dia', icon: 'calendarClock' },
];
const ViewSwitcher = ({ view, setView }) => (
  <div style={{ display: 'flex', gap: 3, background: 'var(--bg-soft)', borderRadius: 10, padding: 3, border: '1px solid var(--border)' }}>
    {VIEWS.map(v => {
      const on = view === v.id;
      return (
        <button key={v.id} onClick={() => setView(v.id)} style={{
          height: 30, padding: '0 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: on ? 'var(--surface)' : 'transparent',
          color: on ? 'var(--text)' : 'var(--text-muted)',
          fontSize: 12.5, fontWeight: on ? 600 : 500,
          boxShadow: on ? 'var(--shadow-sm)' : 'none',
        }}>
          <Icon name={v.icon} size={14} strokeWidth={1.85} />{v.label}
        </button>
      );
    })}
  </div>
);

// ---- section header (group titles in Hoje/Lista) ----
const SectionHeader = ({ icon, label, count, tone, right }) => {
  const color = tone === 'vencido' ? 'var(--fin-neg, #C0492F)' : tone === 'accent' ? 'var(--accent)' : 'var(--text)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px 9px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
      {icon && <Icon name={icon} size={15} strokeWidth={1.95} style={{ color }} />}
      <span style={{ fontSize: 13, fontWeight: 600, color, letterSpacing: '-0.01em' }}>{label}</span>
      {count != null && <span style={{ fontSize: 11.5, color: 'var(--text-subtle)', fontFeatureSettings: '"tnum"' }}>{count}</span>}
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
};

Object.assign(window, {
  TaskCheck, PriorityFlag, AssigneeAvatar, ProjectDot, LinkChip, DataChip, PrazoChip,
  SubProgress, IaBadge, Menu, MenuItem, VIEWS, ViewSwitcher, SectionHeader,
});
