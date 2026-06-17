// LexIA · Comercial — Tab 4 modals: novo/editar lead, converter, perdido, importar.

// ---------- Novo / Editar lead ----------
const CmLeadModal = ({ onClose, onSave, campaigns, edit = null }) => {
  const { useState } = React;
  const isEdit = !!edit;
  const [nome, setNome] = useState(edit ? edit.nome : '');
  const [contato, setContato] = useState(edit ? edit.contato : '');
  const [origem, setOrigem] = useState(edit ? edit.origem : 'Google Ads');
  const [campId, setCampId] = useState(edit ? (edit.campanhaId || '') : '');
  const [area, setArea] = useState(edit ? edit.area : CM_AREAS[0]);
  const [etapa, setEtapa] = useState(edit ? (edit.etapa === 'ganho' || edit.etapa === 'perdido' ? edit.etapa : edit.etapa) : 'novo');
  const [valor, setValor] = useState(edit ? String(edit.valorEstimado) : '');
  const [data, setData] = useState(edit ? edit.dataEntrada : CM_TODAY);

  const isPaid = origem === 'Google Ads' || origem === 'Meta Ads';
  const campOpts = campaigns.filter((c) => c.plataforma === origem);
  const valorNum = cmParseValor(valor);
  const valid = nome.trim() && valorNum >= 0;
  const half = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

  const setOrig = (o) => { setOrigem(o); if (o !== 'Google Ads' && o !== 'Meta Ads') setCampId(''); else if (!campaigns.some((c) => c.id === campId && c.plataforma === o)) setCampId(''); };

  const save = () => {
    const stageI = etapa === 'perdido' ? Math.min(3, (edit ? edit.reach : 1)) : CM_STAGE_MAP[etapa].i;
    onSave({
      ...(edit || { id: cmNewId('L'), dataConv: null, cliente: null, caso: null, valorContratado: null, motivoPerda: null }),
      nome: nome.trim(), contato: contato.trim(), origem, campanhaId: isPaid ? (campId || null) : null,
      area, etapa, reach: etapa === 'ganho' ? 4 : stageI, valorEstimado: valorNum, dataEntrada: data,
    });
    onClose();
  };

  return (
    <CmModal width={560} title={isEdit ? 'Editar lead' : 'Novo lead'} sub={isEdit ? 'Atualize os dados do lead.' : 'Cadastre um lead manualmente no funil.'} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save} style={{ height: 36, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}><Icon name="check" size={14} />{isEdit ? 'Salvar' : 'Criar lead'}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <div style={half}>
          <CmField label="Nome / empresa"><CmInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Mariana Costa" /></CmField>
          <CmField label="Contato"><CmInput value={contato} onChange={(e) => setContato(e.target.value)} placeholder="(11) 90000-0000" style={{ fontFamily: 'var(--font-mono)' }} /></CmField>
        </div>
        <div style={half}>
          <CmField label="Origem"><CmSelect options={CM_ORIGENS} value={origem} onChange={(e) => setOrig(e.target.value)} /></CmField>
          <CmField label="Campanha" hint={isPaid ? '' : 'n/a'}><CmSelect value={campId} onChange={(e) => setCampId(e.target.value)} options={[{ value: '', label: isPaid ? 'Selecione' : '—' }, ...campOpts.map((c) => ({ value: c.id, label: c.nome }))]} disabled={!isPaid} /></CmField>
        </div>
        <div style={half}>
          <CmField label="Área de interesse"><CmSelect options={CM_AREAS} value={area} onChange={(e) => setArea(e.target.value)} /></CmField>
          <CmField label="Valor estimado"><CmMoneyInput value={valor} onChange={(e) => setValor(e.target.value)} /></CmField>
        </div>
        <div style={half}>
          <CmField label="Etapa"><CmSelect value={etapa} onChange={(e) => setEtapa(e.target.value)} options={[...CM_STAGES.map((s) => ({ value: s.key, label: s.label })), { value: 'perdido', label: 'Perdido' }]} /></CmField>
          <CmField label="Data de entrada"><CmInput type="date" value={data} onChange={(e) => setData(e.target.value)} /></CmField>
        </div>
        {etapa === 'ganho' && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', padding: '10px 13px', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>Para registrar cliente, caso e honorário contratado, use <strong style={{ color: 'var(--text)' }}>Converter</strong> na lista.</div>}
      </div>
    </CmModal>
  );
};

// ---------- Converter lead ----------
const CmConverterModal = ({ lead, onClose, onConvert }) => {
  const { useState } = React;
  const [cliente, setCliente] = useState(lead.cliente || lead.nome);
  const [caso, setCaso] = useState(lead.caso || lead.area);
  const [valor, setValor] = useState(String(lead.valorContratado || lead.valorEstimado));
  const [data, setData] = useState(lead.dataConv || CM_TODAY);
  const [tipoHon, setTipoHon] = useState('À vista');
  const valorNum = cmParseValor(valor);
  const valid = cliente.trim() && valorNum > 0;
  return (
    <CmModal width={540} title="Converter lead" sub={`${lead.nome} · ${lead.origem}`} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-gold" disabled={!valid} onClick={() => { onConvert(lead.id, { cliente: cliente.trim(), caso: caso.trim(), valorContratado: valorNum, dataConv: data }); onClose(); }} style={{ height: 36, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}><Icon name="handshake" size={14} />Converter e vincular</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', background: 'rgba(46,158,91,0.08)', border: '1px solid rgba(46,158,91,0.26)', borderRadius: 'var(--r-sm)' }}>
          <Icon name="sparkles" size={16} style={{ color: '#2E9E5B', flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Marca o lead como <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Ganho</strong> e cria o vínculo com cliente, caso e honorário no Financeiro.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <CmField label="Cliente"><CmInput value={cliente} onChange={(e) => setCliente(e.target.value)} /></CmField>
          <CmField label="Caso vinculado"><CmInput value={caso} onChange={(e) => setCaso(e.target.value)} /></CmField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <CmField label="Honorário contratado"><CmMoneyInput value={valor} onChange={(e) => setValor(e.target.value)} /></CmField>
          <CmField label="Tipo de honorário"><CmSelect options={['À vista', 'Parcelado', 'Recorrente', 'Êxito']} value={tipoHon} onChange={(e) => setTipoHon(e.target.value)} /></CmField>
        </div>
        <CmField label="Data da conversão"><CmInput type="date" value={data} onChange={(e) => setData(e.target.value)} /></CmField>
      </div>
    </CmModal>
  );
};

// ---------- Marcar como perdido ----------
const CmPerdidoModal = ({ lead, onClose, onLose }) => {
  const { useState } = React;
  const [motivo, setMotivo] = useState(lead.motivoPerda || CM_MOTIVOS[0]);
  const [obs, setObs] = useState('');
  return (
    <CmModal width={500} title="Marcar como perdido" sub={lead.nome} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { onLose(lead.id, motivo); onClose(); }} style={{ height: 36, background: 'var(--cm-neg,#C0492F)', color: '#fff' }}><Icon name="x" size={14} />Marcar perdido</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <CmField label="Motivo da perda">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {CM_MOTIVOS.map((m) => {
              const on = motivo === m;
              return (
                <button key={m} onClick={() => setMotivo(m)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px', textAlign: 'left', borderRadius: 'var(--r-sm)', cursor: 'pointer', border: `1px solid ${on ? 'var(--cm-neg,#C0492F)' : 'var(--border-strong)'}`, background: on ? 'rgba(192,73,47,0.07)' : 'var(--surface)' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, border: `2px solid ${on ? 'var(--cm-neg,#C0492F)' : 'var(--border-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--cm-neg,#C0492F)' }} />}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: on ? 600 : 400 }}>{m}</span>
                </button>
              );
            })}
          </div>
        </CmField>
        <CmField label="Observação" hint="opcional"><CmInput value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Detalhe o contexto da perda..." /></CmField>
      </div>
    </CmModal>
  );
};

// ---------- Importar do Genions ----------
const CmImportarModal = ({ onClose, onImport, campaigns }) => {
  const { useState } = React;
  const [stage, setStage] = useState('pick');   // pick | preview
  const [busy, setBusy] = useState(false);
  const preview = { novos: 6, atualizados: 3, total: 9 };

  const buildImported = () => {
    const rnd = cmRng(Date.now() & 0xffffff);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const out = [];
    for (let i = 0; i < preview.novos; i++) {
      const isCo = rnd() < 0.4;
      const nome = isCo ? pick(CM_EMPRESAS) : `${pick(CM_FIRST)} ${pick(CM_LAST)}`;
      out.push({
        id: cmNewId('L'), nome, contato: `(11) 9${Math.floor(1000 + rnd() * 8999)}-${Math.floor(1000 + rnd() * 8999)}`,
        origem: rnd() < 0.5 ? 'Indicação' : 'Orgânico', campanhaId: null, area: pick(CM_AREAS),
        etapa: 'novo', reach: 0, valorEstimado: Math.round((9000 + rnd() * 40000) / 500) * 500,
        dataEntrada: CM_TODAY, dataConv: null, cliente: null, caso: null, valorContratado: null, motivoPerda: null,
      });
    }
    return out;
  };

  const run = () => { setBusy(true); setTimeout(() => { setBusy(false); setStage('preview'); }, 700); };

  return (
    <CmModal width={520} title="Importar do Genions" sub="Sincronize leads a partir de um arquivo CSV exportado do Genions." onClose={onClose}
      footer={stage === 'pick'
        ? <><button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
            <button className="btn btn-primary" onClick={run} disabled={busy} style={{ height: 36 }}>{busy ? <><Icon name="refreshCw" size={14} className="pulse" />Lendo arquivo...</> : <><Icon name="upload" size={14} />Analisar CSV</>}</button></>
        : <><button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => { onImport(buildImported(), { data: CM_TODAY, novos: preview.novos, atualizados: preview.atualizados }); onClose(); }} style={{ height: 36 }}><Icon name="check" size={14} />Confirmar importação</button></>}>
      {stage === 'pick' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 20px', border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--r-md)', background: 'var(--bg-soft)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="fileSpreadsheet" size={22} /></div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>genions-leads-junho.csv</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>Arquivo de exemplo · arraste outro para substituir</div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>O Genions exporta nome, contato, origem e etapa. Leads já existentes (mesmo contato) são <strong style={{ color: 'var(--text)' }}>atualizados</strong>; novos são adicionados ao funil em <strong style={{ color: 'var(--text)' }}>Novo</strong>.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', background: 'rgba(46,158,91,0.08)', border: '1px solid rgba(46,158,91,0.26)', borderRadius: 'var(--r-sm)' }}>
            <Icon name="checkCircle" size={16} style={{ color: '#2E9E5B', flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, color: 'var(--text)' }}><strong style={{ fontWeight: 600 }}>{preview.total} registros</strong> lidos com sucesso, prontos para importar.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 15px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Novos leads</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{preview.novos}</div>
            </div>
            <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 15px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Atualizados</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{preview.atualizados}</div>
            </div>
          </div>
        </div>
      )}
    </CmModal>
  );
};

Object.assign(window, { CmLeadModal, CmConverterModal, CmPerdidoModal, CmImportarModal });
