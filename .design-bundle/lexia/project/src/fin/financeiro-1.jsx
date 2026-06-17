// Financeiro — tabs 1–3: Visão geral, Receita, A receber & inadimplência.
// Each is an AppShell(active="financeiro") + FinTabStrip + body in PageFrame.

const finShell = (tab, children, actions) => (
  <AppShell
    active="financeiro"
    breadcrumb={['Financeiro']}
    tabs={<FinTabStrip active={tab} />}
    actions={actions}
  >{children}</AppShell>
);

const finActions = (
  <>
    <button className="btn btn-secondary" style={{ height: 32, fontSize: 12.5 }}><Icon name="calendar" size={13} />Ano fiscal 2026</button>
    <button className="btn btn-primary" style={{ height: 32, fontSize: 12.5 }}><Icon name="upload" size={13} />Importar</button>
  </>
);

// ============ Tab: Visão geral ============
const VG_KPIS = [
  { label: 'Recebido no mês', value: 'R$ 221,9 mil', delta: '8,1%', deltaDir: 'up', sub: 'Março de 2026', icon: 'banknote', accent: 'gold' },
  { label: 'A receber', value: 'R$ 336,7 mil', delta: '12%', deltaDir: 'up', sub: '34 títulos em aberto', icon: 'clock' },
  { label: 'Inadimplência', value: 'R$ 51,2 mil', delta: '4 clientes', deltaDir: 'down', sub: '+60 dias', icon: 'alertTriangle' },
  { label: 'Margem líquida', value: '30,2%', delta: '2,4 p.p.', deltaDir: 'up', sub: 'Resultado R$ 66,9 mil', icon: 'trendingUp' },
];

const FinVisaoGeral = () => finShell('visao',
  <PageFrame>
    <KpiStrip>{VG_KPIS.map((k, i) => <KpiCard key={i} {...k} />)}</KpiStrip>
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 20, alignItems: 'stretch' }}>
      <div className="card" style={{ padding: '18px 20px' }}>
        <CardTitle title="Receita · últimos 12 meses" sub="Recebido vs a receber, com projeção dos próximos meses"
          right={<ChartLegend items={[{ label: 'Recebido', color: FIN.c.recebido }, { label: 'A receber', color: FIN.c.receber }, { label: 'Projeção', color: FIN.c.receber, dash: true }]} />} />
        <RevenueAreaChart height={232} />
      </div>
      <div className="card" style={{ padding: '18px 20px' }}>
        <CardTitle title="Composição da receita" sub="Por modalidade de honorário" />
        <CompositionDonut />
      </div>
    </div>
    <ProximoPassoQueue max={5} />
  </PageFrame>,
  finActions
);

// ============ Tab: Receita ============
const MonthDetailRow = ({ d, last }) => {
  const total = d.recebido + d.receber;
  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <Td><span style={{ fontWeight: 600, color: 'var(--text)' }}>{d.mes} 2026</span>{d.proj && <span style={{ marginLeft: 8 }}><StatusPill label="projeção" tone="alerta" dot={false} /></span>}</Td>
      <Td align="right"><MoneyValue value={d.recebido} size={12.5} /></Td>
      <Td align="right"><span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{fmtBRL(d.receber)}</span></Td>
      <Td align="right"><MoneyValue value={total} size={12.5} weight={700} /></Td>
      <Td align="right" muted>{Math.round(d.recebido / total * 100)}%</Td>
    </tr>
  );
};

const FinReceita = () => finShell('receita',
  <PageFrame>
    <PageHeader title="Receita" sub="Realizado e projetado por competência" />
    <FilterBar>
      <Segmented options={['Mês', 'Trimestre', 'Ano', '12 meses']} active={3} />
      <div style={{ flex: 1 }} />
      <button className="btn btn-secondary" style={{ height: 32, fontSize: 12.5 }}><Icon name="download" size={13} />Exportar</button>
    </FilterBar>
    <div className="card" style={{ padding: '18px 20px', marginBottom: 20 }}>
      <CardTitle title="Projeção de caixa" sub="Meses futuros derretem conforme a taxa de realização histórica"
        right={<ChartLegend items={[{ label: 'Recebido', color: FIN.c.recebido }, { label: 'A receber', color: FIN.c.receber }, { label: 'Projeção', color: FIN.c.receber, dash: true }]} />} />
      <RevenueAreaChart height={300} />
    </div>
    <TableShell
      head={<>
        <Th>Competência</Th>
        <Th align="right">Recebido</Th>
        <Th align="right">A receber</Th>
        <Th align="right">Total</Th>
        <Th align="right">Realização</Th>
      </>}
      footer={<FooterBar showing={12} total={12} label="meses" />}
    >
      {REVENUE_SERIES.slice().reverse().map((d, i) => <MonthDetailRow key={i} d={d} last={i === 11} />)}
    </TableShell>
  </PageFrame>,
  finActions
);

// ============ Tab: A receber & inadimplência ============
const AR_KPIS = [
  { label: 'Total a receber', value: 'R$ 336,7 mil', sub: '34 títulos', icon: 'clock', accent: 'gold' },
  { label: 'Vencido', value: 'R$ 152,4 mil', delta: '20 títulos', deltaDir: 'down', sub: '45% da carteira', icon: 'alertTriangle' },
  { label: 'Vencido +60 dias', value: 'R$ 51,2 mil', sub: '6 títulos · risco alto', icon: 'alertCircle' },
  { label: 'Prazo médio', value: '38 dias', delta: '6 dias', deltaDir: 'down', sub: 'vs 32 dias meta', icon: 'trendingDown' },
];

const InadRow = ({ r, last }) => {
  const tone = r.dias >= 60 ? 'vencido' : 'alerta';
  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <Td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <Avatar name={r.cliente} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{r.cliente}</div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>{r.tipo} · {r.caso}</div>
          </div>
        </div>
      </Td>
      <Td align="right"><MoneyValue value={r.valor} size={12.5} /></Td>
      <Td align="center"><StatusPill label={`${r.dias} dias`} tone={tone} /></Td>
      <Td align="right">
        <button className="btn btn-secondary" style={{ height: 28, fontSize: 11.5, padding: '0 10px' }}><Icon name="phone" size={12} />Cobrar</button>
      </Td>
    </tr>
  );
};

const FinReceber = () => finShell('receber',
  <PageFrame>
    <PageHeader title="A receber & inadimplência" sub="Carteira em aberto e títulos vencidos" />
    <KpiStrip>{AR_KPIS.map((k, i) => <KpiCard key={i} {...k} />)}</KpiStrip>
    <AlertBanner tone="vencido" title="R$ 51.200 vencidos há mais de 60 dias"
      action={<button className="btn btn-secondary" style={{ height: 30, fontSize: 12 }}>Plano de cobrança</button>}>
      Acima do limite de R$ 40.000 definido pelo escritório. Concentrado em 2 clientes.
    </AlertBanner>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 20, alignItems: 'start' }}>
      <div className="card" style={{ padding: '18px 20px' }}>
        <CardTitle title="Aging da carteira" sub="Por faixa de vencimento" />
        <AgingBars />
      </div>
      <div>
        <SubHead2>Títulos vencidos por cliente</SubHead2>
        <TableShell
          head={<><Th>Cliente / caso</Th><Th align="right">Valor</Th><Th align="center">Atraso</Th><Th align="right">Ação</Th></>}
          footer={<FooterBar showing={6} total={20} label="títulos" />}
        >
          {INADIMPLENCIA.map((r, i) => <InadRow key={i} r={r} last={i === INADIMPLENCIA.length - 1} />)}
        </TableShell>
      </div>
    </div>
  </PageFrame>,
  finActions
);

const SubHead2 = ({ children }) => (
  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 12 }}>{children}</div>
);

Object.assign(window, { FinVisaoGeral, FinReceita, FinReceber, finShell, finActions, SubHead2 });
