// LexIA · Contencioso — Ficha consolidada do processo.
// Cabeçalho de identificação fixo + conteúdo em ABAS ou SEÇÕES (alternável no cabeçalho).
// Seções: linha do tempo, prazos, documentos, financeiro, partes, anotações, relacionados.

const PROC_FICHA_TABS = [
  { id: 'timeline', label: 'Linha do tempo', icon: 'history' },
  { id: 'prazos', label: 'Prazos', icon: 'flag' },
  { id: 'docs', label: 'Documentos', icon: 'fileText' },
  { id: 'fin', label: 'Financeiro', icon: 'wallet' },
  { id: 'partes', label: 'Partes', icon: 'users' },
  { id: 'notas', label: 'Anotações', icon: 'feather' },
  { id: 'rel', label: 'Relacionados', icon: 'link2' },
];

const ProcFichaPage = ({ procStore, crmStore, processoId, role, nav, procMut }) => {
  const p = procById(procStore, processoId);
  const [layout, setLayout] = crmUseState('abas');   // 'abas' | 'secoes'
  const [tab, setTab] = crmUseState('timeline');
  const [modal, setModal] = crmUseState(null);
  const [nota, setNota] = crmUseState('');
  const { toast } = useCrmToast();
  if (!p) return <CrmEmpty icon="scale" title="Processo não encontrado" />;

  const nosso = procNossaParte(p), contraria = procContraria(p);
  const prazos = procStore.prazos.filter((x) => x.processoId === p.id).map((x) => ({ ...x, du: procDU(x.fatal) }));
  const prazosPend = prazos.filter((x) => x.status === 'pendente' || x.status === 'em_andamento').sort((a, b) => a.fatal.localeCompare(b.fatal));
  const prazoProx = prazosPend[0] || null;
  const andamentos = procStore.andamentos.filter((x) => x.processoId === p.id).sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
  const docs = procStore.docs.filter((x) => x.processoId === p.id);
  const notas = procStore.notas.filter((x) => x.processoId === p.id).sort((a, b) => b.data.localeCompare(a.data));
  const audiencias = procStore.audiencias.filter((x) => x.processoId === p.id);
  const tarefas = (crmStore.tarefas || []).filter((t) => t.clienteId === p.clienteId && t.status !== 'done');
  const relacionados = procStore.processos.filter((x) => x.clienteId === p.clienteId && x.id !== p.id);
  const fin = p.financeiro;
  const despesasTot = fin.despesas.reduce((s, d) => s + d.valor, 0);

  const onGerar = (andamento) => {
    setModal({ type: 'prazo', preset: {
      processoId: p.id, peca: andamento.prazoSugerido ? andamento.prazoSugerido.peca : 'Manifestação',
      dias: andamento.prazoSugerido ? andamento.prazoSugerido.dias : 15, baseISO: andamento.data,
      responsavel: p.responsavel, movId: andamento.id,
    } });
  };

  const Field = ({ label, value, mono }) => (
    <div><div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 500, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, fontVariantNumeric: mono ? 'tabular-nums' : 'normal' }}>{value}</div></div>
  );

  // ---------------- SECTION RENDERERS ----------------
  const Timeline = () => (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: 'var(--border)' }}></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {andamentos.map((a) => {
          const m = PROC_MOV[a.tipo] || PROC_MOV.cartorario;
          const rel = a.triagem === 'relevante' || (a.triagem === 'pendente' && a.prazoSugerido);
          return (
            <div key={a.id} style={{ display: 'flex', gap: 14, padding: '10px 0', position: 'relative' }}>
              <div style={{ position: 'relative', zIndex: 1 }}><ProcMovIcon tipo={a.tipo} active={rel} /></div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{a.titulo}</span>
                  {rel && <CrmBadge tone="warn" dot>relevante</CrmBadge>}
                  {a.triagem === 'cartorario' && <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>cartorário</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{a.descricao}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 7 }}>
                  <ProcFonte fonte={a.fonte} />
                  <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{m.label} · {fxDate(a.data)} {a.hora}</span>
                  {(a.triagem === 'pendente' && a.prazoSugerido) && (
                    <button className="btn btn-secondary btn-sm" onClick={() => onGerar(a)} style={{ fontSize: 12, height: 26, marginLeft: 'auto' }}><Icon name="flag" size={12} />Gerar prazo</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const Prazos = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)', fontSize: 12, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Prazos abertos</div>
        {prazosPend.length === 0 ? <div style={{ padding: 16, fontSize: 13, color: 'var(--text-subtle)' }}>Nenhum prazo em aberto.</div> : prazosPend.map((x, i) => (
          <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 3, background: procUrgency(x.du).color, margin: '2px 0' }}></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{x.peca}</div>
              <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>fatal {fxDate(x.fatal)} · interno {fxDate(x.interno)}{x.obs ? ' · ' + x.obs : ''}</div>
            </div>
            <ProcResp id={x.responsavel} showName={false} />
            <ProcSemaforo du={x.du} />
            <button className="btn btn-ghost btn-sm" onClick={() => { procMut.protocolar(x.id); toast('Prazo marcado como protocolado'); }} style={{ fontSize: 12 }}><Icon name="check" size={13} />Protocolar</button>
          </div>
        ))}
      </div>
      {audiencias.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)', fontSize: 12, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Audiências</div>
          {audiencias.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="users" size={16} /></div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.titulo}</div><div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{a.local}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fxDate(a.dia)}</div><div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{a.hora}</div></div>
            </div>
          ))}
        </div>
      )}
      {prazos.some((x) => x.status === 'protocolado' || x.status === 'cumprido') && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Histórico</div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {prazos.filter((x) => x.status === 'protocolado' || x.status === 'cumprido').map((x, i) => (
              <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: i ? '1px solid var(--border)' : 'none', opacity: 0.75 }}>
                <Icon name="checkCircle" size={15} style={{ color: 'var(--ok)' }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{x.peca}</span>
                <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{fxDate(x.fatal)}</span>
                <CrmBadge tone="pos">Protocolado</CrmBadge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const Docs = () => (
    <div className="card" style={{ overflow: 'hidden' }}>
      {docs.length === 0 ? <CrmEmpty icon="fileText" title="Sem documentos vinculados" /> : docs.map((d, i) => (
        <div key={d.id} className="crm-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer' }} onClick={() => nav.navPage('documentos')}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg-sunken)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="fileText" size={16} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{d.tipo} · {fxDate(d.data)} · {crmUser(d.autor).nome.split(' ')[0]}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-sunken)', padding: '2px 8px', borderRadius: 6, fontVariantNumeric: 'tabular-nums' }}>{d.versao}</span>
          <CrmBadge tone={d.status === 'final' ? 'pos' : d.status === 'revisão' ? 'warn' : 'neutral'}>{d.status}</CrmBadge>
        </div>
      ))}
    </div>
  );

  const Financeiro = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <FxKpi label="Honorários" value={fxMoney(fin.honorarios)} icon="receipt" accent="gold" />
        <FxKpi label="Recebido" value={fxMoney(fin.recebido)} icon="checkCircle" tone="pos" />
        <FxKpi label="Em aberto" value={fxMoney(fin.honorarios - fin.recebido)} icon="clock" />
        <FxKpi label="Custas pagas" value={fxMoney(fin.custas)} icon="banknote" />
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Despesas reembolsáveis</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fxMoney(despesasTot)}</span>
        </div>
        {fin.despesas.length === 0 ? <div style={{ padding: 16, fontSize: 13, color: 'var(--text-subtle)' }}>Sem despesas reembolsáveis lançadas.</div> : fin.despesas.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{d.desc}</span>
            {d.reemb ? <CrmBadge tone="gold">reembolsável</CrmBadge> : <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>não reembolsável</span>}
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', width: 96, textAlign: 'right' }}>{fxMoney(d.valor)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const Partes = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {p.partes.map((x, i) => (
        <div key={i} className="card" style={{ padding: 16, display: 'flex', gap: 13, alignItems: 'flex-start', borderColor: x.nosso ? 'var(--border-gold)' : 'var(--border)' }}>
          <CrmAvatar name={x.nome} size={42} tipo={x.tipo === 'PJ' ? 'PJ' : null} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <CrmBadge tone={x.nosso ? 'gold' : 'neutral'} dot>{x.papel}</CrmBadge>
              {x.nosso && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>nosso cliente</span>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{x.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{x.tipo} · {x.adv}</div>
            {x.nosso && p.clienteId && (
              <button className="btn btn-ghost btn-sm" onClick={() => nav.openCliente(p.clienteId)} style={{ fontSize: 12, marginTop: 8, padding: '0 8px', height: 28 }}><Icon name="externalLink" size={12} />Abrir cadastro</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const Notas = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-subtle)' }}>
        <Icon name="eye" size={14} /><span>Notas internas — não visíveis ao cliente.</span>
      </div>
      <div className="card" style={{ padding: 14 }}>
        <textarea className="textarea" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Anotação de estratégia, instrução ou lembrete…" style={{ minHeight: 64, marginBottom: 10 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-sm" disabled={!nota.trim()} onClick={() => { procMut.addNota(p.id, nota.trim()); setNota(''); toast('Anotação salva'); }}><Icon name="plus" size={13} />Adicionar nota</button>
        </div>
      </div>
      {notas.map((n) => (
        <div key={n.id} className="card" style={{ padding: 14, background: 'var(--bg-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <ProcResp id={n.autor} />
            <span style={{ fontSize: 12, color: 'var(--text-subtle)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{fxDate(n.data)}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>{n.texto}</div>
        </div>
      ))}
    </div>
  );

  const Relacionados = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Tarefas</div>
        <div className="card" style={{ overflow: 'hidden' }}>
          {tarefas.length === 0 ? <div style={{ padding: 14, fontSize: 13, color: 'var(--text-subtle)' }}>Sem tarefas abertas.</div> : tarefas.map((t, i) => (
            <div key={t.id} className="crm-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer' }} onClick={() => nav.navPage('tarefas')}>
              <CrmPrioTag p={t.prioridade} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{t.titulo}</span>
              <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{fxDate(t.prazo)}</span>
              <ProcResp id={t.responsavel} showName={false} size={20} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Processos do mesmo cliente {p.apensos.length ? '· apensos' : ''}</div>
        <div className="card" style={{ overflow: 'hidden' }}>
          {p.apensos.map((ap, i) => (
            <div key={'ap' + i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <Icon name="link2" size={15} style={{ color: 'var(--text-subtle)' }} /><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{ap}</span><CrmBadge tone="neutral">apenso</CrmBadge>
            </div>
          ))}
          {relacionados.length === 0 && p.apensos.length === 0 ? <div style={{ padding: 14, fontSize: 13, color: 'var(--text-subtle)' }}>Nenhum processo relacionado.</div> : relacionados.map((r, i) => (
            <div key={r.id} className="crm-row" onClick={() => nav.openProcesso(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: (i || p.apensos.length) ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
              <Icon name="scale" size={15} style={{ color: 'var(--text-subtle)' }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{r.numero}</div><div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{r.classe}</div></div>
              <Icon name="arrowRight" size={15} style={{ color: 'var(--text-subtle)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const SECTIONS = {
    timeline: { title: 'Linha do tempo', icon: 'history', sub: `${andamentos.length} movimentações`, body: Timeline },
    prazos: { title: 'Prazos & compromissos', icon: 'flag', sub: `${prazosPend.length} em aberto`, body: Prazos },
    docs: { title: 'Documentos', icon: 'fileText', sub: `${docs.length} arquivos`, body: Docs },
    fin: { title: 'Financeiro do caso', icon: 'wallet', body: Financeiro },
    partes: { title: 'Partes & contatos', icon: 'users', body: Partes },
    notas: { title: 'Anotações / estratégia', icon: 'feather', body: Notas },
    rel: { title: 'Tarefas & relacionados', icon: 'link2', body: Relacionados },
  };

  return (
    <div>
      {/* ---------- cabeçalho de identificação (fixo) ---------- */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '18px 40px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => nav.navPage('processos')} style={{ padding: '0 8px' }}><Icon name="chevronLeft" size={15} />Processos</button>
            <ProcCNJ numero={p.numero} size={15} copy color="var(--text)" />
            <ProcStatus status={p.status} />
            <ProcFaseTag fase={p.fase} />
            {p.segredo && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-subtle)' }}><Icon name="eye" size={13} />Segredo de justiça</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)' }}>{p.classe}</h1>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 3 }}>{p.assunto}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9, fontSize: 13, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{nosso.nome}</span>
                <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '1px 7px', borderRadius: 5, fontWeight: 600, textTransform: 'capitalize' }}>{nosso.papel}</span>
                <span style={{ color: 'var(--text-subtle)' }}>×</span>
                <span style={{ color: 'var(--text-muted)' }}>{contraria ? contraria.nome : '—'}</span>
              </div>
            </div>
            {prazoProx && (
              <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-soft)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Próximo prazo</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{prazoProx.peca}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>fatal {fxDate(prazoProx.fatal)}</div>
                </div>
                <ProcSemaforo du={prazoProx.du} big />
              </div>
            )}
          </div>

          {/* meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '12px 18px', padding: '16px 0' }}>
            <Field label="Tribunal" value={p.tribunal} />
            <Field label="Comarca / foro" value={p.comarca} />
            <Field label="Vara / órgão" value={p.vara} />
            <Field label="Instância" value={p.instancia} />
            <Field label="Valor da causa" value={fxMoney(p.valorCausa)} mono />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 500 }}>Responsável</div><ProcResp id={p.responsavel} /></div>
            <Field label="Distribuição" value={fxDate(p.distribuicao)} mono />
            <Field label="Última movimentação" value={fxDate(p.ultimaMov)} mono />
            <div><div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 500, marginBottom: 3 }}>Fonte</div><ProcFonte fonte={p.fonte} /></div>
          </div>

          {/* alternador de layout + abas */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: layout === 'abas' ? 0 : 14 }}>
            {layout === 'abas' ? (
              <div className="crm-tabscroll" style={{ display: 'flex', gap: 2, overflowX: 'auto', flex: 1 }}>
                {PROC_FICHA_TABS.map((t) => {
                  const on = tab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '0 13px', height: 40, cursor: 'pointer',
                      border: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 13.5,
                      fontWeight: on ? 600 : 500, color: on ? 'var(--text)' : 'var(--text-muted)', letterSpacing: '-0.01em',
                      borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap', flexShrink: 0,
                    }}><Icon name={t.icon} size={14} />{t.label}</button>
                  );
                })}
              </div>
            ) : <div style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Todas as seções, em rolagem contínua.</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingBottom: layout === 'abas' ? 7 : 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Layout</span>
              <ProcSeg size="sm" options={[{ value: 'abas', label: 'Abas' }, { value: 'secoes', label: 'Seções' }]} value={layout} onChange={setLayout} />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- conteúdo ---------- */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 40px 56px' }}>
        {layout === 'abas'
          ? (() => { const S = SECTIONS[tab]; const B = S.body; return <B />; })()
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
              {PROC_FICHA_TABS.map((t) => { const S = SECTIONS[t.id]; const B = S.body; return (
                <section key={t.id}>
                  <ProcSecTitle icon={S.icon} title={S.title} sub={S.sub} />
                  <B />
                </section>
              ); })}
            </div>
          )}
      </div>

      {modal && modal.type === 'prazo' && <ProcPrazoModal procStore={procStore} preset={modal.preset} onClose={() => setModal(null)} onSave={(prazo, movId) => procMut.salvarPrazo(prazo, movId)} />}
    </div>
  );
};

window.ProcFichaPage = ProcFichaPage;
