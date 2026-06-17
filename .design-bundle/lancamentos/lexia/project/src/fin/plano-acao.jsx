// Plano de ação — the AI-suggested action plan launched from the weekly briefing.
// active="inicio", breadcrumb ["Início", "Plano de ação"]. Fully interactive:
// checking / acting on a step advances the plan progress + recovered value live.

// ---- Plan data — derived from the weekly briefing ----
const PLAN_GROUPS = [
  {
    id: 'inadimplencia',
    title: 'Recuperar inadimplência',
    desc: 'R$ 51,2 mil vencidos há mais de 60 dias, concentrados em 2 clientes.',
    icon: 'alertTriangle', tone: 'vencido',
    steps: [
      { id: 'a1', icon: 'phone',    title: 'Cobrar Construtora Aurora',         ctx: '74 dias em atraso · ação trabalhista · sem resposta a 2 avisos', value: 28400, priority: 'Alta',  cta: 'Gerar cobrança',  ai: true },
      { id: 'a2', icon: 'mail',     title: 'Enviar lembrete — Vargas & Cia',     ctx: '63 dias · 2 parcelas em aberto · primeiro aviso',               value: 22800, priority: 'Alta',  cta: 'Enviar lembrete', ai: true },
      { id: 'a3', icon: 'fileText', title: 'Avaliar protesto extrajudicial',     ctx: 'Aurora sem retorno · escalar cobrança se silêncio persistir',    value: 0,     priority: 'Média', cta: 'Abrir minuta',    ai: false },
    ],
  },
  {
    id: 'receita',
    title: 'Capturar receita não lançada',
    desc: '5 casos ativos sem honorário definido — potencial de R$ 84,0 mil.',
    icon: 'receipt', tone: 'gold',
    steps: [
      { id: 'b1', icon: 'receipt',   title: 'Lançar honorário — Tech Holding',       ctx: 'Caso CADE ativo há 3 dias sem fee · estimado R$ 32.000', value: 32000, priority: 'Alta',  cta: 'Lançar honorário',   ai: true },
      { id: 'b2', icon: 'feather',   title: 'Definir fee — Helena Vargas',           ctx: 'Contrato 72% completo · honorários de êxito',            value: 18000, priority: 'Média', cta: 'Continuar contrato', ai: true },
      { id: 'b3', icon: 'briefcase', title: 'Revisar 3 casos sem fee restantes',     ctx: 'Societário e tributário · estimado R$ 34.000',           value: 34000, priority: 'Média', cta: 'Ver casos',          ai: true },
    ],
  },
  {
    id: 'estabilizar',
    title: 'Revisar & estabilizar o caixa',
    desc: 'Lançamento atípico sinalizado e queda de 12% no recebido do mês.',
    icon: 'sliders', tone: 'alerta',
    steps: [
      { id: 'c1', icon: 'alertCircle', title: 'Revisar importação sinalizada',          ctx: 'Lançamento atípico de −R$ 150 mil aguardando revisão',   value: 0, priority: 'Alta',  cta: 'Revisar',      ai: false },
      { id: 'c2', icon: 'calendar',    title: 'Confirmar parcela 3/6 — Tech Holding',   ctx: 'R$ 12.000 vence em 2 dias · consultoria societária',     value: 0, priority: 'Baixa', cta: 'Ver contrato', ai: false },
    ],
  },
];

const PLAN_TONES = {
  vencido: { dot: 'var(--fin-neg, #C0492F)', soft: 'rgba(192,73,47,0.10)' },
  alerta:  { dot: '#C77E1F',                 soft: 'rgba(217,138,43,0.12)' },
  gold:    { dot: 'var(--accent)',           soft: 'var(--accent-soft)' },
};

const PRIORITY = {
  Alta:  { bg: 'rgba(192,73,47,0.10)',  fg: 'var(--fin-neg, #C0492F)' },
  Média: { bg: 'var(--bg-sunken)',      fg: 'var(--text-muted)' },
  Baixa: { bg: 'var(--bg-sunken)',      fg: 'var(--text-subtle)' },
};

const ALL_STEPS = PLAN_GROUPS.flatMap(g => g.steps);
const PLAN_TOTAL_VALUE = ALL_STEPS.reduce((s, st) => s + st.value, 0); // 135.200
const PLAN_TOTAL_COUNT = ALL_STEPS.length;                            // 8

// ---- compact gold→navy currency, "R$ 135,2 mil" style ----
const planMoney = (n) => {
  if (n >= 1000) return `R$ ${(n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: n % 1000 === 0 && n >= 100000 ? 0 : 1, maximumFractionDigits: 1 })} mil`;
  return `R$ ${n.toLocaleString('pt-BR')}`;
};

// ---- circular progress ring (simple SVG circle) ----
const ProgressRing = ({ pct, size = 92, stroke = 9 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .5s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.03em', fontFeatureSettings: '"tnum"' }}>{Math.round(pct * 100)}%</span>
      </div>
    </div>
  );
};

// ---- Impact hero — recoverable value + live progress ----
const PlanImpactHero = ({ doneSet }) => {
  const doneCount = doneSet.size;
  const recovered = ALL_STEPS.filter(s => doneSet.has(s.id)).reduce((s, st) => s + st.value, 0);
  const pct = doneCount / PLAN_TOTAL_COUNT;
  const allDone = doneCount === PLAN_TOTAL_COUNT;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 16,
      boxShadow: 'var(--shadow-md)', padding: '22px 24px', position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', gap: 28, marginBottom: 22,
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 100% 0%, var(--accent-soft) 0%, transparent 48%)' }} />
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>
          <Icon name="sparkles" size={12} strokeWidth={2} />
          Plano gerado pela LexIA
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Recupere até <span style={{ color: 'var(--fin-pos, #2E9E5B)' }}>{planMoney(PLAN_TOTAL_VALUE)}</span> em receita
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.55, maxWidth: 520 }}>
          {PLAN_TOTAL_COUNT} ações priorizadas a partir do seu briefing semanal: cobranças vencidas, honorários
          não lançados e um lançamento atípico a revisar.
        </p>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18, paddingLeft: 28, borderLeft: '1px solid var(--border)', flexShrink: 0 }}>
        <ProgressRing pct={pct} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginBottom: 1 }}>Ações concluídas</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', fontFeatureSettings: '"tnum"' }}>{doneCount} <span style={{ color: 'var(--text-subtle)', fontWeight: 500 }}>/ {PLAN_TOTAL_COUNT}</span></div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginBottom: 1 }}>Receita recuperada</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: recovered > 0 ? 'var(--fin-pos, #2E9E5B)' : 'var(--text)', fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum"' }}>{planMoney(recovered)}</div>
          </div>
          {allDone && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--fin-pos, #2E9E5B)' }}>
              <Icon name="checkCircle" size={13} strokeWidth={2} />Plano concluído
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- single action step (checkable) ----
const ActionStep = ({ step, done, onToggle, last }) => {
  const pr = PRIORITY[step.priority] || PRIORITY['Média'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 4px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
      opacity: done ? 0.55 : 1, transition: 'opacity .2s',
    }}>
      {/* check toggle */}
      <button
        onClick={() => onToggle(step.id)}
        aria-label={done ? 'Marcar como pendente' : 'Marcar como concluída'}
        style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', padding: 0,
          border: done ? 'none' : '1.8px solid var(--border-strong)',
          background: done ? 'var(--fin-pos, #2E9E5B)' : 'transparent',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}
      >
        {done && <Icon name="check" size={13} strokeWidth={2.6} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 13.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em',
            textDecoration: done ? 'line-through' : 'none', textDecorationColor: 'var(--text-subtle)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{step.title}</span>
          {step.ai && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 999, flexShrink: 0 }}>
              <Icon name="sparkles" size={9} strokeWidth={2} />IA
            </span>
          )}
          <span style={{ fontSize: 10, fontWeight: 600, color: pr.fg, background: pr.bg, padding: '2px 7px', borderRadius: 999, flexShrink: 0, letterSpacing: '0.01em' }}>{step.priority}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.ctx}</div>
      </div>

      {step.value > 0 && (
        <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 4 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum"', letterSpacing: '-0.01em' }}>{planMoney(step.value)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-subtle)' }}>{step.priority === 'Alta' ? 'a recuperar' : 'potencial'}</div>
        </div>
      )}

      {done ? (
        <button
          onClick={() => onToggle(step.id)}
          className="btn btn-ghost"
          style={{ height: 30, fontSize: 12, padding: '0 10px', flexShrink: 0, width: 116, justifyContent: 'center', color: 'var(--fin-pos, #2E9E5B)' }}
        >
          <Icon name="checkCircle" size={13} strokeWidth={2} />Concluída
        </button>
      ) : (
        <button
          onClick={() => onToggle(step.id)}
          className="btn btn-secondary"
          style={{ height: 30, fontSize: 12, padding: '0 12px', flexShrink: 0, width: 116, justifyContent: 'center' }}
        >{step.cta}</button>
      )}
    </div>
  );
};

// ---- group of steps ----
const PlanGroup = ({ group, doneSet, onToggle }) => {
  const t = PLAN_TONES[group.tone] || PLAN_TONES.gold;
  const total = group.steps.length;
  const done = group.steps.filter(s => doneSet.has(s.id)).length;
  const groupValue = group.steps.reduce((s, st) => s + st.value, 0);
  return (
    <div className="card" style={{ padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: t.soft, color: t.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={group.icon} size={16} strokeWidth={1.85} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.015em' }}>{group.title}</span>
            {groupValue > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: t.dot, background: t.soft, padding: '2px 9px', borderRadius: 999, fontFeatureSettings: '"tnum"' }}>{planMoney(groupValue)}</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginTop: 2 }}>{group.desc}</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: done === total ? 'var(--fin-pos, #2E9E5B)' : 'var(--text-muted)', fontFeatureSettings: '"tnum"', flexShrink: 0 }}>{done}/{total}</span>
      </div>
      <div>
        {group.steps.map((s, i) => (
          <ActionStep key={s.id} step={s} done={doneSet.has(s.id)} onToggle={onToggle} last={i === group.steps.length - 1} />
        ))}
      </div>
    </div>
  );
};

// ---- side rail: why this plan ----
const PlanReasoning = () => (
  <div style={{
    background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 16,
    boxShadow: 'var(--shadow-sm)', padding: '16px 18px', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 0% 0%, var(--accent-soft) 0%, transparent 55%)' }} />
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12 }}>
        <Icon name="sparkles" size={12} strokeWidth={2} />
        Por que a LexIA sugeriu isto
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {[
          ['trendingDown', 'O caixa recebido caiu 12% frente à média trimestral — recuperar vencidos restaura o fluxo.'],
          ['clock', 'R$ 51,2 mil estão parados há +60 dias em 2 clientes. Quanto mais tempo, menor a chance de receber.'],
          ['receipt', '5 casos seguem ativos sem honorário. São R$ 84,0 mil de receita já trabalhada e não faturada.'],
        ].map(([icon, txt], i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--bg-sunken)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <Icon name={icon} size={13} strokeWidth={1.85} />
            </div>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-muted)' }}>{txt}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-ghost" style={{ height: 30, fontSize: 12, padding: '0 10px' }}>
          <Icon name="refreshCw" size={12} strokeWidth={2} />Regenerar plano
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: 'var(--text-subtle)' }}>há 2 h</span>
      </div>
    </div>
  </div>
);

// ---- side rail: suggested sequence ----
const TIMELINE = [
  { when: 'Esta semana',     tone: 'vencido', items: ['Cobrar Construtora Aurora', 'Enviar lembrete — Vargas & Cia', 'Lançar honorário — Tech Holding', 'Revisar importação sinalizada'] },
  { when: 'Próximos 15 dias', tone: 'gold',    items: ['Definir fee — Helena Vargas', 'Revisar 3 casos sem fee'] },
  { when: 'Acompanhar',       tone: 'alerta',  items: ['Avaliar protesto extrajudicial', 'Confirmar parcela 3/6'] },
];

const PlanTimeline = () => (
  <div className="card" style={{ padding: '16px 18px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <Icon name="calendar" size={15} strokeWidth={1.9} style={{ color: 'var(--text-muted)' }} />
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Sequência sugerida</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      {TIMELINE.map((blk, i) => {
        const t = PLAN_TONES[blk.tone] || PLAN_TONES.gold;
        return (
          <div key={i} style={{ display: 'flex', gap: 11 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.dot, marginTop: 3 }} />
              {i < TIMELINE.length - 1 && <span style={{ flex: 1, width: 1.5, background: 'var(--border)', marginTop: 4 }} />}
            </div>
            <div style={{ paddingBottom: i < TIMELINE.length - 1 ? 2 : 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{blk.when}</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {blk.items.map((it, j) => (
                  <li key={j} style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{it}</li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ===== Screen =====
const PlanoDeAcao = () => {
  const { useState } = React;
  const [doneSet, setDoneSet] = useState(() => new Set());
  const toggle = (id) => setDoneSet(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const doneCount = doneSet.size;

  return (
    <AppShell
      active="inicio"
      breadcrumb={['Início', 'Plano de ação']}
      actions={
        <>
          <button className="btn btn-secondary" style={{ height: 32, fontSize: 12.5 }}>
            <Icon name="refreshCw" size={13} strokeWidth={1.9} />Regenerar
          </button>
          <button className="btn btn-primary" style={{ height: 32, fontSize: 12.5 }}>
            <Icon name="check" size={13} strokeWidth={2.2} />Concluir revisão
          </button>
        </>
      }
    >
      <PageFrame>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)' }}>Plano de ação</h1>
            <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Do briefing semanal de 9 de junho · revise, aja e acompanhe o progresso.</p>
          </div>
          {doneCount > 0 && (
            <button onClick={() => setDoneSet(new Set())} className="btn btn-ghost" style={{ height: 30, fontSize: 12, padding: '0 10px' }}>
              <Icon name="history" size={12} strokeWidth={1.9} />Reiniciar
            </button>
          )}
        </div>

        <PlanImpactHero doneSet={doneSet} />

        <div style={{ display: 'grid', gridTemplateColumns: '1.62fr 1fr', gap: 20, alignItems: 'start' }}>
          <div>
            {PLAN_GROUPS.map(g => (
              <PlanGroup key={g.id} group={g} doneSet={doneSet} onToggle={toggle} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <PlanReasoning />
            <PlanTimeline />
          </div>
        </div>
      </PageFrame>
    </AppShell>
  );
};

Object.assign(window, { PlanoDeAcao, PLAN_GROUPS });
