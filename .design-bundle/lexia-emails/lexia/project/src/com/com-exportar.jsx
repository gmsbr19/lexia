// LexIA · Comercial — Tab 5 · Exportar (downloads + Relatório com IA).

const cmBuildPrompt = (payload) => {
  const k = payload.kpis;
  return `Você é um analista de marketing jurídico sênior. Gere um RELATÓRIO EXECUTIVO de marketing e captação para os sócios de um escritório de advocacia, em português do Brasil, a partir dos dados do período "${payload.periodo.label} (${payload.periodo.sub})" que estão no CSV anexado.

Contexto do período (resumo):
- Leads: ${cmInt(k.leads)} · Conversões: ${cmInt(k.conversoes)} · Taxa de conversão: ${cmPct(k.taxaConv)}
- Investimento em anúncios: ${cmMoney(k.investimento)} · Valor contratado: ${cmMoney(k.valorContratado)}
- ROAS: ${cmRoas(k.roas)} · ROI: ${k.roi == null ? '—' : cmPct(k.roi, 0)} · CAC: ${k.cac == null ? '—' : cmMoney(k.cac)} · CPL: ${k.cpl == null ? '—' : cmMoney(k.cpl)} · Ticket médio: ${k.ticket == null ? '—' : cmMoney(k.ticket)}

Estruture o relatório com:
1. Veredito em uma frase: estamos ganhando dinheiro com anúncios? (sim/não e por quê)
2. Destaques do período (3 a 5 bullets com números)
3. Desempenho por canal (Google Ads, Meta Ads, Orgânico/Indicação) — onde investir mais e onde cortar
4. Saúde do funil — principais gargalos e taxa de ganho, com hipóteses
5. Campanhas: melhores e piores por ROAS/ROI, com recomendação (escalar, otimizar ou pausar)
6. 3 ações priorizadas para o próximo período, com impacto esperado

Seja direto, orientado a decisão e use os números do CSV. Evite jargão. Formate com títulos e bullets.`;
};

const CmExportItem = ({ icon, label, desc }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0' }}>
    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-sunken)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={15} /></div>
    <div><div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</div><div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{desc}</div></div>
  </div>
);

const CmExportar = ({ state, ref0, period, scopeLabel }) => {
  const { useMemo, useState, useRef } = React;
  const payload = useMemo(() => cmPeriodPayload(state, ref0, period), [state, ref0, period]);
  const prompt = useMemo(() => cmBuildPrompt(payload), [payload]);
  const [copied, setCopied] = useState(false);
  const taRef = useRef(null);

  const copy = () => {
    const t = prompt;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(() => {});
    else if (taRef.current) { taRef.current.select(); document.execCommand('copy'); }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  const dlCSV = () => cmDownload(`lexia-comercial-${scopeLabel.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${CM_TODAY}.csv`, cmExportCSV(state, ref0, period), 'text/csv');
  const dlJSON = () => cmDownload(`lexia-comercial-${scopeLabel.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${CM_TODAY}.json`, cmExportJSON(state, ref0, period), 'application/json');

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      <CmFrame>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--text)' }}>Exportar · {scopeLabel.title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Baixe os dados do período ou gere um relatório executivo com IA.</p>
        </div>

        <div className="cm-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 20, alignItems: 'start' }}>
          {/* downloads */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <CmCardTitle title="Baixar dados do período" sub={`Tudo que está em ${scopeLabel.title} · ${scopeLabel.sub}`} />
            <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '4px 0', margin: '4px 0 18px' }}>
              <CmExportItem icon="barChart" label="KPIs" desc="Leads, ROAS, ROI, CAC, CPL, ticket médio…" />
              <CmExportItem icon="funnel" label="Funil" desc={`${payload.funil.stages.length} etapas · conversão por estágio`} />
              <CmExportItem icon="megaphone" label="Campanhas" desc={`${payload.campanhas.length} campanhas com métricas`} />
              <CmExportItem icon="pieChart" label="Canais" desc="Google Ads · Meta Ads · Orgânico/Indicação" />
              <CmExportItem icon="users" label="Lista de leads" desc={`${payload.leads.length} leads do período`} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={dlCSV} style={{ flex: 1, height: 40 }}><Icon name="fileSpreadsheet" size={15} />Baixar CSV</button>
              <button className="btn btn-secondary" onClick={dlJSON} style={{ flex: 1, height: 40 }}><Icon name="braces" size={15} />Baixar JSON</button>
            </div>
          </div>

          {/* AI report */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="sparkles" size={16} strokeWidth={1.9} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Relatório com IA</div>
                <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Copie o prompt e cole no Claude com o CSV anexado</div>
              </div>
              <button className="btn btn-gold" onClick={copy} style={{ height: 32, fontSize: 12 }}>
                <Icon name={copied ? 'check' : 'copy'} size={13} />{copied ? 'Copiado!' : 'Copiar prompt'}
              </button>
            </div>
            <textarea ref={taRef} readOnly value={prompt} className="textarea" style={{ width: '100%', height: 290, resize: 'none', fontSize: 12, lineHeight: 1.55, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg-soft)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
              <Icon name="paperclip" size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              Dica: anexe o <strong style={{ color: 'var(--text)', fontWeight: 500 }}>CSV baixado ao lado</strong> antes de enviar — o relatório fica muito mais preciso.
            </div>
          </div>
        </div>
      </CmFrame>
    </div>
  );
};

Object.assign(window, { CmExportar, cmBuildPrompt });
