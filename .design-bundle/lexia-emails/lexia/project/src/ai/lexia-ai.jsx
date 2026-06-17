// LexIA · Assistente de IA — releitura no estilo Notion AI, na linguagem da marca (navy + dourado).
// 3 modos de layout: Barra lateral · Flutuante · Tela cheia. Tela de boas-vindas, chat e composer rico.
const { useState: useAIState, useRef: useAIRef, useEffect: useAIEffect } = React;

/* ----------------------------------------------------------------------------
   Respondedor enlatado — contexto jurídico do escritório. Retorna {text, cards}.
   ---------------------------------------------------------------------------- */
function lexiaReply(msg) {
  const m = msg.toLowerCase();
  if (m.includes('vencid') || m.includes('devendo') || m.includes('receber') || m.includes('atras')) {
    return {
      text: 'Encontrei 4 honorários vencidos somando R$ 38.200. Os mais antigos:',
      cards: [
        { icon: 'alertTriangle', tone: 'crit', title: 'Construtora Aurora · R$ 18.000', sub: 'Venceu há 47 dias · Contrato 2026/0098' },
        { icon: 'alertTriangle', tone: 'crit', title: 'Helena Vargas · R$ 12.000', sub: 'Venceu há 23 dias · Honorários de êxito' },
      ],
    };
  }
  if (m.includes('contrato') || m.includes('honorário') || m.includes('honorario') || m.includes('minut')) {
    return {
      text: 'Posso minutar um contrato de honorários a partir do cadastro do cliente — puxo CPF, RG e endereço automaticamente. Para qual cliente?',
      cards: [{ icon: 'fileText', tone: 'gold', title: 'Contrato de Honorários', sub: 'Modelo padrão do escritório · 3 cláusulas a preencher', action: 'Abrir' }],
    };
  }
  if (m.includes('resum') || m.includes('insight') || m.includes('analis') || m.includes('anali')) {
    return {
      text: 'No mês, o líquido subiu para R$ 2,01 mil — alta de 142% sobre maio, puxada pelo recebimento de êxito da Aurora. Despesas ficaram estáveis em R$ 32 mil. O ponto de atenção continua sendo a inadimplência de R$ 38,2 mil concentrada em dois clientes.',
      cards: [],
    };
  }
  if (m.includes('tarefa') || m.includes('lembr') || m.includes('prazo') || m.includes('agenda') || m.includes('hoje')) {
    return {
      text: 'Hoje você tem 2 compromissos e 1 prazo fatal. Quer que eu crie uma tarefa vinculada a um caso?',
      cards: [
        { icon: 'calendarClock', tone: 'crit', title: 'Prazo: contestação Cavanhas', sub: 'Vence hoje, 23h59' },
        { icon: 'listChecks', tone: 'gold', title: 'Criar nova tarefa', sub: 'Formulário pré-preenchido', action: 'Criar' },
      ],
    };
  }
  if (m.includes('traduz') || m.includes('idioma')) {
    return { text: 'Posso traduzir esta página para inglês ou espanhol, preservando a terminologia jurídica. Para qual idioma?', cards: [] };
  }
  if (m.includes('personaliz') || m.includes('configur') || m.includes('tom') || m.includes('estilo')) {
    return { text: 'Você pode me dar instruções permanentes: tom de redação, formato de datas e valores, e quais dados sempre puxar do cadastro. Defino isso nas preferências da LexIA.', cards: [] };
  }
  return {
    text: 'Estou conectada aos seus clientes, casos, contratos, financeiro e agenda. Posso resumir situações, encontrar valores em aberto, minutar documentos e criar tarefas. O que você gostaria de fazer?',
    cards: [],
  };
}

const TONES = {
  crit: 'var(--crit)', gold: 'var(--accent)', ok: 'var(--ok)', neutral: 'var(--text-muted)',
};

/* ---- Avatar da LexIA: vidro fosco + ícone dourado girando + borda dourada grossa --------- */
const LexAvatar = ({ size = 28, glow = false }) => {
  const border = Math.max(2, Math.round(size * 0.075));   // borda grossa (espessura do hover)
  const iconSize = Math.round(size * 0.52);
  const innerBlur = Math.max(4, Math.round(size * 0.18));
  const auraBlur = Math.max(5, Math.round(size * 0.24));
  const inner = size - border * 2;
  const auraD = Math.round(inner * 0.95);
  const aura3 = Math.round(inner * 0.7);
  const auraBase = { position: 'absolute', borderRadius: '50%', pointerEvents: 'none', filter: `blur(${auraBlur}px)` };
  return (
    <div style={{
      position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      boxShadow: glow ? '0 8px 26px rgba(192,161,71,0.34)' : 'none',
    }}>
      {/* fonte da borda dourada girando */}
      <div className="lexai-orb-grad" style={{ top: 0, right: 0, bottom: 0, left: 0, inset: 0 }} />
      {/* miolo frosted glass */}
      <div style={{
        position: 'absolute', inset: border, borderRadius: '50%', overflow: 'hidden',
        background: 'color-mix(in srgb, #0A1733 76%, transparent)',
        backdropFilter: `blur(${innerBlur}px) saturate(150%)`, WebkitBackdropFilter: `blur(${innerBlur}px) saturate(150%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ ...auraBase, width: auraD, height: auraD, left: 0, top: 0,
          background: 'radial-gradient(circle, rgba(216,190,122,0.95), rgba(192,161,71,0) 70%)',
          animation: 'lexaiAuroraA 8.5s ease-in-out infinite' }} />
        <span style={{ ...auraBase, width: auraD, height: auraD, right: 0, bottom: 0,
          background: 'radial-gradient(circle, rgba(154,127,46,0.9), rgba(154,127,46,0) 70%)',
          animation: 'lexaiAuroraB 8.5s ease-in-out infinite' }} />
        <span style={{ ...auraBase, width: aura3, height: aura3, left: '50%', top: '50%', marginLeft: -aura3 / 2, marginTop: -aura3 / 2,
          background: 'radial-gradient(circle, rgba(241,221,166,0.8), rgba(241,221,166,0) 72%)',
          animation: 'lexaiAuroraC 11s ease-in-out infinite' }} />
        <span className="lexai-orb-icon" style={{ width: iconSize, height: iconSize, position: 'relative', zIndex: 1 }}>
          <span className="lexai-orb-grad" />
        </span>
      </div>
    </div>
  );
};

/* ---- Item do menu de layout ---------------------------------------------- */
const LayoutOption = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className="lexai-menu-item" style={{ justifyContent: 'space-between' }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon name={icon} size={16} style={{ color: 'var(--text-muted)' }} />
      {label}
    </span>
    {active && <Icon name="check" size={15} strokeWidth={2.4} style={{ color: 'var(--accent)' }} />}
  </button>
);

/* ---- Cartão de ação retornado pela IA ------------------------------------ */
const ActionCard = ({ card }) => {
  const c = TONES[card.tone] || 'var(--accent)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 12,
      border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-sunken)', color: c,
      }}>
        <Icon name={card.icon} size={16} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{card.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.sub}</div>
      </div>
      {card.action && (
        <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0, fontSize: 12 }}>{card.action}</button>
      )}
    </div>
  );
};

/* ---- Mensagem ------------------------------------------------------------- */
const Bubble = ({ role, children, wide }) => {
  if (role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: wide ? '78%' : '86%', padding: '10px 14px', borderRadius: 14, borderTopRightRadius: 5,
          background: 'var(--brand-navy)', color: '#F5F1E4', fontSize: 14, lineHeight: 1.5, letterSpacing: '-0.01em',
          border: '1px solid var(--border)',
        }}>{children}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
      <LexAvatar size={28} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 2 }}>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', letterSpacing: '-0.01em' }}>{children}</div>
      </div>
    </div>
  );
};

/* ---- Linha de sugestão (tela de boas-vindas) ------------------------------ */
const SuggestRow = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="lexai-suggest" style={{}}>
    <span style={{
      width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-sunken)', color: 'var(--accent)',
    }}><Icon name={icon} size={15} /></span>
    <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
    <Icon name="arrowRight" size={15} style={{ color: 'var(--text-subtle)', opacity: 0.7 }} />
  </button>
);

/* ============================================================================
   ASSISTENTE
   ============================================================================ */
const SUGGESTIONS = [
  { icon: 'wand', label: 'Personalize sua LexIA', q: 'Como personalizo o tom e o estilo da LexIA?' },
  { icon: 'pieChart', label: 'Analisar este painel para obter insights', q: 'Analise este painel financeiro e me dê insights' },
  { icon: 'fileText', label: 'Minutar um contrato de honorários', q: 'Quero minutar um contrato de honorários' },
  { icon: 'wallet', label: 'Quem está com honorários vencidos?', q: 'Quem está com honorários vencidos?' },
];

const MODELS = [
  { id: 'auto', name: 'Automático', desc: 'A LexIA escolhe o melhor modelo' },
  { id: 'fast', name: 'LexIA Rápido', desc: 'Respostas ágeis para tarefas simples' },
  { id: 'deep', name: 'LexIA Avançado', desc: 'Raciocínio jurídico aprofundado' },
];

const LexiaAI = ({ defaultMode = 'float', greetingName = 'Rafael', showBanner = true, dock = 'right', onLayoutChange }) => {
  const [mode, setMode] = useAIState(defaultMode);     // 'float' | 'sidebar' | 'full'
  const [open, setOpen] = useAIState(true);
  const [thread, setThread] = useAIState([]);
  const [input, setInput] = useAIState('');
  const [thinking, setThinking] = useAIState(false);
  const [layoutMenu, setLayoutMenu] = useAIState(false);
  const [modelMenu, setModelMenu] = useAIState(false);
  const [model, setModel] = useAIState('auto');
  const [hasContext, setHasContext] = useAIState(true);
  const scrollRef = useAIRef(null);

  useAIEffect(() => { setMode(defaultMode); }, [defaultMode]);
  useAIEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [thread, thinking]);
  // reporta a ocupação de layout p/ a página reagir (responsiva quando a barra lateral abre)
  useAIEffect(() => { if (onLayoutChange) onLayoutChange({ mode, open, dock }); }, [mode, open, dock]);

  const send = (text) => {
    const t = (text != null ? text : input).trim();
    if (!t || thinking) return;
    setInput('');
    setThread((p) => [...p, { role: 'user', text: t }]);
    setThinking(true);
    setTimeout(() => {
      const r = lexiaReply(t);
      setThinking(false);
      setThread((p) => [...p, { role: 'ai', text: r.text, cards: r.cards }]);
    }, 850 + Math.random() * 500);
  };

  const newChat = () => { setThread([]); setInput(''); };
  const isFull = mode === 'full';
  const isSidebar = mode === 'sidebar';
  const empty = thread.length === 0;
  const modelName = MODELS.find((x) => x.id === model).name;

  /* ---- Launcher (quando minimizado) -------------------------------------- */
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="lexai-launcher" title="Abrir LexIA"
        style={{ position: 'absolute', bottom: 26, right: 26, zIndex: 140 }}>
        <span className="lexai-aura lexai-aura-1" />
        <span className="lexai-aura lexai-aura-2" />
        <span className="lexai-aura lexai-aura-3" />
        <span className="lexai-orb-icon"><span className="lexai-orb-grad" /></span>
      </button>
    );
  }

  /* ---- Geometria por modo ------------------------------------------------- */
  const TOPBAR_H = 54;   // altura do topbar da shell — barra lateral começa abaixo dele
  const shell = isFull
    ? { position: 'absolute', inset: 0, zIndex: 140, borderRadius: 0, border: 'none' }
    : isSidebar
      ? { position: 'absolute', top: TOPBAR_H, bottom: 0, [dock]: 0, width: 408, zIndex: 138, borderRadius: 0,
          [`border${dock === 'right' ? 'Left' : 'Right'}`]: '1px solid var(--border)' }
      : { position: 'absolute', bottom: 24, right: 24, width: 452, height: 'min(680px, calc(100% - 110px))',
          zIndex: 140, borderRadius: 16, border: '1px solid var(--border-strong)' };

  /* ---- Cabeçalho ---------------------------------------------------------- */
  const Header = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: isFull ? '14px 18px' : '12px 12px 12px 16px',
      borderBottom: '1px solid var(--border)', background: isFull ? 'transparent' : 'var(--bg-soft)', flexShrink: 0,
      maxWidth: isFull ? 980 : 'none', margin: isFull ? '0 auto' : 0, width: isFull ? '100%' : 'auto',
    }}>
      <button className="lexai-chip-btn" onClick={newChat}>
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>Novo chat de IA</span>
        <Icon name="chevronDown" size={14} style={{ color: 'var(--text-subtle)' }} />
      </button>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
        <button className="lexai-icon-btn" title="Novo chat" onClick={newChat}><Icon name="edit" size={16} /></button>
        <button className="lexai-icon-btn" title="Layout" onClick={() => setLayoutMenu((s) => !s)}
          style={{ background: layoutMenu ? 'var(--surface-hover)' : 'transparent', color: layoutMenu ? 'var(--text)' : 'var(--text-muted)' }}>
          <Icon name="sidebar" size={16} />
        </button>
        <button className="lexai-icon-btn" title="Minimizar" onClick={() => { setOpen(false); setLayoutMenu(false); }}>
          <Icon name="chevronDown" size={17} />
        </button>

        {layoutMenu && (
          <>
            <div onClick={() => setLayoutMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
            <div className="lexai-menu crm-pop-in" style={{ position: 'absolute', top: 38, right: 0, width: 208, zIndex: 2 }}>
              <LayoutOption icon="sidebar" label="Barra lateral" active={isSidebar} onClick={() => { setMode('sidebar'); setLayoutMenu(false); }} />
              <LayoutOption icon="layoutGrid" label="Flutuante" active={mode === 'float'} onClick={() => { setMode('float'); setLayoutMenu(false); }} />
              <LayoutOption icon="x" label="Tela cheia" active={isFull} onClick={() => { setMode('full'); setLayoutMenu(false); }} />
            </div>
          </>
        )}
      </div>
    </div>
  );

  /* ---- Tela de boas-vindas ------------------------------------------------ */
  const Welcome = (
    <div style={{
      flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      justifyContent: isFull ? 'center' : 'flex-start',
      padding: isFull ? '0 24px' : '34px 20px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: isFull ? 620 : '100%', margin: '0 auto' }}>
        <div style={{ textAlign: isFull ? 'center' : 'left', marginBottom: isFull ? 30 : 24 }}>
          <div style={{ display: 'flex', justifyContent: isFull ? 'center' : 'flex-start', marginBottom: 16 }}>
            <LexAvatar size={isFull ? 60 : 46} glow />
          </div>
          <h2 style={{
            margin: 0, fontSize: isFull ? 30 : 22, fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--text)',
            lineHeight: 1.15,
          }}>Como posso ajudar, {greetingName}?</h2>
          {isFull && (
            <p style={{ margin: '10px 0 0', fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Conectada aos seus clientes, casos, contratos e financeiro.
            </p>
          )}
        </div>

        <div style={{
          display: isFull ? 'grid' : 'flex', flexDirection: 'column',
          gridTemplateColumns: isFull ? '1fr 1fr' : undefined, gap: isFull ? 10 : 2,
        }}>
          {SUGGESTIONS.map((s) => (
            <SuggestRow key={s.label} icon={s.icon} label={s.label} onClick={() => send(s.q)} />
          ))}
        </div>
      </div>
    </div>
  );

  /* ---- Lista de mensagens ------------------------------------------------- */
  const Messages = (
    <div ref={scrollRef} style={{
      flex: 1, overflowY: 'auto', padding: isFull ? '28px 24px' : '20px 18px',
    }}>
      <div style={{
        width: '100%', maxWidth: isFull ? 720 : '100%', margin: '0 auto',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {thread.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Bubble role={msg.role} wide={isFull}>{msg.text}</Bubble>
            {msg.cards && msg.cards.length > 0 && (
              <div style={{ marginLeft: msg.role === 'ai' ? 39 : 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {msg.cards.map((c, j) => <ActionCard key={j} card={c} />)}
              </div>
            )}
          </div>
        ))}
        {thinking && (
          <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
            <LexAvatar size={28} />
            <div style={{ display: 'flex', gap: 4, padding: '11px 14px', borderRadius: 14, background: 'var(--bg-sunken)' }}>
              <span className="crm-dot" style={{ animationDelay: '0ms' }} />
              <span className="crm-dot" style={{ animationDelay: '160ms' }} />
              <span className="crm-dot" style={{ animationDelay: '320ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ---- Composer ----------------------------------------------------------- */
  const Composer = (
    <div style={{ flexShrink: 0, padding: isFull ? '0 24px 24px' : '12px 14px 14px' }}>
      <div style={{ width: '100%', maxWidth: isFull ? 720 : '100%', margin: '0 auto' }}>
        {showBanner && empty && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 12px', marginBottom: 10,
            borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid var(--border-gold)',
            fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45,
          }}>
            <Icon name="zap" size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
            <span>Restam <strong style={{ color: 'var(--text)' }}>40 respostas</strong> no plano do escritório este mês. <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Gerenciar plano</a></span>
          </div>
        )}

        <div className="lexai-composer">
          {hasContext && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span className="lexai-context">
                <Icon name="wallet" size={13} style={{ color: 'var(--accent)' }} />
                Financeiro · Painel
                <button onClick={() => setHasContext(false)} className="lexai-context-x" title="Remover contexto"><Icon name="x" size={12} /></button>
              </span>
            </div>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={isFull ? 2 : 1}
            placeholder="Peça qualquer coisa à LexIA…"
            className="lexai-textarea"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <button className="lexai-icon-btn" title="Anexar"><Icon name="plus" size={17} /></button>
            <button className="lexai-icon-btn" title="Ajustes"><Icon name="sliders" size={16} /></button>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
              <button className="lexai-model" onClick={() => setModelMenu((s) => !s)}>
                {modelName}
                <Icon name="chevronDown" size={13} style={{ color: 'var(--text-subtle)' }} />
              </button>
              <button onClick={() => send()} disabled={!input.trim()} className="lexai-send"
                style={{ background: input.trim() ? 'var(--brand-gold)' : 'var(--bg-sunken)', color: input.trim() ? '#020D25' : 'var(--text-subtle)', cursor: input.trim() ? 'pointer' : 'default' }}>
                <Icon name="arrowRight" size={16} strokeWidth={2.2} style={{ transform: 'rotate(-90deg)' }} />
              </button>

              {modelMenu && (
                <>
                  <div onClick={() => setModelMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
                  <div className="lexai-menu crm-pop-in" style={{ position: 'absolute', bottom: 42, right: 0, width: 252, zIndex: 2 }}>
                    {MODELS.map((mo) => (
                      <button key={mo.id} className="lexai-menu-item" onClick={() => { setModel(mo.id); setModelMenu(false); }}
                        style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 2 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text)' }}>{mo.name}</span>
                          {model === mo.id && <Icon name="check" size={14} strokeWidth={2.4} style={{ color: 'var(--accent)', marginLeft: 'auto' }} />}
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>{mo.desc}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {isFull && (
          <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-subtle)', marginTop: 10 }}>
            A LexIA pode cometer erros. Confira informações importantes.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {isFull && <div className="lexai-fullbg" />}
      <div className={'lexai-shell ' + (mode === 'float' ? 'crm-lexia-in' : 'lexai-fade-in')}
        style={{
          ...shell,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: isFull ? 'var(--bg)' : 'var(--bg-elevated)',
          boxShadow: mode === 'float' ? '0 28px 80px rgba(2,13,37,0.5), 0 8px 24px rgba(2,13,37,0.3)' : 'none',
        }}>
        {Header}
        {empty ? Welcome : Messages}
        {Composer}
      </div>
    </>
  );
};

window.LexiaAI = LexiaAI;
