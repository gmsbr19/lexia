// LexIA · CRM — Cliente detail page: header + 6 tabs.

const CrmStat = ({ label, value, tone }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: tone === 'neg' ? 'var(--fin-neg,#C0492F)' : tone === 'pos' ? 'var(--fin-pos,#2E9E5B)' : 'var(--text)' }}>{value}</span>
  </div>
);

const CrmInfoLine = ({ icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
    <Icon name={icon} size={14} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
    <span>{children}</span>
  </div>
);

// ---- small money line for lists ----
const CrmLancRow = ({ l, store, onToggle, onOpenCaso, last }) => {
  const caso = store.casos.find((k) => k.id === l.casoId);
  return (
    <div className="crm-row" style={{ display: 'grid', gridTemplateColumns: '24px 1fr 150px 110px 96px 120px', gap: 12, alignItems: 'center', padding: '11px 16px', borderTop: last ? 'none' : '1px solid var(--border)' }}>
      <FxDirChip dir={l.dir} compact />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.descricao}</div>
        <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{l.cat}</div>
      </div>
      <div style={{ minWidth: 0 }}>{caso ? <CrmLink onClick={() => onOpenCaso(caso.id)}>{caso.titulo.length > 22 ? caso.titulo.slice(0, 22) + '…' : caso.titulo}</CrmLink> : <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>—</span>}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fxDate(l.venc)}</div>
      <div style={{ textAlign: 'right' }}><FxMoney value={l.valor} dir={l.dir} /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {l.status === 'recebido'
          ? <button onClick={() => onToggle(l.id)} className="btn btn-ghost" style={{ height: 26, fontSize: 12, padding: '0 9px', color: 'var(--fin-pos,#2E9E5B)' }}><Icon name="checkCircle" size={13} />Recebido</button>
          : <button onClick={() => onToggle(l.id)} className="fx-baixa">Marcar recebido</button>}
      </div>
    </div>
  );
};

const CrmClienteDetail = ({ store, clienteId, role, tab, onTab, mut, nav, onAnonimizar }) => {
  const { toast } = useCrmToast();
  const c = store.clientes.find((x) => x.id === clienteId);
  const [edit, setEdit] = crmUseState(false);
  if (!c) return <FxFrame><CrmEmpty title="Cliente não encontrado" /></FxFrame>;
  const fin = crmClienteFin(store, c.id);
  const casos = crmCasosDoCliente(store, c.id);
  const contratos = store.contratos.filter((h) => h.clienteId === c.id);
  const tarefas = store.tarefas.filter((t) => t.clienteId === c.id);
  const eventos = store.eventos.filter((e) => e.clienteId === c.id);
  const docs = store.documentos.filter((d) => d.clienteId === c.id);

  const TABS = [
    { id: 'financeiro', label: 'Financeiro', icon: 'wallet', badge: fin.count || null },
    { id: 'tarefas', label: 'Tarefas', icon: 'listChecks', badge: tarefas.length || null },
    { id: 'casos', label: 'Casos', icon: 'briefcase', badge: casos.length || null },
    { id: 'contratos', label: 'Contratos', icon: 'receipt', badge: contratos.length || null },
    { id: 'eventos', label: 'Eventos', icon: 'calendar', badge: eventos.length || null },
    { id: 'documentos', label: 'Documentos', icon: 'fileText', badge: docs.length || null },
  ];
  const sectionCard = (children) => <div className="card" style={{ overflow: 'hidden' }}>{children}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* header */}
      <div style={{ padding: '24px 40px 0', maxWidth: 1240, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <CrmAvatar name={c.nome} iniciais={c.iniciais} tipo={c.tipo} size={58} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--text)' }}>{c.nome}</h1>
              <CrmTipoBadge tipo={c.tipo} />
              <CrmClasseBadge classe={c.classe} />
            </div>
            {c.apelido && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{c.apelido}</div>}
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12 }}>
              {c.doc && <CrmInfoLine icon={c.tipo === 'PJ' ? 'building' : 'user'}>{c.doc}</CrmInfoLine>}
              {c.emails[0] && <CrmInfoLine icon="mail">{c.emails[0]}</CrmInfoLine>}
              {c.fones[0] && <CrmInfoLine icon="phone">{c.fones[0]}</CrmInfoLine>}
              {c.endereco && <CrmInfoLine icon="mapPin">{c.endereco.log}, {c.endereco.num} · {c.endereco.cidade}/{c.endereco.uf}</CrmInfoLine>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => { onTab('tarefas'); mut.openTarefa(c.id); }}><Icon name="listChecks" size={14} />Nova tarefa</button>
            <button className="btn btn-secondary" onClick={() => mut.action('novo-evento')}><Icon name="calendar" size={14} />Novo evento</button>
            <button className="btn btn-primary" onClick={() => toast('Abrindo gerador de documentos…')}><Icon name="fileText" size={14} />Gerar documento</button>
            <button className="btn btn-secondary" onClick={() => setEdit((e) => !e)} title="Editar dados"><Icon name="edit" size={14} />{edit ? 'Concluir' : 'Editar'}</button>
            {role === 'admin' && <button className="btn btn-ghost" onClick={() => onAnonimizar(c.id)} title="Anonimizar (LGPD)" style={{ color: 'var(--fin-neg,#C0492F)' }}><Icon name="alertTriangle" size={14} /></button>}
          </div>
        </div>

        {/* numeric summary */}
        <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', padding: '20px 0 22px', marginTop: 18, borderTop: '1px solid var(--border)' }}>
          <CrmStat label="Casos ativos" value={crmCasosCount(store, c.id)} />
          <CrmStat label="Recebido" value={fxMoney(fin.recebido)} tone="pos" />
          <CrmStat label="A receber" value={fxMoney(fin.aReceber)} />
          <CrmStat label="Vencido" value={fxMoney(fin.vencido)} tone={fin.vencido ? 'neg' : null} />
        </div>

        {edit && (
          <div className="card" style={{ padding: 18, marginBottom: 18, background: 'var(--bg-soft)' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 14 }}>Editar dados cadastrais</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div><FxLabel>Nome</FxLabel><FxInput defaultValue={c.nome} /></div>
              <div><FxLabel>Apelido</FxLabel><FxInput defaultValue={c.apelido} /></div>
              <div><FxLabel>CPF/CNPJ</FxLabel><FxInput defaultValue={c.doc} /></div>
              <div><FxLabel>E-mail</FxLabel><FxInput defaultValue={c.emails[0] || ''} /></div>
              <div><FxLabel>Telefone</FxLabel><FxInput defaultValue={c.fones[0] || ''} /></div>
              <div><FxLabel>Cidade/UF</FxLabel><FxInput defaultValue={c.cidade ? `${c.cidade}/${c.uf}` : ''} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setEdit(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => { setEdit(false); toast('Dados do cliente salvos'); }}>Salvar</button>
            </div>
          </div>
        )}
      </div>

      {/* tabs */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <FxTabs tabs={TABS} active={tab} onChange={onTab} />
      </div>

      <div style={{ padding: '22px 40px 48px', maxWidth: 1240, margin: '0 auto', width: '100%' }}>
        {tab === 'financeiro' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
              <FxKpi label="Recebido total" value={fxMoney(fin.recebido)} icon="checkCircle" tone="pos" />
              <FxKpi label="A receber" value={fxMoney(fin.aReceber)} icon="clock" accent="gold" />
              <FxKpi label="Vencido" value={fxMoney(fin.vencido)} icon="alertTriangle" tone={fin.vencido ? 'neg' : null} />
            </div>
            <FxCardTitle title="Lançamentos do cliente" sub={`${fin.count} lançamentos vinculados`} right={<button className="btn btn-secondary" onClick={() => mut.action('novo-lancamento')} style={{ height: 32 }}><Icon name="plus" size={14} />Novo lançamento</button>} />
            {fin.lancamentos.length === 0 ? sectionCard(<CrmEmpty icon="wallet" title="Sem lançamentos" sub="Crie um lançamento vinculado a este cliente." />) :
              sectionCard(fin.lancamentos.sort((a, b) => a.venc.localeCompare(b.venc)).map((l, i, arr) => (
                <CrmLancRow key={l.id} l={l} store={store} onToggle={mut.toggleRecebido} onOpenCaso={nav.openCaso} last={i === arr.length - 1} />
              )))}
          </>
        )}

        {tab === 'tarefas' && (
          <>
            <FxCardTitle title="Tarefas" sub="Vinculadas a este cliente" right={<button className="btn btn-secondary" onClick={() => mut.openTarefa(c.id)} style={{ height: 32 }}><Icon name="plus" size={14} />Nova tarefa</button>} />
            {tarefas.length === 0 ? sectionCard(<CrmEmpty icon="listChecks" title="Sem tarefas" sub="Crie uma tarefa para este cliente." />) :
              sectionCard(tarefas.map((t, i) => (
                <div key={t.id} className="crm-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <CrmPrioTag p={t.prioridade} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.titulo}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Prazo {fxDate(t.prazo)} · {crmFirst(t.responsavel)}</div>
                  </div>
                  <CrmBadge tone={CRM_TASK_STATUS[t.status].tone}>{CRM_TASK_STATUS[t.status].label}</CrmBadge>
                </div>
              )))}
          </>
        )}

        {tab === 'casos' && (
          <>
            <FxCardTitle title="Casos" sub={`${casos.length} caso(s)`} />
            {casos.length === 0 ? sectionCard(<CrmEmpty icon="briefcase" title="Sem casos" />) :
              sectionCard(casos.map((k, i) => {
                const kf = crmCasoFin(store, k.id);
                return (
                  <CrmRow key={k.id} onClick={() => nav.openCaso(k.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.titulo}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>resp. {crmFirst(k.responsavel)} · {k.rateio.leandro}/{k.rateio.leonardo}</div>
                    </div>
                    <CrmCasoTipoPill tipo={k.tipo} />
                    <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: 'var(--text)', width: 110, textAlign: 'right' }}>{fxMoney(kf.total)}</span>
                    <Icon name="chevronRight" size={16} style={{ color: 'var(--text-subtle)' }} />
                  </CrmRow>
                );
              }))}
          </>
        )}

        {tab === 'contratos' && (
          <>
            <FxCardTitle title="Contratos & honorários" sub={`${contratos.length} contrato(s)`} />
            {contratos.length === 0 ? sectionCard(<CrmEmpty icon="receipt" title="Sem contratos" />) :
              sectionCard(contratos.map((h, i) => {
                const recebido = store.lancamentos.filter((l) => l.contratoId === h.id && l.status === 'recebido').length;
                return (
                  <CrmRow key={h.id} onClick={() => nav.openContrato(h.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{h.descricao}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>{h.tipo} · {recebido}/{h.count} parcelas recebidas</div>
                    </div>
                    <CrmBadge tone="neutral">{h.tipo}</CrmBadge>
                    <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: 'var(--text)', width: 110, textAlign: 'right' }}>{fxMoney(h.valor)}</span>
                    <Icon name="chevronRight" size={16} style={{ color: 'var(--text-subtle)' }} />
                  </CrmRow>
                );
              }))}
          </>
        )}

        {tab === 'eventos' && (
          <>
            <FxCardTitle title="Eventos" sub="Agenda vinculada a este cliente" right={<button className="btn btn-secondary" onClick={() => mut.action('novo-evento')} style={{ height: 32 }}><Icon name="plus" size={14} />Novo evento</button>} />
            {eventos.length === 0 ? sectionCard(<CrmEmpty icon="calendar" title="Sem eventos" sub="Nenhum compromisso vinculado a este cliente." />) :
              sectionCard(eventos.map((e, i) => {
                const m = CRM_EVT[e.tipo];
                return (
                  <CrmRow key={e.id} onClick={() => nav.navPage('agenda')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: m.soft, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={m.icon} size={16} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{e.titulo}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{fxDateLong(e.dia)}{e.hIni ? ` · ${e.hIni}` : ''} · {crmFirst(e.responsavel)}</div>
                    </div>
                    <CrmBadge tone="neutral">{m.label}</CrmBadge>
                  </CrmRow>
                );
              }))}
          </>
        )}

        {tab === 'documentos' && (
          <>
            <FxCardTitle title="Documentos" sub="Gerados para este cliente" right={<button className="btn btn-secondary" onClick={() => toast('Abrindo gerador…')} style={{ height: 32 }}><Icon name="plus" size={14} />Gerar novo</button>} />
            {docs.length === 0 ? sectionCard(<CrmEmpty icon="fileText" title="Sem documentos" sub="Gere o primeiro documento deste cliente." />) :
              sectionCard(docs.map((d, i) => (
                <div key={d.id} className="crm-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg-sunken)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="fileText" size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{d.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{d.modelo} · {d.formato} · {fxDate(d.data)}</div>
                  </div>
                  <CrmBadge tone={d.status === 'finalizado' ? 'pos' : 'gold'} dot>{d.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}</CrmBadge>
                  <button className="btn btn-ghost" onClick={() => toast('Baixando ' + d.formato)} style={{ width: 30, height: 30, padding: 0 }}><Icon name="download" size={15} /></button>
                </div>
              )))}
          </>
        )}
      </div>
    </div>
  );
};

window.CrmClienteDetail = CrmClienteDetail;
