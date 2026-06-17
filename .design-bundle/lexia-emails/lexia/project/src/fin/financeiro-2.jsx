// Financeiro — tabs 4–6: Custos & DRE, Casos sem fee, Importação.

// ============ Tab: Custos & DRE ============
const DreRow = ({ r }) => {
  const isResult = r.kind === 'resultado';
  const isReceita = r.kind === 'receita';
  const isPro = r.kind === 'prolabore';
  return (
    <tr style={{
      borderTop: isResult ? '2px solid var(--border-strong)' : '1px solid var(--border)',
      background: isResult ? 'var(--bg-soft)' : isPro ? 'var(--accent-soft)' : 'transparent',
    }}>
      <td style={{ padding: isResult ? '16px' : '13px 16px' }}>
        <div style={{ fontSize: isResult || isReceita ? 13.5 : 13, fontWeight: isResult ? 700 : isReceita ? 600 : 500, color: 'var(--text)', letterSpacing: '-0.01em' }}>{r.label}</div>
        {r.detail && <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>{r.detail}</div>}
      </td>
      <td style={{ padding: isResult ? '16px' : '13px 16px', textAlign: 'right' }}>
        <MoneyValue value={r.value} size={isResult ? 16 : 13.5} weight={isResult ? 700 : 600} colorSign={r.value < 0 || isResult} />
      </td>
    </tr>
  );
};

const CostBar = ({ c, max }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <span style={{ width: 8, height: 8, borderRadius: 2, background: c.cor, flexShrink: 0 }} />
    <span style={{ fontSize: 12, color: 'var(--text)', width: 170, flexShrink: 0 }}>{c.cat}</span>
    <div style={{ flex: 1, height: 8, background: 'var(--bg-sunken)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${(c.value / max) * 100}%`, height: '100%', background: c.cor, opacity: 0.85, borderRadius: 4 }} />
    </div>
    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum"', width: 78, textAlign: 'right' }}>{brlCompact(c.value)}</span>
  </div>
);

const FinCustos = () => {
  const maxCost = Math.max(...COSTS.map(c => c.value));
  return finShell('custos',
    <PageFrame>
      <PageHeader title="Custos & DRE" sub="Demonstração de resultado · março de 2026"
        right={<div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Excluir anomalias</span>
          <div style={{ width: 34, height: 20, borderRadius: 999, background: 'var(--accent)', position: 'relative', cursor: 'pointer' }}>
            <span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
          </div>
        </div>} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Resultado do exercício</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>{DRE.map((r, i) => <DreRow key={i} r={r} />)}</tbody>
          </table>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <CardTitle title="Ponto de equilíbrio" sub="Receita realizada vs custo fixo mensal" />
            <BreakEvenBar />
          </div>
          <div className="card" style={{ padding: '18px 20px' }}>
            <CardTitle title="Custos por categoria" sub="Total R$ 115,4 mil no mês" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {COSTS.map((c, i) => <CostBar key={i} c={c} max={maxCost} />)}
            </div>
          </div>
        </div>
      </div>
    </PageFrame>,
    finActions
  );
};

// ============ Tab: Casos sem fee ============
const SemFeeRow = ({ r }) => (
  <tr style={{ borderTop: '1px solid var(--border)' }}>
    <Td><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{r.caso}</span></Td>
    <Td muted>{r.cliente}</Td>
    <Td><StatusPill label={r.tipo} tone="neutro" dot={false} /></Td>
    <Td muted>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={r.resp} />{r.resp}</div>
    </Td>
    <Td subtle>{r.ultima}</Td>
    <Td align="right">
      <button className="btn btn-secondary" style={{ height: 28, fontSize: 12, padding: '0 10px', opacity: 0.5, cursor: 'not-allowed' }} disabled>
        <Icon name="receipt" size={12} />Lançar honorário
      </button>
    </Td>
  </tr>
);

const FinCasosSemFee = () => finShell('semfee',
  <PageFrame>
    <PageHeader title="Casos sem fee"
      sub="Casos ativos sem honorário lançado — receita potencial não capturada"
      right={<div className="card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="alertTriangle" size={16} style={{ color: '#D98A2B' }} />
        <div><div style={{ fontSize: 19, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>5</div><div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>casos sem fee</div></div>
      </div>} />
    <TableShell
      head={<><Th>Caso</Th><Th>Cliente</Th><Th>Tipo</Th><Th>Responsável</Th><Th>Última mov.</Th><Th align="right" /></>}
      footer={<FooterBar showing={5} total={5} label="casos" />}
    >
      {CASOS_SEM_FEE.map((r, i) => <SemFeeRow key={i} r={r} />)}
    </TableShell>
  </PageFrame>,
  finActions
);

// ============ Tab: Importação ============
const ImportSummaryCard = ({ icon, label, value, sub, tone }) => (
  <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: tone === 'flag' ? 'rgba(217,138,43,0.14)' : 'var(--bg-sunken)', color: tone === 'flag' ? '#C77E1F' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={15} strokeWidth={1.8} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 23, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.025em', fontFeatureSettings: '"tnum"' }}>{value}</div>
    <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{sub}</span>
  </div>
);

const FlaggedRow = ({ r }) => (
  <tr style={{ borderTop: '1px solid var(--border)', opacity: 0.78 }}>
    <Td>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="alertTriangle" size={14} style={{ color: '#C77E1F', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{r.desc}</span>
      </div>
    </Td>
    <Td subtle>{new Date(r.data).toLocaleDateString('pt-BR')}</Td>
    <Td muted>{r.conta}</Td>
    <Td><span style={{ fontSize: 12, color: '#C77E1F' }}>{r.motivo}</span></Td>
    <Td align="right"><MoneyValue value={r.valor} size={12.5} colorSign /></Td>
    <Td align="right">
      <div style={{ display: 'inline-flex', gap: 4 }}>
        <button className="btn btn-ghost" style={{ height: 26, fontSize: 11, padding: '0 8px' }}>Ignorar</button>
        <button className="btn btn-secondary" style={{ height: 26, fontSize: 11, padding: '0 8px' }}>Revisar</button>
      </div>
    </Td>
  </tr>
);

const FinImportacao = () => finShell('import',
  <PageFrame>
    <PageHeader title="Importação"
      sub="Última sincronização do backup contábil"
      right={<button className="btn btn-primary" style={{ height: 34, fontSize: 12 }}><Icon name="refreshCw" size={13} />Reimportar backup</button>} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
      <ImportSummaryCard icon="fileCheck" label="Lançamentos" value="2.847" sub="Importados com sucesso" />
      <ImportSummaryCard icon="users" label="Clientes" value="142" sub="Conciliados" />
      <ImportSummaryCard icon="alertTriangle" label="Sinalizados" value="4" sub="Requerem revisão" tone="flag" />
      <ImportSummaryCard icon="clock" label="Última importação" value="há 2 h" sub="31/03/2026 · 14:20" />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em' }}>Lançamentos sinalizados</div>
        <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>Excluídos dos cálculos até revisão manual</div>
      </div>
    </div>
    <TableShell
      head={<><Th>Lançamento</Th><Th>Data</Th><Th>Conta</Th><Th>Motivo</Th><Th align="right">Valor</Th><Th align="right" /></>}
      footer={<FooterBar showing={4} total={4} label="sinalizados" />}
    >
      {FLAGGED.map((r, i) => <FlaggedRow key={i} r={r} />)}
    </TableShell>
  </PageFrame>,
  finActions
);

Object.assign(window, { FinCustos, FinCasosSemFee, FinImportacao });
