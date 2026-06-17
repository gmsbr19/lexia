// LexIA · Contencioso — modais de prazo (lançar manualmente OU gerar a partir de intimação)
// e modal de triagem de publicação. Constroem sobre FxModal/Fx* + proc-data.

const PROC_PECAS = ['Contestação', 'Réplica', 'Manifestação', 'Manifestação sobre embargos', 'Manifestação sobre informações', 'Especificação de provas', 'Recurso de apelação', 'Agravo de instrumento',
  'Embargos de declaração', 'Razões finais / Memoriais', 'Contrarrazões', 'Cumprimento de sentença', 'Petição', 'Últimas declarações'];

// Modal único: lança prazo manual ou gera prazo a partir de um andamento (preset).
const ProcPrazoModal = ({ procStore, preset = {}, onClose, onSave }) => {
  const { toast } = useCrmToast();
  const fromMov = preset.movId || null;
  const [processoId, setProcessoId] = crmUseState(preset.processoId || (procStore.processos[0] && procStore.processos[0].id));
  const [peca, setPeca] = crmUseState(preset.peca || 'Manifestação');
  const [dias, setDias] = crmUseState(preset.dias || 15);
  const [base, setBase] = crmUseState(preset.baseISO || PROC_TODAY);
  const [margem, setMargem] = crmUseState(3);
  const [responsavel, setResponsavel] = crmUseState(preset.responsavel || 'leonardo');

  const fatal = procAddDU(base, Number(dias) || 0);
  const interno = procSubDU(fatal, Number(margem) || 0);
  const duFatal = procDU(fatal);
  const proc = procById(procStore, processoId);

  const save = () => {
    const prazo = {
      id: 'PZ' + Math.random().toString(36).slice(2, 7).toUpperCase(),
      processoId, peca, tipoPeca: peca.split(' ')[0], fatal, interno, responsavel,
      status: 'pendente', origemMov: fromMov, obs: '',
    };
    onSave(prazo, fromMov);
    toast(fromMov ? 'Prazo gerado a partir da intimação' : 'Prazo lançado na agenda', { icon: 'flag', tone: 'gold' });
    onClose();
  };

  return (
    <FxModal title={fromMov ? 'Gerar prazo a partir da intimação' : 'Lançar novo prazo'}
      sub={fromMov ? 'Confira a contagem antes de confirmar — o ato de origem será marcado como relevante.' : 'Contagem em dias úteis (CPC/2015), descontando feriados forenses.'}
      onClose={onClose} width={560}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save}><Icon name="flag" size={14} />{fromMov ? 'Gerar prazo' : 'Lançar prazo'}</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <FxLabel>Processo</FxLabel>
          <FxSelect options={procStore.processos.map((p) => `${p.numero} · ${p.clienteNome}`)}
            value={proc ? `${proc.numero} · ${proc.clienteNome}` : ''}
            onChange={(e) => { const n = e.target.value.split(' · ')[0]; const f = procStore.processos.find((x) => x.numero === n); setProcessoId(f ? f.id : processoId); }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
          <div><FxLabel>Peça / providência</FxLabel><FxSelect options={PROC_PECAS.includes(peca) ? PROC_PECAS : [peca, ...PROC_PECAS]} value={peca} onChange={(e) => setPeca(e.target.value)} /></div>
          <div><FxLabel>Responsável</FxLabel><FxSelect options={CRM_USERS.filter((u) => u.ativo).map((u) => u.nome)} value={crmUser(responsavel).nome} onChange={(e) => setResponsavel((CRM_USERS.find((u) => u.nome === e.target.value) || {}).id || responsavel)} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div><FxLabel hint="data da intimação">Data-base</FxLabel><FxInput type="date" value={base} onChange={(e) => setBase(e.target.value)} /></div>
          <div><FxLabel hint="dias úteis">Prazo legal</FxLabel><FxInput type="number" min="1" value={dias} onChange={(e) => setDias(e.target.value)} /></div>
          <div><FxLabel hint="du antes do fatal">Margem interna</FxLabel><FxInput type="number" min="0" value={margem} onChange={(e) => setMargem(e.target.value)} /></div>
        </div>

        {/* preview da contagem */}
        <div className="card" style={{ background: 'var(--bg-soft)', padding: 14, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prazo interno</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{fxDate(interno)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>margem de segurança</div>
          </div>
          <Icon name="arrowRight" size={16} style={{ color: 'var(--text-subtle)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--crit)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prazo fatal</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{fxDate(fatal)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>limite legal</div>
          </div>
          <ProcSemaforo du={duFatal} big />
        </div>
      </div>
    </FxModal>
  );
};

// Modal de triagem rápida de uma publicação (relevante × cartorário)
const ProcTriagemModal = ({ andamento, procStore, onClose, onTriar, onGerar }) => {
  const proc = andamento.processoId ? procById(procStore, andamento.processoId) : null;
  const m = PROC_MOV[andamento.tipo] || PROC_MOV.cartorario;
  return (
    <FxModal title="Triagem de publicação" sub={proc ? `${proc.numero} · ${proc.clienteNome}` : 'Publicação ainda não vinculada a um processo'} onClose={onClose} width={560}
      footer={<>
        <button className="btn btn-ghost" onClick={() => { onTriar(andamento.id, 'cartorario'); onClose(); }}><Icon name="circleDot" size={14} />Marcar cartorário</button>
        <button className="btn btn-primary" disabled={!proc} onClick={() => { onGerar(andamento); onClose(); }}><Icon name="flag" size={14} />Gerar prazo</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ProcMovIcon tipo={andamento.tipo} active />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{andamento.titulo}</div>
            <div style={{ fontSize: 12, color: 'var(--text-subtle)', display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
              <ProcFonte fonte={andamento.fonte} /> {andamento.orgao} · {fxDate(andamento.data)}
            </div>
          </div>
        </div>
        <div className="card" style={{ background: 'var(--bg-soft)', padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>{andamento.descricao}</div>
        {andamento.prazoSugerido ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 13 }}>
            <Icon name="sparkles" size={16} />
            <span>LexIA sugere: <strong>{andamento.prazoSugerido.peca}</strong> · prazo de {andamento.prazoSugerido.dias} dias úteis.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-sunken)', color: 'var(--text-muted)', fontSize: 13 }}>
            <Icon name="circleDot" size={16} /><span>Sem prazo aparente — provável ato meramente cartorário.</span>
          </div>
        )}
        {!proc && <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Vincule a publicação a um processo para gerar prazo.</div>}
      </div>
    </FxModal>
  );
};

Object.assign(window, { PROC_PECAS, ProcPrazoModal, ProcTriagemModal });
