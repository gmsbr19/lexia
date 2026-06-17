// LexIA · Comercial — Tab 3 · Campanhas (table + modals).

const cmParseValor = (s) => {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  const clean = String(s).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const v = parseFloat(clean); return isNaN(v) ? 0 : v;
};
let __cmSeq = 0;
const cmNewId = (p) => `${p}${Date.now().toString(36)}${(++__cmSeq).toString(36)}`;

// ---------- campaign row ----------
const CmCampRow = ({ c, onGasto, onLeads, onEdit }) => {
  const { useState } = React;
  const [menu, setMenu] = useState(false);
  const roiColor = c.roi == null ? 'var(--text-subtle)' : c.roi >= 0 ? 'var(--cm-pos,#2E9E5B)' : 'var(--cm-neg,#C0492F)';
  const roasColor = c.roas == null ? 'var(--text-subtle)' : c.roas >= 1 ? 'var(--cm-pos,#2E9E5B)' : 'var(--cm-neg,#C0492F)';
  return (
    <tr className="cm-row" style={{ borderTop: '1px solid var(--border)' }}>
      <td style={{ padding: '12px 14px 12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: c.plataforma === 'Google Ads' ? '#3B7DDD' : '#8B5CF6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{c.plataforma === 'Google Ads' ? 'G' : 'M'}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>{c.nome}</div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>{c.plataforma} · {c.objetivo}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '12px 14px' }}><CmStatusChip status={c.status} /></td>
      <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={12.5} weight={500} color="var(--text-muted)">{c.investimento ? cmCompact(c.investimento) : '—'}</CmNum></td>
      <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={12.5}>{cmInt(c.leads)}</CmNum></td>
      <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={12.5}>{cmInt(c.conversoes)}</CmNum></td>
      <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={12.5} color="var(--cm-pos,#2E9E5B)">{c.valorContratado ? cmCompact(c.valorContratado) : '—'}</CmNum></td>
      <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={12} weight={500} color="var(--text-muted)">{c.cpl == null ? '—' : cmCompact(c.cpl)}</CmNum></td>
      <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={12} weight={500} color="var(--text-muted)">{c.cac == null ? '—' : cmCompact(c.cac)}</CmNum></td>
      <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={13} color={roasColor}>{cmRoas(c.roas)}</CmNum></td>
      <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={12.5} color={roiColor}>{c.roi == null ? '—' : `${c.roi >= 0 ? '+' : '−'}${Math.abs(c.roi).toFixed(0)}%`}</CmNum></td>
      <td style={{ padding: '12px 16px 12px 8px', textAlign: 'right' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button className="btn btn-ghost" onClick={() => setMenu((m) => !m)} style={{ width: 28, height: 28, padding: 0 }}><Icon name="moreHorizontal" size={15} /></button>
          {menu && (<>
            <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div className="card" style={{ position: 'absolute', right: 0, top: 32, zIndex: 41, minWidth: 184, padding: 6, boxShadow: 'var(--shadow-lg)' }}>
              <button className="cm-menu-item" onClick={() => { setMenu(false); onGasto(c); }}><Icon name="coins" size={13} />Registrar gasto</button>
              <button className="cm-menu-item" onClick={() => { setMenu(false); onLeads(c); }}><Icon name="users" size={13} />Ver leads da campanha</button>
              <button className="cm-menu-item" onClick={() => { setMenu(false); onEdit(c); }}><Icon name="edit" size={13} />Editar campanha</button>
            </div>
          </>)}
        </div>
      </td>
    </tr>
  );
};

const CmCampanhas = ({ state, ref0, period, scopeLabel, onNew, onGasto, onEdit, onLeads }) => {
  const { useMemo, useState } = React;
  const [fStatus, setFStatus] = useState('todas');
  const [fPlat, setFPlat] = useState('todas');
  const stats = useMemo(() => cmCampaignStats(state.campaigns, state.leads, state.gastos, ref0, period), [state, ref0, period]);
  const rows = stats.filter((c) => (fStatus === 'todas' || c.status === fStatus) && (fPlat === 'todas' || c.plataforma === fPlat));
  const tot = rows.reduce((a, c) => ({ inv: a.inv + c.investimento, leads: a.leads + c.leads, conv: a.conv + c.conversoes, val: a.val + c.valorContratado }), { inv: 0, leads: 0, conv: 0, val: 0 });
  const totRoas = tot.inv ? tot.val / tot.inv : null;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <CmFrame pad="22px 40px 12px">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--text)' }}>Campanhas · {scopeLabel.title}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{rows.length} campanhas · {cmCompact(tot.inv)} investidos · ROAS médio {cmRoas(totRoas)}</p>
          </div>
          <button className="btn btn-primary" onClick={onNew} style={{ height: 34, fontSize: 12 }}><Icon name="plus" size={14} />Nova campanha</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <CmSegmented size="sm" value={fStatus} onChange={setFStatus} options={[{ value: 'todas', label: 'Todas' }, { value: 'ativa', label: 'Ativas' }, { value: 'pausada', label: 'Pausadas' }, { value: 'encerrada', label: 'Encerradas' }]} />
          <CmSegmented size="sm" value={fPlat} onChange={setFPlat} options={[{ value: 'todas', label: 'Plataformas' }, { value: 'Google Ads', label: 'Google' }, { value: 'Meta Ads', label: 'Meta' }]} />
        </div>
      </CmFrame>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 40px 40px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="card" style={{ padding: 0, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
              <thead>
                <tr style={{ background: 'var(--bg-soft)', position: 'sticky', top: 0, zIndex: 2 }}>
                  <CmTh>Campanha</CmTh><CmTh>Status</CmTh><CmTh align="right">Investido</CmTh><CmTh align="right">Leads</CmTh>
                  <CmTh align="right">Conv.</CmTh><CmTh align="right">Contratado</CmTh><CmTh align="right">CPL</CmTh><CmTh align="right">CAC</CmTh>
                  <CmTh align="right">ROAS</CmTh><CmTh align="right">ROI</CmTh><CmTh align="right"></CmTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => <CmCampRow key={c.id} c={c} onGasto={onGasto} onLeads={onLeads} onEdit={onEdit} />)}
                {rows.length === 0 && <tr><td colSpan={11} style={{ padding: '48px 16px' }}><CmEmpty icon="megaphone" title="Nenhuma campanha" desc="Nenhuma campanha corresponde aos filtros selecionados." /></td></tr>}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-strong)', background: 'var(--bg-soft)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Total · {rows.length}</td>
                    <td></td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={12.5} weight={500}>{cmCompact(tot.inv)}</CmNum></td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={12.5} weight={500}>{cmInt(tot.leads)}</CmNum></td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={12.5} weight={500}>{cmInt(tot.conv)}</CmNum></td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={12.5} weight={500} color="var(--cm-pos,#2E9E5B)">{cmCompact(tot.val)}</CmNum></td>
                    <td></td><td></td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}><CmNum size={13} weight={500} color={totRoas >= 1 ? 'var(--cm-pos,#2E9E5B)' : 'var(--cm-neg,#C0492F)'}>{cmRoas(totRoas)}</CmNum></td>
                    <td></td><td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- Nova / Editar campanha ----------
const CmCampanhaModal = ({ onClose, onSave, edit = null }) => {
  const { useState } = React;
  const isEdit = !!edit;
  const [plataforma, setPlataforma] = useState(edit ? edit.plataforma : 'Google Ads');
  const [nome, setNome] = useState(edit ? edit.nome : '');
  const [objetivo, setObjetivo] = useState(edit ? edit.objetivo : CM_OBJETIVOS[0]);
  const [status, setStatus] = useState(edit ? edit.status : 'ativa');
  const [area, setArea] = useState(edit ? edit.area : CM_AREAS[0]);
  const [inicio, setInicio] = useState(edit ? edit.inicio : CM_TODAY);
  const [fim, setFim] = useState(edit ? (edit.fim || '') : '');
  const [extId, setExtId] = useState(edit ? (edit.extId || '') : '');
  const valid = nome.trim();
  const half = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

  const save = () => { onSave({ ...(edit || { id: cmNewId('C') }), plataforma, nome: nome.trim(), objetivo, status, area, inicio, fim, extId: extId.trim() }); onClose(); };

  return (
    <CmModal width={560} title={isEdit ? 'Editar campanha' : 'Nova campanha'} sub={isEdit ? 'Atualize os dados da campanha.' : 'Cadastre uma campanha de Google Ads ou Meta Ads.'} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save} style={{ height: 36, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}><Icon name="check" size={14} />{isEdit ? 'Salvar' : 'Criar campanha'}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <CmField label="Plataforma">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {CM_PLATAFORMAS.map((p) => {
              const on = plataforma === p; const c = p === 'Google Ads' ? '#3B7DDD' : '#8B5CF6';
              return (
                <button key={p} onClick={() => setPlataforma(p)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', height: 44, borderRadius: 'var(--r-sm)', cursor: 'pointer', border: `1.5px solid ${on ? c : 'var(--border-strong)'}`, background: on ? c + '14' : 'var(--surface)' }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: on ? c : 'var(--bg-sunken)', color: on ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{p === 'Google Ads' ? 'G' : 'M'}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: on ? 'var(--text)' : 'var(--text-muted)' }}>{p}</span>
                </button>
              );
            })}
          </div>
        </CmField>
        <CmField label="Nome da campanha"><CmInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Trabalhista — Search SP" /></CmField>
        <div style={half}>
          <CmField label="Objetivo"><CmSelect options={CM_OBJETIVOS} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} /></CmField>
          <CmField label="Área de atuação"><CmSelect options={CM_AREAS} value={area} onChange={(e) => setArea(e.target.value)} /></CmField>
        </div>
        <CmField label="Status">
          <CmSegmented value={status} onChange={setStatus} options={[{ value: 'ativa', label: 'Ativa' }, { value: 'pausada', label: 'Pausada' }, { value: 'encerrada', label: 'Encerrada' }]} />
        </CmField>
        <div style={half}>
          <CmField label="Início"><CmInput type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></CmField>
          <CmField label="Término" hint="opcional"><CmInput type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></CmField>
        </div>
        <CmField label="ID externo" hint="opcional"><CmInput value={extId} onChange={(e) => setExtId(e.target.value)} placeholder="Ex.: gads-8841 / meta-2207" style={{ fontFamily: 'var(--font-mono)' }} /></CmField>
      </div>
    </CmModal>
  );
};

// ---------- Registrar gasto ----------
const CmGastoModal = ({ onClose, onSave, campaigns, campanha = null }) => {
  const { useState } = React;
  const [campId, setCampId] = useState(campanha ? campanha.id : (campaigns[0] && campaigns[0].id) || '');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(CM_TODAY);
  const [conta, setConta] = useState(CM_CONTAS[2]);
  const [descricao, setDescricao] = useState('');
  const valorNum = cmParseValor(valor);
  const valid = campId && valorNum > 0 && data;
  const camp = campaigns.find((c) => c.id === campId);

  const save = () => { onSave({ id: cmNewId('G'), campanhaId: campId, valor: valorNum, data, conta, descricao: descricao.trim() || `Investimento ${camp ? camp.plataforma : ''}` }); onClose(); };

  return (
    <CmModal width={540} title="Registrar gasto" sub="Lança o investimento da campanha como despesa." onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save} style={{ height: 36, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}><Icon name="check" size={14} />Registrar gasto</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <CmField label="Campanha"><CmSelect value={campId} onChange={(e) => setCampId(e.target.value)} options={campaigns.map((c) => ({ value: c.id, label: `${c.plataforma === 'Google Ads' ? '🟦' : '🟪'}  ${c.nome}` }))} /></CmField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <CmField label="Valor"><CmMoneyInput value={valor} onChange={(e) => setValor(e.target.value)} /></CmField>
          <CmField label="Data"><CmInput type="date" value={data} onChange={(e) => setData(e.target.value)} /></CmField>
        </div>
        <CmField label="Conta de origem"><CmSelect options={CM_CONTAS} value={conta} onChange={(e) => setConta(e.target.value)} /></CmField>
        <CmField label="Descrição" hint="opcional"><CmInput value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Investimento Meta Ads · junho" /></CmField>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 14px', background: 'var(--accent-soft)', border: '1px solid rgba(192,161,71,0.3)', borderRadius: 'var(--r-sm)' }}>
          <Icon name="wallet" size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Este lançamento cria uma <strong style={{ color: 'var(--text)', fontWeight: 500 }}>despesa em Financeiro</strong> (categoria Marketing) na conta selecionada — sem dupla digitação.</div>
        </div>
      </div>
    </CmModal>
  );
};

Object.assign(window, { CmCampanhas, CmCampanhaModal, CmGastoModal, cmParseValor, cmNewId });
