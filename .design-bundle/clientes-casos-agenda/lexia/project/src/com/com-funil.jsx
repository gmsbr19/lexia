// LexIA · Comercial — Tab 2 · Funil (sales funnel).

const CmFunnelChart = ({ stages, onStage }) => {
  const max = Math.max(1, stages[0].count);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {stages.map((s, i) => {
        const w = Math.max(8, (s.count / max) * 100);
        return (
          <div key={s.key}>
            <button onClick={() => onStage(s.key)} className="cm-funnel-row" style={{
              display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
              padding: '12px 14px', border: 'none', background: 'transparent', borderRadius: 10, cursor: 'pointer',
            }}>
              <div style={{ width: 96, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2, paddingLeft: 15 }}>{cmPct(s.conv, 0)} da etapa</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ height: 36, borderRadius: 8, position: 'relative', background: 'var(--bg-sunken)', overflow: 'hidden' }}>
                  <div style={{ width: `${w}%`, height: '100%', background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`, borderRadius: 8, display: 'flex', alignItems: 'center', paddingLeft: 12, minWidth: 44 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#fff', fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum"' }}>{s.count}</span>
                  </div>
                </div>
              </div>
              <div style={{ width: 110, flexShrink: 0, textAlign: 'right' }}>
                <CmNum size={13} weight={500}>{cmCompact(s.value)}</CmNum>
                <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>{i === 4 ? 'contratado' : 'estimado'}</div>
              </div>
              <Icon name="chevronRight" size={15} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
            </button>
            {i < stages.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px 0 124px', height: 18 }}>
                <span style={{ width: 1, height: '100%', background: 'var(--border-strong)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                  {stages[i].count - stages[i + 1].count > 0 ? `−${stages[i].count - stages[i + 1].count} saíram` : 'sem perdas'} → {cmPct(stages[i + 1].conv, 0)} avançaram
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const CmFunil = ({ state, ref0, period, scopeLabel, onStage, onLead }) => {
  const { useMemo } = React;
  const f = useMemo(() => cmFunnel(state.leads, ref0, period), [state.leads, ref0, period]);
  const winRate = (f.ganho + f.perdido) ? (f.ganho / (f.ganho + f.perdido)) * 100 : 0;
  const maxMotivo = Math.max(1, ...f.motivos.map((m) => m.count));

  if (f.total === 0) {
    return (
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}><CmFrame>
        <div className="card" style={{ padding: 20 }}>
          <CmEmpty icon="funnel" title="Funil vazio neste período" desc="Nenhum lead entrou no período selecionado. Cadastre leads ou ajuste o período para visualizar o funil de vendas."
            action={<button className="btn btn-primary" onClick={onLead} style={{ height: 34, fontSize: 12, marginTop: 4 }}><Icon name="userPlus" size={14} />Novo lead</button>} />
        </div>
      </CmFrame></div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      <CmFrame>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--text)' }}>Funil de vendas · {scopeLabel.title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{f.total} leads no período · {cmPct(f.stages[4].conv, 1)} de conversão ponta a ponta · clique numa etapa para ver os leads</p>
        </div>

        <div className="cm-2col" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* funnel */}
          <div className="card" style={{ padding: '16px 14px' }}>
            <div style={{ padding: '4px 8px 12px' }}><CmCardTitle title="Etapas do funil" sub="Quantidade e valor estimado por etapa" /></div>
            <CmFunnelChart stages={f.stages} onStage={onStage} />
          </div>

          {/* side panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* won / lost */}
            <div className="card" style={{ padding: '18px 22px' }}>
              <CmCardTitle title="Ganhos vs. perdas" sub="Desfecho dos leads encerrados no período" />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 25, fontWeight: 500, color: 'var(--cm-pos,#2E9E5B)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.025em' }}>{cmPct(winRate, 0)}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>taxa de ganho · {f.ganho} ganhos / {f.perdido} perdas</span>
              </div>
              <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--bg-sunken)', marginBottom: 14 }}>
                {f.ganho > 0 && <div style={{ width: `${(f.ganho / (f.ganho + f.perdido)) * 100}%`, background: '#2E9E5B' }} />}
                {f.perdido > 0 && <div style={{ width: `${(f.perdido / (f.ganho + f.perdido)) * 100}%`, background: '#C0492F', opacity: 0.85 }} />}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button className="cm-rowlink" onClick={() => onStage('ganho')} style={{ textAlign: 'left', border: '1px solid var(--border)', background: 'var(--bg-soft)', borderRadius: 10, padding: '11px 13px', cursor: 'pointer' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2E9E5B' }} />Ganhos</div>
                  <div style={{ fontSize: 19, fontWeight: 500, color: 'var(--text)', marginTop: 4 }}>{f.ganho}</div>
                  <CmNum size={12} weight={500} color="var(--cm-pos,#2E9E5B)">{cmCompact(f.ganhoValor)}</CmNum>
                </button>
                <button className="cm-rowlink" onClick={() => onStage('perdido')} style={{ textAlign: 'left', border: '1px solid var(--border)', background: 'var(--bg-soft)', borderRadius: 10, padding: '11px 13px', cursor: 'pointer' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#C0492F' }} />Perdas</div>
                  <div style={{ fontSize: 19, fontWeight: 500, color: 'var(--text)', marginTop: 4 }}>{f.perdido}</div>
                  <CmNum size={12} weight={500} color="var(--text-muted)">{cmCompact(f.perdidoValor)} perdidos</CmNum>
                </button>
              </div>
            </div>

            {/* gargalos */}
            <div className="card" style={{ padding: '18px 22px' }}>
              <CmCardTitle title="Maiores gargalos" sub="Transições com menor taxa de avanço" />
              {f.gargalos.length === 0 ? <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-subtle)' }}>Sem gargalos relevantes. 🎉</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {f.gargalos.slice(0, 3).map((g, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, background: i === 0 ? 'rgba(192,73,47,0.12)' : 'var(--bg-sunken)', color: i === 0 ? '#C0492F' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{g.from} → {g.to}</div>
                        <div style={{ height: 5, borderRadius: 4, background: 'var(--bg-sunken)', marginTop: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${g.conv}%`, height: '100%', background: g.conv < 50 ? '#C0492F' : 'var(--accent)', borderRadius: 4, opacity: 0.9 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <CmNum size={13} color={g.conv < 50 ? 'var(--cm-neg,#C0492F)' : 'var(--text)'}>{cmPct(g.conv, 0)}</CmNum>
                        <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>−{g.drop} leads</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* motivos de perda */}
            <div className="card" style={{ padding: '18px 22px' }}>
              <CmCardTitle title="Motivos de perda" sub={`${f.perdido} leads perdidos no período`} />
              {f.motivos.length === 0 ? <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-subtle)' }}>Nenhuma perda registrada.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {f.motivos.map((m) => (
                    <div key={m.motivo} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.motivo}</span>
                      <div style={{ width: 90, height: 6, borderRadius: 4, background: 'var(--bg-sunken)', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ width: `${(m.count / maxMotivo) * 100}%`, height: '100%', background: '#C0492F', opacity: 0.8, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', width: 18, textAlign: 'right', flexShrink: 0 }}>{m.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CmFrame>
    </div>
  );
};

Object.assign(window, { CmFunil, CmFunnelChart });
