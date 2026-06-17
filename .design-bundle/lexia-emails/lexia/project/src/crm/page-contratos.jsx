// LexIA · CRM — Contratos (honorários) list + Contrato modal.

const CrmContratoModal = ({ store, contratoId, role, onClose, mut, nav }) => {
  const { toast } = useCrmToast();
  const h = store.contratos.find((x) => x.id === contratoId);
  crmUseEffect(() => { const fn = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, [onClose]);
  if (!h) return null;
  const cli = store.clientes.find((c) => c.id === h.clienteId);
  const caso = store.casos.find((k) => k.id === h.casoId);
  const parcelas = store.lancamentos.filter((l) => l.contratoId === h.id).sort((a, b) => a.venc.localeCompare(b.venc));
  const recebido = parcelas.filter((l) => l.status === 'recebido').reduce((s, l) => s + l.valor, 0);
  const total = parcelas.reduce((s, l) => s + l.valor, 0);
  const TIPO_LABEL = { recorrente: 'Recorrente', parcelado: 'Parcelado', 'êxito': 'Êxito', 'à vista': 'À vista' };
  const Field = ({ label, children }) => (
    <div><div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 500, marginBottom: 3 }}>{label}</div><div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{children}</div></div>
  );

  return (
    <div onMouseDown={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,13,37,0.42)', backdropFilter: 'blur(4px)', padding: 24 }}>
      <div onMouseDown={(e) => e.stopPropagation()} className="crm-pop-in card" style={{ width: 640, maxWidth: '100%', maxHeight: '92%', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <CrmBadge tone="neutral">{TIPO_LABEL[h.tipo]}</CrmBadge>
              <CrmBadge tone={recebido >= total ? 'pos' : 'gold'} dot>{recebido >= total ? 'Quitado' : 'Em aberto'}</CrmBadge>
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>{h.descricao}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {cli && <CrmLink onClick={() => nav.openCliente(cli.id)} icon="user">{cli.nome}</CrmLink>}
              {caso && <><span style={{ color: 'var(--text-subtle)' }}>·</span><CrmLink onClick={() => nav.openCaso(caso.id)} icon="briefcase">{caso.titulo.length > 28 ? caso.titulo.slice(0, 28) + '…' : caso.titulo}</CrmLink></>}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0, borderRadius: 9 }}><Icon name="x" size={17} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FxKpi label="Valor total" value={fxMoney(total)} icon="receipt" accent="gold" />
            <FxKpi label="Recebido" value={fxMoney(recebido)} sub={`${parcelas.filter((l) => l.status === 'recebido').length}/${parcelas.length} parcelas`} icon="checkCircle" tone="pos" />
          </div>

          <div className="card" style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 18px', background: 'var(--bg-soft)' }}>
            <Field label="Tipo">{TIPO_LABEL[h.tipo]}</Field>
            <Field label="Responsável">{crmFirst(h.responsavel)}</Field>
            <Field label="Conta de recebimento">{h.conta}</Field>
            <Field label="Valor bruto">{fxMoney(total)}</Field>
            <Field label="Valor líquido (est.)"><span style={{ color: 'var(--text-muted)' }}>{fxMoney(Math.round(total * 0.9))}</span></Field>
            <Field label="Parcelas">{h.count}×</Field>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>{h.count > 1 ? 'Parcelas' : 'Lançamento'}</div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {parcelas.map((l, i) => (
                <div key={l.id} className="crm-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 26, fontSize: 12, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{h.count > 1 ? `${i + 1}/${h.count}` : ''}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>Venc. {fxDate(l.venc)}</div>
                    {l.pagoData && <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Recebido em {fxDate(l.pagoData)}</div>}
                  </div>
                  <CrmContratoStatus status={l.status} venc={l.venc} />
                  <span style={{ width: 92, textAlign: 'right', fontSize: 13, fontWeight: 500, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fxMoney(l.valor)}</span>
                  {l.status === 'recebido'
                    ? <button onClick={() => mut.toggleRecebido(l.id)} className="btn btn-ghost" style={{ height: 28, fontSize: 12, padding: '0 9px', color: 'var(--text-muted)' }}>Desfazer</button>
                    : <button onClick={() => mut.toggleRecebido(l.id)} className="fx-baixa">Marcar recebido</button>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="link2" size={13} /> Lançamentos vinculados ao financeiro do escritório.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
          <button className="btn btn-secondary" onClick={() => toast('Editar contrato')}>Editar</button>
          <button className="btn btn-primary" onClick={() => { mut.receberContrato(h.id); toast('Próxima parcela marcada como recebida'); }} disabled={recebido >= total}><Icon name="check" size={14} />Marcar próxima como recebida</button>
        </div>
      </div>
    </div>
  );
};

// ---------- contratos list (lista de honorários / parcelas) ----------
const CRM_CON_COLS = '1fr 150px 150px 110px 120px 110px';
const CrmContratosPage = ({ store, onOpenContrato }) => {
  const [q, setQ] = crmUseState('');
  const [seg, setSeg] = crmUseState('todos');
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q.trim());

  const kpis = crmUseMemo(() => {
    const all = store.lancamentos;
    const total = all.reduce((s, l) => s + l.valor, 0);
    const recebido = all.filter((l) => l.status === 'recebido').reduce((s, l) => s + l.valor, 0);
    const lancado = all.filter((l) => l.status === 'lançado').reduce((s, l) => s + l.valor, 0);
    return { total, recebido, lancado, ticket: Math.round(total / all.length) };
  }, [store]);

  const rows = crmUseMemo(() => store.lancamentos.filter((l) => {
    if (seg === 'recebidos' && l.status !== 'recebido') return false;
    if (seg === 'lancados' && l.status !== 'lançado') return false;
    const cli = store.clientes.find((c) => c.id === l.clienteId);
    const caso = store.casos.find((k) => k.id === l.casoId);
    if (nq && !(norm(l.descricao).includes(nq) || (cli && norm(cli.nome).includes(nq)) || (caso && norm(caso.titulo).includes(nq)))) return false;
    return true;
  }).sort((a, b) => b.venc.localeCompare(a.venc)), [store, seg, nq]);

  return (
    <FxFrame>
      <CrmPageHead title="Contratos & honorários" sub={`${store.lancamentos.length} honorários · ligados ao financeiro`} />
      <CrmKpiRow kpis={[
        { label: 'Total contratado', value: fxMoney(kpis.total), icon: 'receipt' },
        { label: 'Recebido', value: fxMoney(kpis.recebido), icon: 'checkCircle', tone: 'pos' },
        { label: 'Lançado (a receber)', value: fxMoney(kpis.lancado), icon: 'clock', accent: 'gold' },
        { label: 'Ticket médio', value: fxMoney(kpis.ticket), icon: 'barChart' },
      ]} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <CrmSearch value={q} onChange={setQ} placeholder="Buscar por descrição, cliente, caso…" />
        <FxSegmented options={[{ value: 'todos', label: 'Todos' }, { value: 'recebidos', label: 'Recebidos' }, { value: 'lancados', label: 'Lançados' }]} value={seg} onChange={setSeg} />
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: CRM_CON_COLS, gap: 14, padding: '11px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
          {['Descrição', 'Cliente', 'Caso', 'Vencimento', 'Valor', 'Status'].map((hd, i) => (
            <div key={hd} style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i === 4 ? 'right' : 'left' }}>{hd}</div>
          ))}
        </div>
        {rows.length === 0 ? <CrmEmpty icon="receipt" title="Nenhum contrato encontrado" sub="Ajuste a busca ou os filtros." /> : rows.slice(0, 60).map((l, i) => {
          const cli = store.clientes.find((c) => c.id === l.clienteId);
          const caso = store.casos.find((k) => k.id === l.casoId);
          return (
            <CrmRow key={l.id} onClick={() => onOpenContrato(l.contratoId)} style={{ display: 'grid', gridTemplateColumns: CRM_CON_COLS, gap: 14, padding: '12px 18px', alignItems: 'center', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.descricao}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cli ? (cli.apelido || cli.nome) : '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{caso ? caso.titulo : '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fxDate(l.venc)}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fxMoney(l.valor)}</div>
              <div><CrmContratoStatus status={l.status} venc={l.venc} /></div>
            </CrmRow>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-subtle)', textAlign: 'center', marginTop: 14 }}>{Math.min(rows.length, 60)} de {rows.length} honorários</div>
    </FxFrame>
  );
};

Object.assign(window, { CrmContratosPage, CrmContratoModal });
