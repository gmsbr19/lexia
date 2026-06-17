// LexIA · Contencioso — primitivas de UI compartilhadas (prefixo Proc).
// Constroem sobre tokens.css + Icon + Crm*/Fx*. Semáforo = único uso de cor semântica.

// ---- semáforo de prazo (vermelho / âmbar / verde) ----
const PROC_TONE = {
  neg:     { fg: 'var(--crit)', soft: 'var(--crit-soft)' },
  warn:    { fg: 'var(--warn)', soft: 'var(--warn-soft)' },
  pos:     { fg: 'var(--ok)',   soft: 'var(--ok-soft)' },
  neutral: { fg: 'var(--text-muted)', soft: 'var(--bg-sunken)' },
};
const ProcDot = ({ tone = 'neutral', size = 8, pulse = false }) => (
  <span className={pulse ? 'pulse' : ''} style={{ width: size, height: size, borderRadius: '50%', background: (PROC_TONE[tone] || PROC_TONE.neutral).fg, flexShrink: 0, display: 'inline-block' }}></span>
);
// pill cheia do semáforo
const ProcSemaforo = ({ du, prefix, big = false }) => {
  const u = procUrgency(du);
  const t = PROC_TONE[u.tone] || PROC_TONE.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, height: big ? 26 : 22, padding: big ? '0 11px' : '0 9px',
      borderRadius: 7, background: t.soft, color: t.fg, fontSize: big ? 13 : 12, fontWeight: 600,
      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', letterSpacing: '-0.01em',
    }}>
      <ProcDot tone={u.tone} pulse={u.tone === 'neg'} />
      {prefix ? `${prefix} · ` : ''}{u.label}
    </span>
  );
};

// ---- fonte (PJe / e-SAJ / Projudi / DJe) — chip neutro discreto ----
const ProcFonte = ({ fonte, size = 'sm' }) => {
  const m = PROC_FONTE[fonte] || { label: fonte, sigla: fonte };
  return (
    <span title={m.desc} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, height: size === 'sm' ? 20 : 22, padding: '0 8px',
      borderRadius: 6, background: 'var(--bg-sunken)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-subtle)' }}></span>{m.label}
    </span>
  );
};

// ---- número CNJ formatado (tabular) + copiar ----
const ProcCNJ = ({ numero, size = 13, copy = false, color = 'var(--text)' }) => {
  const { toast } = (typeof useCrmToast === 'function') ? useCrmToast() : { toast: () => {} };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: size, fontWeight: 500, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>{numero}</span>
      {copy && (
        <button onClick={(e) => { e.stopPropagation(); if (navigator.clipboard) navigator.clipboard.writeText(numero); toast('Número CNJ copiado'); }}
          title="Copiar número CNJ" style={{ border: 'none', background: 'transparent', color: 'var(--text-subtle)', cursor: 'pointer', padding: 2, display: 'inline-flex', borderRadius: 5 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-subtle)'; }}>
          <Icon name="copy" size={13} />
        </button>
      )}
    </span>
  );
};

// ---- badge de status do processo ----
const ProcStatus = ({ status }) => {
  const m = PROC_STATUS[status] || PROC_STATUS.ativo;
  return <CrmBadge tone={m.tone} dot>{m.label}</CrmBadge>;
};
// ---- fase ----
const ProcFaseTag = ({ fase }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 9px', borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
    {(PROC_FASE[fase] || { label: fase }).label}
  </span>
);

// ---- nosso polo (autor/réu/...) ----
const ProcPolo = ({ polo }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
    <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>nós:</span>
    <span style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{polo}</span>
  </span>
);

// ---- ícone de tipo de movimentação ----
const ProcMovIcon = ({ tipo, size = 32, active = false }) => {
  const m = PROC_MOV[tipo] || PROC_MOV.cartorario;
  return (
    <div style={{
      width: size, height: size, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'var(--accent-soft)' : 'var(--bg-sunken)', color: active ? 'var(--accent)' : 'var(--text-muted)',
    }}><Icon name={m.icon} size={Math.round(size * 0.5)} strokeWidth={1.7} /></div>
  );
};

// ---- responsável: avatar pequeno + primeiro nome ----
const ProcResp = ({ id, showName = true, size = 22 }) => {
  const u = (typeof crmUser === 'function') ? crmUser(id) : { iniciais: '—', nome: '—' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 600, flexShrink: 0 }}>{u.iniciais}</span>
      {showName && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{u.nome.split(' ')[0]}</span>}
    </span>
  );
};

// ---- título de seção (ficha) ----
const ProcSecTitle = ({ icon, title, right, sub }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
      {icon && <span style={{ color: 'var(--text-subtle)' }}><Icon name={icon} size={16} /></span>}
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</span>
      {sub && <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{sub}</span>}
    </div>
    {right}
  </div>
);

// ---- KPI compacto com tonalidade (semáforo) ----
const ProcStat = ({ label, value, icon, tone, sub, onClick }) => {
  const fg = tone ? (PROC_TONE[tone] || PROC_TONE.neutral).fg : 'var(--text)';
  return (
    <div className="card" onClick={onClick} style={{ padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: 9, minHeight: 102, cursor: onClick ? 'pointer' : 'default', transition: 'border-color .12s, background .12s' }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.borderColor = 'var(--border)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        {icon && <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: tone ? (PROC_TONE[tone] || PROC_TONE.neutral).soft : 'var(--bg-sunken)', color: tone ? fg : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={14} strokeWidth={1.8} /></div>}
      </div>
      <span style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', color: fg }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{sub}</span>}
    </div>
  );
};

// ---- segmented control p/ filtros locais (reusa visual do FxSegmented) ----
const ProcSeg = (props) => <FxSegmented {...props} />;

Object.assign(window, {
  PROC_TONE, ProcDot, ProcSemaforo, ProcFonte, ProcCNJ, ProcStatus, ProcFaseTag,
  ProcPolo, ProcMovIcon, ProcResp, ProcSecTitle, ProcStat, ProcSeg,
});
