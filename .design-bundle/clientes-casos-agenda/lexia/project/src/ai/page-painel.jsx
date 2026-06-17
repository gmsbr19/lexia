// Página de fundo: Painel Financeiro da LexIA — eco da referência (gráfico + anéis).
const Donut = ({ pct, color, label, value }) => {
  const r = 78, c = 2 * Math.PI * r;
  return (
    <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 196, height: 196 }}>
        <svg width="196" height="196" viewBox="0 0 196 196">
          <circle cx="98" cy="98" r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth="13" />
          <circle cx="98" cy="98" r={r} fill="none" stroke={color} strokeWidth="13" strokeLinecap="round"
            strokeDasharray={`${(c * pct) / 100} ${c}`} transform="rotate(-90 98 98)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em' }} className="tnum">{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </div>
  );
};

const PainelScreen = ({ insetRight = 0, insetLeft = 0 }) => (
  <AppShell
    active="financeiro"
    contentInsetRight={insetRight}
    contentInsetLeft={insetLeft}
    actions={
      <>
        <button className="btn btn-ghost" style={{ height: 32, fontSize: 12, color: 'var(--text-muted)' }}>
          <Icon name="filter" size={13} /> Filtrar
        </button>
        <button className="btn btn-secondary" style={{ height: 32, fontSize: 12 }}>
          <Icon name="download" size={13} /> Exportar
        </button>
      </>
    }
  >
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 48px 64px' }}>
      {/* breadcrumb + edição */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <Breadcrumb items={['Áreas', 'Financeiro']} />
        <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Editado há 2 dias</div>
      </div>

      {/* título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, flexShrink: 0,
          background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="wallet" size={28} /></div>
      </div>
      <h1 style={{ margin: '14px 0 6px', fontSize: 38, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text)' }}>Financeiro</h1>
      <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--text-muted)', maxWidth: 560, lineHeight: 1.5 }}>
        Visão consolidada de honorários, despesas e fluxo de caixa do escritório em 2026.
      </p>

      {/* abas/pills de view */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span className="pill" style={{ height: 30, padding: '0 12px', fontSize: 13 }}>
          <Icon name="barChart" size={14} /> Poupança 2026
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 30, borderRadius: 8 }}>
          <Icon name="pieChart" size={14} /> Entradas
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 30, borderRadius: 8 }}>
          <Icon name="pieChart" size={14} /> Saídas
        </span>
      </div>

      {/* grid: gráfico + 2 anéis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 16 }}>
        {/* gráfico de área */}
        <div className="card" style={{ padding: 22, minHeight: 320 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Líquido mensal</div>
          <div style={{ fontSize: 26, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 18 }} className="tnum">R$ 2,01 mil</div>
          <svg viewBox="0 0 480 200" width="100%" height="200" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[40, 90, 140].map((y) => (
              <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 5" />
            ))}
            <path d="M0,150 C60,138 90,120 140,128 C200,138 220,96 280,92 C330,89 350,90 400,70 C440,54 460,20 480,8 L480,200 L0,200 Z" fill="url(#areaFill)" />
            <path d="M0,150 C60,138 90,120 140,128 C200,138 220,96 280,92 C330,89 350,90 400,70 C440,54 460,20 480,8" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
            {[[0,150],[96,124],[192,118],[288,90],[384,74],[480,8]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r="3.5" fill="var(--bg-elevated)" stroke="var(--accent)" strokeWidth="2" />
            ))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--text-subtle)' }}>
            {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'].map((mes) => <span key={mes}>{mes}</span>)}
          </div>
        </div>

        <Donut pct={62} color="var(--ok)" label="Recebido" value="R$ 34 mil" />
        <Donut pct={48} color="var(--crit)" label="Despesas" value="R$ 32 mil" />
      </div>

      {/* lista de lançamentos */}
      <div className="card" style={{ marginTop: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Lançamentos recentes</div>
          <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>junho 2026</span>
        </div>
        {[
          { c: 'Construtora Aurora', d: 'Honorários de êxito', v: '+ R$ 18.000', pos: true, vencido: true },
          { c: 'Helena Vargas', d: 'Honorários mensais', v: '+ R$ 8.500', pos: true },
          { c: 'Cartório / custas', d: 'Custas processuais', v: '− R$ 1.240', pos: false },
          { c: 'Folha · equipe', d: 'Salários junho', v: '− R$ 22.400', pos: false },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-sunken)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={row.pos ? 'arrowDownRight' : 'arrowUpRight'} size={15} style={{ color: row.pos ? 'var(--ok)' : 'var(--crit)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{row.c}</div>
              <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{row.d}</div>
            </div>
            {row.vencido && <span className="pill" style={{ background: 'var(--crit-soft)', color: 'var(--crit)' }}><span className="dot" /> Vencido</span>}
            <div className="tnum" style={{ fontSize: 14, fontWeight: 500, color: row.pos ? 'var(--ok)' : 'var(--text)' }}>{row.v}</div>
          </div>
        ))}
      </div>
    </div>
  </AppShell>
);

window.PainelScreen = PainelScreen;
