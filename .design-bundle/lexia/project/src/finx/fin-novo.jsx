// LexIA · Financeiro — "Novo lançamento" modal + Série (parcelas) modal.
// Builds one or more lançamentos: única, recorrente mensal (X meses) ou parcelado (X vezes).

const fxParseValor = (s) => {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  const clean = String(s).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const v = parseFloat(clean);
  return isNaN(v) ? 0 : v;
};

let __fxNewSeq = 0;
const fxNewId = () => `N${Date.now().toString(36)}${(++__fxNewSeq).toString(36)}`;

const FxRadioRow = ({ active, onClick, icon, title, desc }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
    padding: '11px 13px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
    background: active ? 'var(--accent-soft)' : 'var(--surface)',
  }}>
    <div style={{
      width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'var(--accent)' : 'var(--bg-sunken)', color: active ? '#fff' : 'var(--text-muted)',
    }}><Icon name={icon} size={15} /></div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginTop: 1 }}>{desc}</div>
    </div>
    <div style={{
      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
      border: `2px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}</div>
  </button>
);

// small field wrapper for consistent rhythm
const FxField = ({ label, hint, children }) => (
  <div>{label && <FxLabel hint={hint}>{label}</FxLabel>}{children}</div>
);

const FxNovoModal = ({ onClose, onCreate, initialDir = 'in', edit = null }) => {
  const { useState, useMemo } = React;
  const isEdit = !!edit;
  const [dir, setDir] = useState(edit ? edit.dir : initialDir);
  const [desc, setDesc] = useState(edit ? edit.desc : '');
  const [cat, setCat] = useState(edit ? edit.cat : FX_CATS[initialDir][0]);
  const [party, setParty] = useState(edit ? edit.party : '');
  const [caso, setCaso] = useState(edit ? (edit.caso || '') : '');
  const [valor, setValor] = useState(edit ? String(edit.valor) : '');
  const [venc, setVenc] = useState(edit ? edit.venc : '2026-06-15');
  const [modo, setModo] = useState('unica');       // unica | mensal | parcelado
  const [vezes, setVezes] = useState(6);
  const [pago, setPago] = useState(edit ? edit.pago : false);
  const [pagoData, setPagoData] = useState(edit && edit.pagoData ? edit.pagoData : '2026-06-09');
  const [obs, setObs] = useState(edit ? edit.obs : '');
  const [anexo, setAnexo] = useState(edit && edit.anexo ? edit.anexo : '');

  const setDirSafe = (d) => { setDir(d); if (!FX_CATS[d].includes(cat)) setCat(FX_CATS[d][0]); };

  const valorNum = fxParseValor(valor);
  const preview = useMemo(() => {
    if (isEdit || modo === 'unica') return { count: 1, each: valorNum, total: valorNum };
    if (modo === 'mensal') return { count: vezes, each: valorNum, total: valorNum * vezes };
    const each = Math.round(valorNum / vezes / 100) * 100;
    return { count: vezes, each, total: each * vezes };
  }, [isEdit, modo, vezes, valorNum]);

  const valid = desc.trim() && valorNum > 0 && venc;

  const build = () => {
    if (isEdit) {
      return [{ ...edit, dir, desc: desc.trim(), cat, party: party.trim(), caso: dir === 'in' ? (caso.trim() || null) : null, valor: valorNum, venc, pago, pagoData: pago ? pagoData : null, obs, anexo }];
    }
    const base = { dir, cat, party: party.trim(), caso: dir === 'in' ? (caso.trim() || null) : null, obs, anexo };
    if (modo === 'unica') {
      return [{ id: fxNewId(), ...base, desc: desc.trim(), valor: valorNum, venc, pago, pagoData: pago ? pagoData : null, grupo: null, serie: null }];
    }
    const out = [];
    const n = vezes;
    const serie = fxNewId();
    for (let i = 0; i < n; i++) {
      const v = fxAddMonths(venc, i);
      const isMensal = modo === 'mensal';
      out.push({
        id: fxNewId(), ...base,
        desc: isMensal ? desc.trim() : `${desc.trim()} · parcela ${i + 1}/${n}`,
        valor: preview.each, venc: v,
        pago: false, pagoData: null, serie,
        grupo: isMensal ? `Mensal ${i + 1}/${n}` : `Parcela ${i + 1}/${n}`,
      });
    }
    return out;
  };

  const labelParty = dir === 'in' ? 'Cliente' : 'Fornecedor';
  const listParty = dir === 'in' ? FX_CLIENTES : FX_FORNEC;
  const half = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

  return (
    <FxModal
      width={680}
      title={isEdit ? 'Editar lançamento' : 'Novo lançamento'}
      sub={isEdit ? 'Atualize os dados deste lançamento.' : 'Honorário a receber ou gasto a pagar — único, recorrente ou parcelado.'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} style={{ height: 36 }}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => { onCreate(build()); onClose(); }}
          style={{ height: 36, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>
          <Icon name="check" size={14} />{isEdit ? 'Salvar alterações' : preview.count > 1 ? `Criar ${preview.count} lançamentos` : 'Criar lançamento'}
        </button>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {/* tipo — compact colored toggle */}
        <FxField label="Tipo">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['in', 'A receber', 'arrowDownRight', '#2E9E5B'], ['out', 'A pagar', 'arrowUpRight', '#C0492F']].map(([d, t, ic, c]) => {
              const on = dir === d;
              return (
                <button key={d} onClick={() => setDirSafe(d)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', height: 44, borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  border: `1.5px solid ${on ? c : 'var(--border-strong)'}`, background: on ? (d === 'in' ? 'rgba(46,158,91,0.08)' : 'rgba(192,73,47,0.07)') : 'var(--surface)',
                }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: on ? c : 'var(--bg-sunken)', color: on ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={ic} size={14} strokeWidth={2.2} /></span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: on ? 'var(--text)' : 'var(--text-muted)' }}>{t}</span>
                </button>
              );
            })}
          </div>
        </FxField>

        <FxField label="Descrição">
          <FxInput value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={dir === 'in' ? 'Ex.: Honorários · assessoria mensal' : 'Ex.: Aluguel do escritório'} />
        </FxField>

        <div style={half}>
          <FxField label="Categoria"><FxSelect options={FX_CATS[dir]} value={cat} onChange={(e) => setCat(e.target.value)} /></FxField>
          <FxField label={labelParty}>
            <input className="input" list="fx-party-list" value={party} onChange={(e) => setParty(e.target.value)} placeholder="Selecione ou digite" style={{ height: 38, fontSize: 13.5 }} />
            <datalist id="fx-party-list">{listParty.map((p) => <option key={p} value={p} />)}</datalist>
          </FxField>
        </div>

        {dir === 'in' && (
          <FxField label="Caso vinculado" hint="opcional">
            <FxInput value={caso} onChange={(e) => setCaso(e.target.value)} placeholder="Ex.: Contencioso trabalhista" />
          </FxField>
        )}

        <div style={half}>
          <FxField label="Valor" hint={modo === 'parcelado' && !isEdit ? 'valor total' : ''}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-subtle)' }}>R$</span>
              <FxInput value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" style={{ paddingLeft: 36, ...FX_NUM }} inputMode="decimal" />
            </div>
          </FxField>
          <FxField label={`Vencimento${!isEdit && modo !== 'unica' ? ' (1º)' : ''}`}>
            <FxInput type="date" value={venc} onChange={(e) => setVenc(e.target.value)} />
          </FxField>
        </div>

        {/* recorrência (hidden in edit mode) — compact segmented */}
        {!isEdit && (
          <FxField label="Frequência">
            <FxSegmented value={modo} onChange={setModo} options={[
              { value: 'unica', label: 'Único', icon: 'circleDot' },
              { value: 'mensal', label: 'Recorrente', icon: 'refreshCw' },
              { value: 'parcelado', label: 'Parcelado', icon: 'sigma' },
            ]} />
            {modo !== 'unica' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, padding: '11px 14px', background: 'var(--bg-soft)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>{modo === 'mensal' ? 'Repetir por' : 'Dividir em'}</span>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden' }}>
                  <button className="btn btn-ghost" onClick={() => setVezes((v) => Math.max(2, v - 1))} style={{ width: 30, height: 30, padding: 0, borderRadius: 0 }}><Icon name="minusCircle" size={15} /></button>
                  <span style={{ width: 34, textAlign: 'center', fontSize: 15, fontWeight: 600, ...FX_NUM, color: 'var(--text)' }}>{vezes}</span>
                  <button className="btn btn-ghost" onClick={() => setVezes((v) => Math.min(36, v + 1))} style={{ width: 30, height: 30, padding: 0, borderRadius: 0 }}><Icon name="plus" size={15} /></button>
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{modo === 'mensal' ? 'meses' : 'parcelas'}</span>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{preview.count}× de {fxMoney(preview.each)}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', ...FX_NUM }}>= {fxMoney(preview.total)}</div>
                </div>
              </div>
            )}
          </FxField>
        )}

        {/* pagamento — inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px', height: 46, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: !isEdit && modo !== 'unica' ? 'not-allowed' : 'pointer', opacity: !isEdit && modo !== 'unica' ? 0.5 : 1 }}
            onClick={() => { if (isEdit || modo === 'unica') setPago(!pago); }}>
            <FxCheck checked={pago} onChange={() => { if (isEdit || modo === 'unica') setPago(!pago); }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Já {dir === 'in' ? 'recebido' : 'pago'}</span>
          </label>
          {pago
            ? <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>em</span>
                <FxInput type="date" value={pagoData} onChange={(e) => setPagoData(e.target.value)} style={{ height: 32, width: 158 }} />
              </div>
            : <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-subtle)' }}>{!isEdit && modo !== 'unica' ? 'dê baixa em cada parcela depois' : ''}</span>}
        </div>

        {/* anexo + obs */}
        <div style={half}>
          <FxField label="Comprovante" hint="opcional">
            <button onClick={() => setAnexo(anexo ? '' : 'comprovante.pdf')} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: 38, padding: '0 13px', cursor: 'pointer',
              border: `1px dashed ${anexo ? 'var(--accent)' : 'var(--border-strong)'}`, borderRadius: 'var(--r-sm)',
              background: anexo ? 'var(--accent-soft)' : 'var(--surface)', color: anexo ? 'var(--accent)' : 'var(--text-muted)',
            }}>
              <Icon name={anexo ? 'fileCheck' : 'paperclip'} size={15} />
              <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{anexo || 'Anexar arquivo'}</span>
            </button>
          </FxField>
          <FxField label="Observações" hint="opcional">
            <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Anotações internas..." style={{ height: 38, fontSize: 13 }} />
          </FxField>
        </div>
      </div>
    </FxModal>
  );
};

// ---------- Série modal — view/edit all parcels of a recurrence/installment ----------
const FxSerieModal = ({ serieItems, onClose, onEditItem, onMarkPaid, onUnpay }) => {
  const sorted = serieItems.slice().sort((a, b) => a.venc.localeCompare(b.venc));
  const first = sorted[0];
  const total = sorted.reduce((s, i) => s + i.valor, 0);
  const recebido = sorted.filter((i) => i.pago).reduce((s, i) => s + i.valor, 0);
  const aberto = total - recebido;
  const dir = first ? first.dir : 'in';
  return (
    <FxModal
      width={620}
      title="Série de lançamentos"
      sub={first ? `${first.party}${first.caso ? ' · ' + first.caso : ''} · ${sorted.length} parcelas` : ''}
      onClose={onClose}
      footer={<button className="btn btn-secondary" onClick={onClose} style={{ height: 36 }}>Fechar</button>}
    >
      <div style={{ display: 'flex', gap: 20, padding: '4px 2px 16px', marginBottom: 4, borderBottom: '1px solid var(--border)' }}>
        {[['Total da série', total, 'var(--text)'], [dir === 'in' ? 'Recebido' : 'Pago', recebido, '#2E9E5B'], ['Em aberto', aberto, 'var(--accent)']].map(([l, v, c]) => (
          <div key={l}>
            <div style={{ fontSize: 10.5, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{l}</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: c, ...FX_NUM, marginTop: 2 }}>{fxMoney(v)}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', margin: '14px 0 8px' }}>Edite qualquer parcela isoladamente — útil para dação, descontos ou renegociação.</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sorted.map((it, i) => {
          const status = fxStatus(it);
          return (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-sunken)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, ...FX_NUM, flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>{it.grupo || it.desc}</div>
                <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>vence {fxDate(it.venc)}{it.pago ? ` · baixa ${fxDate(it.pagoData)}` : ''}</div>
              </div>
              <FxMoney value={it.valor} dir={it.dir} size={12.5} />
              <FxStatusPill status={status} />
              {!it.pago
                ? <button className="btn btn-secondary" onClick={() => onMarkPaid(it.id)} title="Dar baixa" style={{ width: 30, height: 30, padding: 0, borderColor: 'rgba(46,158,91,0.4)', color: '#2E9E5B' }}><Icon name="check" size={14} strokeWidth={2.4} /></button>
                : <button className="btn btn-ghost" onClick={() => onUnpay(it.id)} title="Reabrir" style={{ width: 30, height: 30, padding: 0 }}><Icon name="refreshCw" size={13} /></button>}
              <button className="btn btn-ghost" onClick={() => onEditItem(it)} title="Editar parcela" style={{ width: 30, height: 30, padding: 0 }}><Icon name="edit" size={13} /></button>
            </div>
          );
        })}
      </div>
    </FxModal>
  );
};

Object.assign(window, { FxNovoModal, FxSerieModal, fxParseValor });
