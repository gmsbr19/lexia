// AI surfaces shared by Início + Financeiro · Visão geral.
// ProximoPassoQueue (anti-idleness "what to do now") + BriefingCard.

// Prioritized actions the firm should take now. Gold IA badge on AI-surfaced items.
const PROXIMO_PASSO = [
  { tone: 'vencido', icon: 'phone', title: 'Cobrar Construtora Aurora', ctx: 'R$ 28.400 vencido há 74 dias · ação trabalhista', cta: 'Gerar cobrança', value: 'R$ 28.400', ai: true },
  { tone: 'gold', icon: 'receipt', title: 'Lançar honorário — Tech Holding', ctx: 'Caso ativo há 3 dias sem fee definido · CADE', cta: 'Lançar honorário', value: '5 casos', ai: true },
  { tone: 'alerta', icon: 'alertTriangle', title: 'Revisar importação sinalizada', ctx: 'Lançamento atípico de −R$ 150k aguardando revisão', cta: 'Revisar', value: '4 itens' },
  { tone: 'neutro', icon: 'fileText', title: 'Finalizar contrato — Helena Vargas', ctx: 'Rascunho 72% completo · honorários de êxito', cta: 'Continuar', value: '72%', ai: true },
  { tone: 'neutro', icon: 'clock', title: 'Parcela 3/6 vence em 2 dias', ctx: 'Tech Holding · R$ 12.000 · consultoria societária', cta: 'Ver contrato', value: 'R$ 12.000' },
];

const PP_TONE = {
  vencido: { dot: '#C0492F', soft: 'rgba(192,73,47,0.10)' },
  alerta:  { dot: '#D98A2B', soft: 'rgba(217,138,43,0.12)' },
  gold:    { dot: 'var(--accent)', soft: 'var(--accent-soft)' },
  neutro:  { dot: 'var(--text-subtle)', soft: 'var(--bg-sunken)' },
};

const ProximoPassoItem = ({ item, last }) => {
  const t = PP_TONE[item.tone] || PP_TONE.neutro;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 13, padding: '13px 4px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, background: t.soft, color: t.dot,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={item.icon} size={16} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
          {item.ai && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 999, flexShrink: 0 }}>
              <Icon name="sparkles" size={9} strokeWidth={2} />IA
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.ctx}</div>
      </div>
      <button className="btn btn-secondary" style={{ height: 30, fontSize: 12, padding: '0 12px', flexShrink: 0 }}>{item.cta}</button>
    </div>
  );
};

const ProximoPassoQueue = ({ items = PROXIMO_PASSO, max = 5 }) => (
  <div className="card" style={{ padding: '16px 18px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="zap" size={15} strokeWidth={1.9} />
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Próximo passo</div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Priorizado pela LexIA · o que fazer agora</div>
        </div>
      </div>
      <a style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Ver tudo →</a>
    </div>
    <div>
      {items.slice(0, max).map((it, i) => (
        <ProximoPassoItem key={i} item={it} last={i === Math.min(max, items.length) - 1} />
      ))}
    </div>
  </div>
);

// Weekly AI briefing — composer-style surface
const BriefingCard = () => (
  <div style={{
    background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 16,
    boxShadow: 'var(--shadow-md)', padding: '18px 20px', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 100% 0%, var(--accent-soft) 0%, transparent 50%)' }} />
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12 }}>
        <Icon name="sparkles" size={12} strokeWidth={2} />
        Briefing semanal · LexIA
      </div>
      <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--text)', letterSpacing: '-0.01em' }}>
        Esta semana o caixa recebido caiu <strong style={{ color: 'var(--fin-neg,#C0492F)' }}>12%</strong> frente à média trimestral.
        Há <strong>R$ 51.200</strong> vencidos há mais de 60 dias concentrados em <strong>2 clientes</strong>, e
        <strong> 5 casos ativos sem honorário lançado</strong> — potencial de <strong style={{ color: 'var(--fin-pos,#2E9E5B)' }}>R$ 84.000</strong> em receita não capturada.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-gold" style={{ height: 32, fontSize: 12.5 }}>
          <Icon name="arrowRightCircle" size={13} strokeWidth={2} />
          Ver plano de ação
        </button>
        <button className="btn btn-ghost" style={{ height: 32, fontSize: 12.5 }}>Pular semana</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Atualizado há 2 h</span>
      </div>
    </div>
  </div>
);

Object.assign(window, { PROXIMO_PASSO, ProximoPassoQueue, ProximoPassoItem, BriefingCard });
