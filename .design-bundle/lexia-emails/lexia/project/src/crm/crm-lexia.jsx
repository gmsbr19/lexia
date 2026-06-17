// LexIA · CRM — AI chat popup. Animated presence, contextual chips, action cards, history.

// canned responder — replaced by real backend later. Returns {text, cards}.
function crmLexiaReply(msg, ctx, store) {
  const m = msg.toLowerCase();
  const fmt = (n) => fxMoney(n);
  // ---- modo documento: a LexIA acompanha o papel aberto ao lado ----
  if (ctx.doc) {
    const cliDoc = store.clientes.find((c) => c.id === ctx.doc.clienteId);
    if (m.includes('multa') || m.includes('juros') || m.includes('atras')) {
      if (ctx.doc.multa) return { text: 'Este documento já tem a cláusula de multa por atraso (2% + juros de 1% a.m. + IPCA). Quer que eu ajuste os percentuais?', cards: [] };
      return {
        text: 'Boa ideia. O padrão do escritório é multa de 2% sobre o valor em aberto, juros de mora de 1% a.m. e correção pelo IPCA. Posso incluir como cláusula própria.',
        cards: [{ icon: 'sparkles', tone: 'gold', title: 'Cláusula de multa por atraso', sub: '2% + juros 1% a.m. · padrão do escritório', action: 'Aplicar', run: (h) => h.applyMulta(ctx.doc.id) }],
      };
    }
    if (m.includes('objetiv') || m.includes('simpl') || m.includes('enxut') || m.includes('curt')) {
      return { text: 'Reescrevi os trechos mais longos em tom direto, mantendo a precisão técnica — as cláusulas de objeto e honorários ficaram cerca de 30% mais enxutas. Revise ao lado e me diga se quer mais cortes.', cards: [] };
    }
    if (m.includes('resum')) {
      return { text: `Resumo para o cliente: ${ctx.doc.modelo.toLowerCase()}${cliDoc ? ` de ${cliDoc.nome}` : ''} — prestação de serviços advocatícios por R$ 8.500/mês, vigência de 12 meses com renovação automática, reajuste anual pelo IPCA e foro em São Paulo/SP.`, cards: [] };
    }
    if (m.includes('finaliz') || m.includes('pronto') || m.includes('aprov')) {
      return { text: 'Para finalizar, recomendo conferir os dados das partes e a numeração. Depois é só marcar como finalizado e baixar em PDF — posso preparar o e-mail de envio ao cliente, se quiser.', cards: [] };
    }
    return { text: 'Estou acompanhando este documento. Posso incluir ou reescrever cláusulas, ajustar valores e prazos, deixar a redação mais objetiva ou resumi-lo para envio ao cliente.', cards: [] };
  }
  if (m.includes('rascunho') || (m.includes('documento') && (m.includes('quais') || m.includes('pendente')))) {
    const ds = (store.documentos || []).filter((d) => d.status === 'rascunho' || d.status === 'revisão');
    return {
      text: `Você tem ${ds.length} documento(s) em aberto (rascunho ou revisão):`,
      cards: ds.slice(0, 3).map((d) => ({ icon: 'fileText', tone: 'gold', title: d.nome, sub: d.status === 'revisão' ? 'Em revisão' : 'Rascunho', action: 'Abrir', run: (h) => h.openDocumento && h.openDocumento(d.id) })),
    };
  }
  if (m.includes('devendo') || m.includes('vencid') || m.includes('atras')) {
    const venc = store.lancamentos.filter(crmIsVencido).sort((a, b) => a.venc.localeCompare(b.venc));
    const total = venc.reduce((s, l) => s + l.valor, 0);
    return {
      text: `Encontrei ${venc.length} honorário(s) vencido(s), somando ${fmt(total)}. Os mais antigos:`,
      cards: venc.slice(0, 3).map((l) => {
        const c = store.clientes.find((x) => x.id === l.clienteId);
        return { icon: 'alertTriangle', tone: 'neg', title: `${c ? c.apelido || c.nome : ''} · ${fmt(l.valor)}`, sub: `Venceu em ${fxDate(l.venc)} · ${l.descricao}`, action: 'Ver contrato', run: (h) => h.openContrato(l.contratoId) };
      }),
    };
  }
  if (m.includes('resum') && ctx.cliente) {
    const c = ctx.cliente; const fin = crmClienteFin(store, c.id); const cas = crmCasosDoCliente(store, c.id);
    return {
      text: `${c.nome} é ${c.tipo === 'PJ' ? 'pessoa jurídica' : 'pessoa física'}, classificado como ${c.classe}. Possui ${cas.length} caso(s), com ${fmt(fin.recebido)} já recebidos e ${fmt(fin.aReceber)} a receber${fin.vencido ? ` (${fmt(fin.vencido)} vencidos)` : ''}.`,
      cards: fin.vencido ? [{ icon: 'wallet', tone: 'gold', title: 'Cobrar valores vencidos', sub: `${fmt(fin.vencido)} em aberto`, action: 'Abrir financeiro', run: (h) => h.openClienteTab(c.id, 'financeiro') }] : [],
    };
  }
  if (m.includes('tarefa') || m.includes('lembr')) {
    return { text: 'Posso criar uma tarefa para você. Quer que eu já vincule a um caso ou cliente?', cards: [{ icon: 'listChecks', tone: 'gold', title: 'Criar nova tarefa', sub: 'Abrir formulário pré-preenchido', action: 'Criar', run: (h) => h.action('nova-tarefa') }] };
  }
  if (m.includes('rateio') || m.includes('sócio') || m.includes('socio') || m.includes('divis')) {
    return { text: 'O rateio define como os honorários de um caso são divididos entre Leandro e Leonardo. Você pode ajustar pelo modal do caso, com slider e presets (50/50, 100% para um sócio).', cards: [{ icon: 'briefcase', tone: 'blue', title: 'Abrir página de Casos', sub: 'Revisar rateios', action: 'Ir', run: (h) => h.navPage('casos') }] };
  }
  if (m.includes('audi') || m.includes('agenda') || m.includes('prazo') || m.includes('hoje')) {
    const hoje = store.eventos.filter((e) => e.dia === CRM_TODAY);
    return {
      text: hoje.length ? `Você tem ${hoje.length} compromisso(s) hoje:` : 'Não há compromissos para hoje. Próximos prazos estão na Agenda.',
      cards: hoje.slice(0, 3).map((e) => ({ icon: CRM_EVT[e.tipo].icon, tone: e.tipo === 'prazo' ? 'gold' : e.tipo === 'audiência' ? 'neg' : 'blue', title: e.titulo, sub: `${e.hIni || 'dia inteiro'} · ${CRM_EVT[e.tipo].label}`, action: 'Ver agenda', run: (h) => h.navPage('agenda') })),
    };
  }
  return { text: 'Entendi. Estou conectada aos seus clientes, casos, contratos e agenda — posso resumir situações, encontrar valores em aberto, criar tarefas e abrir registros. O que você gostaria de fazer?', cards: [] };
}

function crmContextChips(ctx) {
  if (ctx.doc) return ['Incluir cláusula de multa por atraso', 'Deixar a redação mais objetiva', 'Resumir o documento para o cliente'];
  if (ctx.cliente) return ['Resuma a situação deste cliente', 'Há valores vencidos?', 'Criar tarefa para este cliente'];
  switch (ctx.page) {
    case 'financeiro': return ['Quem está devendo há mais de 60 dias?', 'Qual o total a receber este mês?', 'Resumo do fluxo de caixa'];
    case 'casos': return ['Casos sem rateio definido', 'Como funciona o rateio entre sócios?', 'Audiências desta semana'];
    case 'contratos': return ['Contratos vencidos', 'Qual o ticket médio?', 'Recorrentes a vencer'];
    case 'agenda': return ['O que tenho hoje?', 'Próximas audiências', 'Criar um evento'];
    case 'clientes': return ['Clientes com mais casos', 'Leads sem contato', 'Criar novo cliente'];
    case 'tarefas': return ['O que vence hoje?', 'Criar tarefa: revisar contestação Cavanhas', 'Quais tarefas P1 estão abertas?'];
    case 'comercial': return ['Leads sem contato esta semana', 'Resumo do funil de captação', 'Cadastrar novo lead'];
    case 'documentos': return ['Minutar contrato de honorários para Helena Vargas', 'Gerar procuração ad judicia para Construtora Aurora', 'Quais documentos estão em rascunho?'];
    default: return ['O que tenho hoje?', 'Quem está devendo?', 'Criar uma tarefa'];
  }
}

const CrmLexiaMsg = ({ role, children }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: role === 'user' ? 'row-reverse' : 'row' }}>
    {role === 'ai' && (
      <div style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, background: 'var(--brand-gold)', color: '#020D25', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }}>
        <Icon name="sparkles" size={15} />
      </div>
    )}
    <div style={{
      maxWidth: '82%', padding: '10px 13px', borderRadius: 14, fontSize: 14, lineHeight: 1.5, letterSpacing: '-0.01em',
      background: role === 'user' ? 'var(--brand-navy)' : 'var(--bg-sunken)',
      color: role === 'user' ? '#F5F1E4' : 'var(--text)',
      borderTopRightRadius: role === 'user' ? 4 : 14, borderTopLeftRadius: role === 'ai' ? 4 : 14,
    }}>{children}</div>
  </div>
);

const CrmLexiaCard = ({ card, handlers, onClose }) => {
  const tones = { neg: 'var(--fin-neg,#C0492F)', gold: 'var(--accent)', blue: 'var(--text-muted)', pos: 'var(--fin-pos,#2E9E5B)' };
  const c = tones[card.tone] || 'var(--accent)';
  return (
    <div style={{ marginLeft: 38, marginTop: 8, display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: c + '1f', color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={card.icon} size={15} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.sub}</div>
      </div>
      <button onClick={() => { card.run(handlers); onClose(); }} className="btn btn-secondary" style={{ height: 28, fontSize: 12, padding: '0 10px', flexShrink: 0 }}>{card.action}</button>
    </div>
  );
};

const CrmLexia = ({ ctx, store, onClose, handlers }) => {
  const [thread, setThread] = crmUseState([]);   // {role, text, cards?}
  const [input, setInput] = crmUseState('');
  const [thinking, setThinking] = crmUseState(false);
  const [showHist, setShowHist] = crmUseState(false);
  const scrollRef = crmUseRef(null);
  const chips = crmContextChips(ctx);

  crmUseEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [thread, thinking]);

  const send = (text) => {
    const t = (text != null ? text : input).trim();
    if (!t || thinking) return;
    setInput(''); setThread((p) => [...p, { role: 'user', text: t }]); setThinking(true);
    setTimeout(() => {
      const r = crmLexiaReply(t, ctx, store);
      setThinking(false);
      setThread((p) => [...p, { role: 'ai', text: r.text, cards: r.cards }]);
    }, 950 + Math.random() * 500);
  };

  const newChat = () => { setThread([]); setShowHist(false); };
  const histItems = [
    { t: 'Honorários vencidos · maio', d: '2 dias atrás' },
    { t: 'Resumo Construtora Aurora', d: '5 dias atrás' },
    { t: 'Audiências da semana', d: '1 semana atrás' },
  ];

  return (
    <div style={{ position: 'absolute', bottom: 96, right: 26, zIndex: 130, width: 430, maxWidth: 'calc(100% - 40px)', height: 600, maxHeight: 'calc(100% - 130px)', display: 'flex', flexDirection: 'column' }} className="crm-lexia-in">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 14, boxShadow: '0 28px 70px rgba(2,13,37,0.34), 0 8px 22px rgba(2,13,37,0.18)', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--brand-gold)', color: '#020D25', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }}>
            <Icon name="sparkles" size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em' }}>LexIA</div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4FC07D' }}></span>Assistente do escritório</div>
          </div>
          <button onClick={() => setShowHist((s) => !s)} title="Conversas" className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0, borderRadius: 9, color: showHist ? 'var(--accent)' : 'var(--text-muted)' }}><Icon name="history" size={16} /></button>
          <button onClick={newChat} title="Nova conversa" className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0, borderRadius: 9 }}><Icon name="edit" size={15} /></button>
          <button onClick={onClose} title="Fechar" className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0, borderRadius: 9 }}><Icon name="x" size={16} /></button>
        </div>

        {showHist ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            <button onClick={newChat} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', height: 38, marginBottom: 10 }}><Icon name="plus" size={15} />Nova conversa</button>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 6px 8px' }}>Recentes</div>
            {histItems.map((h, i) => (
              <button key={i} onClick={() => setShowHist(false)} className="fx-menu-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 10px' }}>
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{h.t}</span>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{h.d}</span>
              </button>
            ))}
          </div>
        ) : (
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {thread.length === 0 && (
              <div style={{ margin: 'auto 0' }}>
                <div style={{ textAlign: 'center', padding: '8px 0 22px' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px', background: 'var(--brand-gold)', color: '#020D25', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(192,161,71,0.35), inset 0 1px 0 rgba(255,255,255,0.4)' }} className="crm-orb-float">
                    <Icon name="sparkles" size={24} />
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em' }}>Olá, Thiago 👋</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5, maxWidth: 300, marginInline: 'auto' }}>Sou a LexIA. Posso buscar informações, resumir clientes e casos, e ajudar nas tarefas do dia.</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chips.map((c, i) => (
                    <button key={i} onClick={() => send(c)} className="crm-chip" style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '11px 13px',
                      borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer',
                      fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-sans)', fontWeight: 500, letterSpacing: '-0.01em',
                    }}>
                      <Icon name="sparkles" size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{c}</span>
                      <Icon name="arrowRight" size={14} style={{ color: 'var(--text-subtle)' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {thread.map((m, i) => (
              <div key={i}>
                <CrmLexiaMsg role={m.role}>{m.text}</CrmLexiaMsg>
                {m.cards && m.cards.map((c, j) => <CrmLexiaCard key={j} card={c} handlers={handlers} onClose={onClose} />)}
              </div>
            ))}
            {thinking && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, background: 'var(--brand-gold)', color: '#020D25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="sparkles" size={15} /></div>
                <div style={{ display: 'flex', gap: 4, padding: '12px 14px', borderRadius: 14, background: 'var(--bg-sunken)' }}>
                  <span className="crm-dot" style={{ animationDelay: '0ms' }}></span>
                  <span className="crm-dot" style={{ animationDelay: '160ms' }}></span>
                  <span className="crm-dot" style={{ animationDelay: '320ms' }}></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* composer */}
        {!showHist && (
          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 14, padding: '6px 6px 6px 14px' }}>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1} placeholder="Pergunte à LexIA…" style={{
                  flex: 1, border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'var(--font-sans)',
                  fontSize: 14, color: 'var(--text)', maxHeight: 90, padding: '7px 0', letterSpacing: '-0.01em',
                }} />
              <button onClick={() => send()} disabled={!input.trim()} style={{
                width: 34, height: 34, borderRadius: 10, border: 'none', flexShrink: 0, cursor: input.trim() ? 'pointer' : 'default',
                background: input.trim() ? 'var(--brand-gold)' : 'var(--bg-sunken)',
                color: input.trim() ? '#020D25' : 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s',
              }}><Icon name="send" size={15} /></button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', textAlign: 'center', marginTop: 7 }}>A LexIA pode cometer erros. Confira informações importantes.</div>
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { CrmLexia, crmLexiaReply, crmContextChips });
