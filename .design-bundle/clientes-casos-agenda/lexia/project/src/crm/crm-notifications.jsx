// LexIA · CRM — Central de notificações.
// Provider (estado + fila de toasts) + sino com dropdown + toasts estilo Apple (canto sup. direito)
// + página /notificações com as notificações de todos os módulos. Segue os tokens do projeto.

const { useState: ntfUseState, useEffect: ntfUseEffect, useRef: ntfUseRef, useMemo: ntfUseMemo, useContext: ntfUseContext } = React;

// ---- metadados por módulo (ícone + rótulo + página de destino) ----
const CRM_NTF_MODS = {
  prazos:      { icon: 'clock',      label: 'Prazos',      page: 'contencioso' },
  contencioso: { icon: 'scale',      label: 'Contencioso', page: 'contencioso' },
  financeiro:  { icon: 'wallet',     label: 'Financeiro',  page: 'financeiro' },
  agenda:      { icon: 'calendar',   label: 'Agenda',      page: 'agenda' },
  clientes:    { icon: 'users',      label: 'Clientes',    page: 'clientes' },
  casos:       { icon: 'briefcase',  label: 'Casos',       page: 'casos' },
  contratos:   { icon: 'receipt',    label: 'Contratos',   page: 'contratos' },
  documentos:  { icon: 'fileText',   label: 'Documentos',  page: 'documentos' },
  comercial:   { icon: 'megaphone',  label: 'Comercial',   page: 'comercial' },
  tarefas:     { icon: 'listChecks', label: 'Tarefas',     page: 'tarefas' },
  ia:          { icon: 'sparkles',   label: 'LexIA',       page: 'documentos' },
};

// tom semântico → cor do ícone/preenchimento do tile (dourado reservado p/ IA)
const crmNtfTone = (tone) => {
  switch (tone) {
    case 'crit': return { fg: 'var(--crit)',   bg: 'var(--crit-soft)' };
    case 'warn': return { fg: 'var(--warn)',   bg: 'var(--warn-soft)' };
    case 'ok':   return { fg: 'var(--ok)',     bg: 'var(--ok-soft)' };
    case 'ai':   return { fg: 'var(--accent)', bg: 'var(--accent-soft)' };
    default:     return { fg: 'var(--text-muted)', bg: 'var(--bg-sunken)' };
  }
};

const crmNtfAgo = (min) =>
  min < 1 ? 'agora'
  : min < 60 ? `há ${min} min`
  : min < 1440 ? `há ${Math.floor(min / 60)} h`
  : min < 2880 ? 'ontem'
  : `há ${Math.floor(min / 1440)} d`;

const crmNtfBucket = (min) => (min < 1440 ? 'Hoje' : min < 2880 ? 'Ontem' : 'Anteriores');

// ---- semente: notificações dos módulos ----
const CRM_NTF_SEED = [
  { id: 'n1',  mod: 'prazos',     tone: 'crit', min: 4,    read: false, title: 'Prazo fatal em 2 dias', body: 'Contestação · Proc. 1002345-66.2026 · Construtora Atlas Engenharia' },
  { id: 'n2',  mod: 'ia',         tone: 'ai',   min: 12,   read: false, title: 'LexIA revisou um contrato', body: 'Cláusula 8 de Marina Duarte pode gerar multa rescisória. Toque para revisar.' },
  { id: 'n3',  mod: 'agenda',     tone: 'warn', min: 26,   read: false, title: 'Audiência amanhã, 14h00', body: 'Conciliação · Fórum João Mendes Jr. · Sala 802' },
  { id: 'n4',  mod: 'financeiro', tone: 'ok',   min: 58,   read: false, title: 'Honorário recebido', body: 'R$ 18.500,00 · Contrato Atlas Engenharia · conta Itaú' },
  { id: 'n5',  mod: 'contencioso',tone: 'neutral', min: 92, read: true, title: 'Nova publicação no DJe', body: 'Despacho saneador · 14ª Vara Cível Central · Proc. Vega Cosméticos' },
  { id: 'n6',  mod: 'documentos', tone: 'ai',   min: 140,  read: true,  title: 'Documento gerado pela LexIA', body: 'Petição inicial — Marina Duarte pronta para revisão (1.184 palavras)' },
  { id: 'n7',  mod: 'clientes',   tone: 'neutral', min: 300, read: true, title: 'Novo cliente cadastrado', body: 'Construtora Atlas Engenharia Ltda · PJ · São Paulo/SP' },
  { id: 'n8',  mod: 'financeiro', tone: 'crit', min: 520,  read: true,  title: 'Honorário vencido', body: 'R$ 6.200,00 · Marina Duarte · vencido há 3 dias' },
  { id: 'n9',  mod: 'comercial',  tone: 'neutral', min: 1520, read: true, title: 'Novo lead pelo site', body: 'Rescisão contratual trabalhista · contato em até 24h' },
  { id: 'n10', mod: 'contratos',  tone: 'ok',   min: 1680, read: true,  title: 'Contrato assinado', body: 'Aditivo de honorários · Marina Duarte · assinatura eletrônica' },
  { id: 'n11', mod: 'tarefas',    tone: 'neutral', min: 1760, read: true, title: 'Tarefa atribuída a você', body: 'Revisar minuta de acordo até sexta · por Leandro Nunes' },
  { id: 'n12', mod: 'casos',      tone: 'neutral', min: 3010, read: true, title: 'Rateio do caso atualizado', body: 'Caso Vega Cosméticos · 60% Leandro · 40% Leonardo' },
  { id: 'n13', mod: 'prazos',     tone: 'warn', min: 4400, read: true,  title: 'Tréplica protocolada', body: 'Proc. 1008812-09.2025 · prazo cumprido dentro do período' },
];

// ---- demos p/ o botão "Simular" e o toast de boas-vindas ----
const CRM_NTF_DEMOS = [
  { mod: 'prazos',     tone: 'crit', title: 'Novo prazo intimado', body: 'Embargos de declaração · 5 dias úteis · Proc. Atlas Engenharia' },
  { mod: 'financeiro', tone: 'ok',   title: 'Honorário recebido', body: 'R$ 12.300,00 · Vega Cosméticos · conta Itaú' },
  { mod: 'ia',         tone: 'ai',   title: 'LexIA terminou a análise', body: 'Resumo do processo gerado — 3 riscos sinalizados.' },
  { mod: 'agenda',     tone: 'warn', title: 'Reunião em 30 minutos', body: 'Alinhamento com Construtora Atlas · sala virtual' },
  { mod: 'contencioso',tone: 'neutral', title: 'Nova publicação no DJe', body: 'Sentença publicada · 9ª Vara Cível · Proc. Marina Duarte' },
];

// =====================================================================
// Provider + contexto
// =====================================================================
const CrmNtfCtx = React.createContext(null);
const useCrmNtf = () => ntfUseContext(CrmNtfCtx);

const CrmNtfProvider = ({ nav, children }) => {
  const [list, setList] = ntfUseState(CRM_NTF_SEED);
  const [toasts, setToasts] = ntfUseState([]);
  const timers = ntfUseRef({});
  const demoIx = ntfUseRef(0);

  const unread = list.filter((n) => !n.read).length;
  const markRead = (id) => setList((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllRead = () => setList((l) => l.map((n) => ({ ...n, read: true })));
  const remove = (id) => setList((l) => l.filter((n) => n.id !== id));

  const dismissToast = (id) => {
    if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id]; }
    setToasts((t) => t.filter((x) => x.id !== id));
  };

  const push = (n) => {
    const id = 'nt' + Math.random().toString(36).slice(2, 7);
    const item = { tone: 'neutral', read: false, min: 0, ...n, id };
    setList((l) => [item, ...l]);
    setToasts((t) => [...t.slice(-2), item]); // no máx. 3 toasts visíveis
    timers.current[id] = setTimeout(() => dismissToast(id), n.duration || 6500);
  };
  const simulate = () => { push(CRM_NTF_DEMOS[demoIx.current % CRM_NTF_DEMOS.length]); demoIx.current += 1; };

  const openPage = (page) => { if (nav) nav(page); };
  const onOpen = (n) => { markRead(n.id); const m = CRM_NTF_MODS[n.mod]; if (m) openPage(m.page); };

  // toast de demonstração logo após o carregamento (p/ o estilo Apple ficar visível)
  ntfUseEffect(() => {
    const t = setTimeout(() => push(CRM_NTF_DEMOS[0]), 1400);
    return () => { clearTimeout(t); Object.values(timers.current).forEach(clearTimeout); };
  }, []);

  const val = { list, unread, markRead, markAllRead, remove, push, simulate, openPage, onOpen };
  return (
    <CrmNtfCtx.Provider value={val}>
      {children}
      <CrmNtfToastStack toasts={toasts} onDismiss={dismissToast} onOpen={(n) => { dismissToast(n.id); onOpen(n); }} />
      <style>{CRM_NTF_CSS}</style>
    </CrmNtfCtx.Provider>
  );
};

// =====================================================================
// Tile de ícone do módulo (a "app icon" do estilo Apple)
// =====================================================================
const CrmNtfTile = ({ mod, tone, size = 38 }) => {
  const m = CRM_NTF_MODS[mod] || { icon: 'bell' };
  const tc = crmNtfTone(tone);
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: tc.bg, color: tc.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={m.icon} size={Math.round(size * 0.46)} strokeWidth={1.85} />
    </div>
  );
};

// =====================================================================
// Toast estilo Apple — canto superior direito
// =====================================================================
const CrmNtfToast = ({ n, onDismiss, onOpen }) => {
  const m = CRM_NTF_MODS[n.mod] || { label: 'LexIA' };
  const [leaving, setLeaving] = ntfUseState(false);
  const close = (e) => { if (e) e.stopPropagation(); setLeaving(true); setTimeout(() => onDismiss(n.id), 190); };
  return (
    <div onClick={() => onOpen(n)} className={`crm-ntf-glass crm-ntf-toast${leaving ? ' leaving' : ''}`}
      style={{ display: 'flex', gap: 12, padding: 13, alignItems: 'flex-start', border: '1px solid var(--border)' }}>
      <CrmNtfTile mod={n.mod} tone={n.tone} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-subtle)', flexShrink: 0 }}>{crmNtfAgo(n.min || 0)}</span>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em', marginTop: 3 }}>{n.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</div>
      </div>
      <button onClick={close} className="crm-ntf-x" aria-label="Dispensar" style={ntfXStyle}>
        <Icon name="x" size={13} />
      </button>
    </div>
  );
};

const CrmNtfToastStack = ({ toasts, onDismiss, onOpen }) => (
  <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 300, width: 360, maxWidth: 'calc(100% - 32px)', display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
    {toasts.slice().reverse().map((n) => (
      <div key={n.id} style={{ pointerEvents: 'auto' }}>
        <CrmNtfToast n={n} onDismiss={onDismiss} onOpen={onOpen} />
      </div>
    ))}
  </div>
);

const ntfXStyle = {
  width: 22, height: 22, borderRadius: 6, border: 'none', background: 'transparent',
  color: 'var(--text-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', flexShrink: 0, marginTop: -1, marginRight: -2,
};

// =====================================================================
// Linha de notificação (usada no dropdown e na página)
// =====================================================================
const CrmNtfRow = ({ n, onOpen, onRemove }) => {
  const m = CRM_NTF_MODS[n.mod] || { label: 'LexIA' };
  return (
    <div onClick={() => onOpen && onOpen(n)} className="crm-ntf-item"
      style={{ display: 'flex', gap: 12, padding: '11px 12px', borderRadius: 10, cursor: 'pointer', alignItems: 'flex-start', position: 'relative' }}>
      <CrmNtfTile mod={n.mod} tone={n.tone} size={36} />
      <div style={{ flex: 1, minWidth: 0, paddingRight: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: n.read ? 500 : 600, color: 'var(--text)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
          <span style={{ fontSize: 11, color: 'var(--text-subtle)', flexShrink: 0 }}>{crmNtfAgo(n.min || 0)}</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
      </div>
      {/* indicador não-lida */}
      {!n.read && <span style={{ position: 'absolute', top: 16, right: 12, width: 7, height: 7, borderRadius: '50%', background: 'var(--brand-gold)', flexShrink: 0 }} />}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(n.id); }} className="crm-ntf-x" aria-label="Remover" style={{ ...ntfXStyle, position: 'absolute', top: 9, right: 8 }}>
          <Icon name="x" size={13} />
        </button>
      )}
    </div>
  );
};

// =====================================================================
// Sino + dropdown (Notification Center)
// =====================================================================
const CrmNtfBell = () => {
  const ctx = useCrmNtf();
  const [open, setOpen] = ntfUseState(false);
  const [tab, setTab] = ntfUseState('todas'); // 'todas' | 'nao'
  if (!ctx) return null;
  const { list, unread, markAllRead, openPage, onOpen, simulate } = ctx;

  const shown = (tab === 'nao' ? list.filter((n) => !n.read) : list).slice().sort((a, b) => a.min - b.min).slice(0, 8);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen((o) => !o)} title="Notificações" style={{
        width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-strong)',
        background: open ? 'var(--surface-hover)' : 'var(--surface)', color: open ? 'var(--text)' : 'var(--text-muted)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'background .12s, color .12s',
      }}>
        <Icon name="bell" size={16} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999,
            background: 'var(--brand-gold)', color: '#020D25', fontSize: 10.5, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums',
            border: '2px solid var(--bg)', lineHeight: 1,
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 190 }} />
          <div className="crm-ntf-glass crm-ntf-pop" style={{ position: 'absolute', top: 44, right: 0, zIndex: 191, width: 384, border: '1px solid var(--border)' }}>
            {/* cabeçalho */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px 11px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Notificações</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginTop: 1 }}>{unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}</div>
              </div>
              <button onClick={markAllRead} disabled={!unread} title="Marcar todas como lidas" style={{
                display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 9px', borderRadius: 7,
                border: 'none', background: 'transparent', cursor: unread ? 'pointer' : 'default', opacity: unread ? 1 : 0.4,
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--accent)',
              }}>
                <Icon name="checkCircle" size={14} /> Marcar lidas
              </button>
            </div>

            {/* abas todas / não lidas */}
            <div style={{ display: 'flex', gap: 6, padding: '0 14px 10px' }}>
              {[{ id: 'todas', label: 'Todas' }, { id: 'nao', label: `Não lidas${unread ? ' · ' + unread : ''}` }].map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  height: 28, padding: '0 11px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  fontSize: 12, fontWeight: 500, letterSpacing: '-0.01em',
                  border: '1px solid ' + (tab === t.id ? 'transparent' : 'var(--border)'),
                  background: tab === t.id ? 'var(--accent-soft)' : 'transparent',
                  color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* lista */}
            <div className="crm-ntf-scroll" style={{ maxHeight: 408, overflowY: 'auto', padding: '6px 8px' }}>
              {shown.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, margin: '0 auto 12px', background: 'var(--bg-sunken)', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="checkCircle" size={19} /></div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma notificação não lida.</div>
                </div>
              ) : shown.map((n) => (
                <CrmNtfRow key={n.id} n={n} onOpen={(x) => { onOpen(x); setOpen(false); }} />
              ))}
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* rodapé */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
              <button onClick={simulate} title="Simular uma notificação recebida" style={{
                display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px', borderRadius: 8,
                border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                fontSize: 12.5, fontWeight: 500, color: 'var(--text-muted)',
              }}>
                <Icon name="zap" size={14} /> Simular
              </button>
              <button onClick={() => { openPage('notificacoes'); setOpen(false); }} style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 8,
                border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                fontSize: 12.5, fontWeight: 600, color: 'var(--accent)',
              }}>
                Ver todas <Icon name="arrowRight" size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// =====================================================================
// Página /notificações — notificações de todos os módulos
// =====================================================================
const CrmNtfFilterChip = ({ active, onClick, icon, children, count }) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 7, height: 32, padding: '0 12px', borderRadius: 999,
    cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 500, letterSpacing: '-0.01em',
    whiteSpace: 'nowrap', transition: 'background .12s, color .12s, border-color .12s',
    border: '1px solid ' + (active ? 'transparent' : 'var(--border)'),
    background: active ? 'var(--accent-soft)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
  }}>
    {icon && <Icon name={icon} size={14} />}
    {children}
    {count != null && <span style={{ fontSize: 11, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>}
  </button>
);

const CrmNotificacoesPage = () => {
  const ctx = useCrmNtf();
  const [mod, setMod] = ntfUseState('todas');
  const [onlyUnread, setOnlyUnread] = ntfUseState(false);
  if (!ctx) return null;
  const { list, unread, markAllRead, remove, onOpen, simulate } = ctx;

  // módulos presentes na lista, ordem fixa do CRM_NTF_MODS
  const present = Object.keys(CRM_NTF_MODS).filter((k) => list.some((n) => n.mod === k));

  let filtered = list.slice().sort((a, b) => a.min - b.min);
  if (mod !== 'todas') filtered = filtered.filter((n) => n.mod === mod);
  if (onlyUnread) filtered = filtered.filter((n) => !n.read);

  // agrupar por período
  const buckets = ['Hoje', 'Ontem', 'Anteriores'];
  const grouped = buckets.map((b) => ({ label: b, items: filtered.filter((n) => crmNtfBucket(n.min) === b) })).filter((g) => g.items.length);

  return (
    <FxFrame>
      <CrmPageHead
        title="Notificações"
        sub={unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''} · todos os módulos do escritório` : 'Tudo em dia · todos os módulos do escritório'}
        right={(
          <>
            <button className="btn btn-secondary btn-sm" onClick={simulate}><Icon name="zap" size={14} /> Simular</button>
            <button className="btn btn-secondary btn-sm" onClick={markAllRead} disabled={!unread}><Icon name="checkCircle" size={14} /> Marcar todas como lidas</button>
          </>
        )}
      />

      {/* filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        <CrmNtfFilterChip active={mod === 'todas'} onClick={() => setMod('todas')} count={list.length}>Todas</CrmNtfFilterChip>
        {present.map((k) => (
          <CrmNtfFilterChip key={k} active={mod === k} onClick={() => setMod(k)} icon={CRM_NTF_MODS[k].icon} count={list.filter((n) => n.mod === k).length}>{CRM_NTF_MODS[k].label}</CrmNtfFilterChip>
        ))}
        <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px' }} />
        <CrmNtfFilterChip active={onlyUnread} onClick={() => setOnlyUnread((v) => !v)} icon={onlyUnread ? 'check' : 'filter'}>Só não lidas</CrmNtfFilterChip>
      </div>

      {/* grupos */}
      {grouped.length === 0 ? (
        <div className="card" style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, margin: '0 auto 14px', background: 'var(--bg-sunken)', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="inbox" size={22} /></div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Nenhuma notificação aqui</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5 }}>Ajuste os filtros para ver outras notificações.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {grouped.map((g) => (
            <div key={g.label}>
              <div className="eyebrow" style={{ marginBottom: 10, paddingLeft: 2 }}>{g.label}</div>
              <div className="card" style={{ padding: 6, display: 'flex', flexDirection: 'column' }}>
                {g.items.map((n, i) => (
                  <React.Fragment key={n.id}>
                    {i > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '0 12px' }} />}
                    <CrmNtfRow n={n} onOpen={onOpen} onRemove={remove} />
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </FxFrame>
  );
};

// =====================================================================
// CSS (injetado uma vez pelo provider) — vidro fosco + animações
// =====================================================================
const CRM_NTF_CSS = `
.crm-ntf-glass { background: var(--bg-elevated); }
@supports ((backdrop-filter: blur(2px)) or (-webkit-backdrop-filter: blur(2px))) {
  .theme-light .crm-ntf-glass { background: color-mix(in srgb, #FFFFFF 72%, transparent); -webkit-backdrop-filter: blur(22px) saturate(160%); backdrop-filter: blur(22px) saturate(160%); }
  .theme-dark  .crm-ntf-glass { background: color-mix(in srgb, #15264A 58%, transparent); -webkit-backdrop-filter: blur(22px) saturate(160%); backdrop-filter: blur(22px) saturate(160%); }
}
.crm-ntf-pop { border-radius: var(--r-lg); box-shadow: var(--shadow-md); overflow: hidden; transform-origin: top right; animation: crmNtfPop .18s cubic-bezier(.22,1,.36,1); }
/* entrada SÓ por transform (opacidade fica 1): aba em segundo plano/throttled congela a
   animação no frame 0 — se animássemos opacidade, o conteúdo ficaria invisível para sempre. */
@keyframes crmNtfPop { from { transform: translateY(-6px) scale(.98); } to { transform: none; } }
.crm-ntf-toast { border-radius: var(--r-lg); box-shadow: var(--shadow-md); cursor: pointer; transition: transform .16s var(--ease), box-shadow .16s ease; animation: crmNtfToastIn .3s cubic-bezier(.22,1,.36,1); will-change: transform; }
.crm-ntf-toast:hover { transform: scale(1.015); box-shadow: var(--shadow-lg); }
.crm-ntf-toast.leaving { animation: crmNtfToastOut .19s ease forwards; pointer-events: none; }
@keyframes crmNtfToastIn { from { transform: translateY(-18px) scale(.965); } to { transform: none; } }
@keyframes crmNtfToastOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(20px) scale(.96); } }
.crm-ntf-item { transition: background .12s; }
.crm-ntf-item:hover { background: var(--surface-hover); }
.crm-ntf-x { opacity: 0; }
.crm-ntf-toast:hover .crm-ntf-x, .crm-ntf-item:hover .crm-ntf-x { opacity: 1; }
.crm-ntf-x:hover { background: var(--bg-sunken); color: var(--text); }
.crm-ntf-scroll::-webkit-scrollbar { width: 8px; }
.crm-ntf-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 999px; }
@media (prefers-reduced-motion: reduce) {
  .crm-ntf-pop, .crm-ntf-toast, .crm-ntf-toast.leaving { animation: none !important; }
}
`;

Object.assign(window, {
  CRM_NTF_MODS, CRM_NTF_SEED, crmNtfTone, crmNtfAgo, crmNtfBucket,
  CrmNtfProvider, useCrmNtf, CrmNtfBell, CrmNtfRow, CrmNtfTile, CrmNotificacoesPage,
});
