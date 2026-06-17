// LexIA · CRM — Settings modal with UAC-gated sections.

const CRM_AUDIT = [
  { who: 'Thiago Portela', when: '11/06 14:22', acao: 'Atualizou rateio', ent: 'Caso · Cavanhas' },
  { who: 'Leonardo Collares', when: '11/06 11:05', acao: 'Marcou como recebido', ent: 'Contrato H006' },
  { who: 'Marina Castro', when: '10/06 17:48', acao: 'Criou tarefa', ent: 'Tarefa T010' },
  { who: 'Leandro Nunes', when: '10/06 09:31', acao: 'Editou cliente', ent: 'Construtora Aurora' },
  { who: 'Thiago Portela', when: '09/06 16:12', acao: 'Anonimizou cliente (LGPD)', ent: 'Cliente C021' },
];
const CRM_CUSTOS = [
  { nome: 'Pró-labore · Leandro', valor: 18000, cat: 'pró-labore', dia: 5, conta: 'Itaú · Escritório', ativo: true },
  { nome: 'Pró-labore · Leonardo', valor: 18000, cat: 'pró-labore', dia: 5, conta: 'Itaú · Escritório', ativo: true },
  { nome: 'Aluguel', valor: 11600, cat: 'operacional', dia: 10, conta: 'Bradesco · PJ', ativo: true },
  { nome: 'Folha · equipe', valor: 24800, cat: 'operacional', dia: 5, conta: 'Itaú · Escritório', ativo: true },
  { nome: 'Sistemas & software', valor: 8400, cat: 'operacional', dia: 1, conta: 'Bradesco · PJ', ativo: true },
];

const CrmField = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <FxLabel>{label}</FxLabel>
    {children}
  </div>
);
const CrmSwitch = ({ on, onChange }) => (
  <button onClick={onChange} style={{ width: 38, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 2, background: on ? 'var(--accent)' : 'var(--border-strong)', transition: 'background .15s', flexShrink: 0 }}>
    <span style={{ display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transform: on ? 'translateX(16px)' : 'translateX(0)', transition: 'transform .15s' }}></span>
  </button>
);

const CrmSettings = ({ role, theme, onSetTheme, onClose, onAnonimizar }) => {
  const { toast } = useCrmToast();
  const all = [
    { id: 'perfil', label: 'Perfil', icon: 'user', roles: ['admin', 'socio', 'staff'] },
    { id: 'aparencia', label: 'Aparência', icon: 'sun', roles: ['admin', 'socio', 'staff'] },
    { id: 'usuarios', label: 'Usuários & permissões', icon: 'users', roles: ['admin'] },
    { id: 'financeiro', label: 'Financeiro', icon: 'wallet', roles: ['admin', 'socio'] },
    { id: 'escritorio', label: 'Escritório & documentos', icon: 'building', roles: ['admin'] },
    { id: 'importacao', label: 'Importação & integrações', icon: 'upload', roles: ['admin'] },
    { id: 'lgpd', label: 'LGPD & Auditoria', icon: 'scale', roles: ['admin'] },
  ];
  const visible = all.filter((s) => s.roles.includes(role));
  const [sec, setSec] = crmUseState('perfil');
  crmUseEffect(() => { if (!visible.find((v) => v.id === sec)) setSec('perfil'); }, [role]);

  crmUseEffect(() => { const h = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);

  return (
    <div onMouseDown={onClose} style={{ position: 'absolute', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,13,37,0.42)', backdropFilter: 'blur(4px)', padding: 24 }}>
      <div onMouseDown={(e) => e.stopPropagation()} className="crm-pop-in" style={{ width: 820, maxWidth: '100%', height: 580, maxHeight: '92%', display: 'flex', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        {/* nav */}
        <div style={{ width: 232, flexShrink: 0, background: 'var(--bg-soft)', borderRight: '1px solid var(--border)', padding: '18px 12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)', padding: '0 8px 14px' }}>Configurações</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {visible.map((s) => (
              <button key={s.id} onClick={() => setSec(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: sec === s.id ? 'var(--accent-soft)' : 'transparent', color: sec === s.id ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 13, fontWeight: sec === s.id ? 600 : 500, fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em',
              }}><Icon name={s.icon} size={16} />{s.label}</button>
            ))}
          </div>
          <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--text-subtle)', padding: '0 8px', lineHeight: 1.5 }}>Seções visíveis conforme seu papel ({role}).</div>
        </div>
        {/* content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em' }}>{visible.find((v) => v.id === sec)?.label}</div>
            <button onClick={onClose} className="btn btn-ghost" style={{ width: 30, height: 30, padding: 0, borderRadius: 8 }}><Icon name="x" size={16} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
            {sec === 'perfil' && (
              <div style={{ maxWidth: 420 }}>
                <CrmField label="Nome"><FxInput defaultValue="Thiago Portela" /></CrmField>
                <CrmField label="E-mail"><FxInput defaultValue="thiago@ncmadv.com.br" /></CrmField>
                <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0 16px' }}></div>
                <CrmField label="Senha atual"><FxInput type="password" defaultValue="********" /></CrmField>
                <CrmField label="Nova senha"><FxInput type="password" placeholder="Mín. 8 caracteres" /></CrmField>
                <button className="btn btn-primary" onClick={() => toast('Perfil atualizado')} style={{ marginTop: 6 }}>Salvar alterações</button>
              </div>
            )}
            {sec === 'aparencia' && (
              <div style={{ maxWidth: 460 }}>
                <FxLabel>Tema</FxLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 4 }}>
                  {[{ id: 'light', label: 'Claro', icon: 'sun' }, { id: 'dark', label: 'Escuro', icon: 'moon' }, { id: 'system', label: 'Sistema', icon: 'sliders' }].map((t) => {
                    const on = (t.id === 'system' ? false : theme === t.id);
                    return (
                      <button key={t.id} onClick={() => { if (t.id !== 'system') onSetTheme(t.id); toast(`Tema: ${t.label}`); }} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, padding: '18px 10px', borderRadius: 12, cursor: 'pointer',
                        border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface)', color: on ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-sans)',
                      }}>
                        <Icon name={t.icon} size={20} /><span style={{ fontSize: 12, fontWeight: 500 }}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {sec === 'usuarios' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{CRM_USERS.length} usuários</div>
                  <button className="btn btn-primary" onClick={() => toast('Convite enviado')} style={{ height: 32, fontSize: 12 }}><Icon name="userPlus" size={14} />Novo usuário</button>
                </div>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {CRM_USERS.map((u, i) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                      <CrmAvatar name={u.nome} iniciais={u.iniciais} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{u.nome}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{u.email}</div>
                      </div>
                      <CrmBadge tone={u.role === 'admin' ? 'gold' : u.role === 'socio' ? 'blue' : 'neutral'}>{u.role === 'admin' ? 'Administrador' : u.role === 'socio' ? 'Sócio' : 'Equipe'}</CrmBadge>
                      <CrmBadge tone={u.ativo ? 'pos' : 'neg'} dot>{u.ativo ? 'Ativo' : 'Inativo'}</CrmBadge>
                      <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}><Icon name="moreHorizontal" size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sec === 'financeiro' && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Custos fixos & pró-labore</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Alimentam o DRE e o ponto de equilíbrio.</div>
                <div className="card" style={{ overflow: 'hidden', marginBottom: 18 }}>
                  {CRM_CUSTOS.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.nome}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{c.cat} · dia {c.dia} · {c.conta}</div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{fxMoney(c.valor)}</span>
                      <CrmSwitch on={c.ativo} onChange={() => toast('Custo atualizado')} />
                    </div>
                  ))}
                </div>
                <button className="btn btn-secondary" onClick={() => toast('Novo custo')}><Icon name="plus" size={14} />Adicionar custo</button>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: '24px 0 12px' }}>Contas</div>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {CRM_CONTAS.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                      <Icon name="banknote" size={16} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c}</span>
                      <CrmSwitch on={true} onChange={() => toast('Conta atualizada')} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sec === 'escritorio' && (
              <div style={{ maxWidth: 460 }}>
                <CrmField label="Razão social"><FxInput defaultValue="NCM Advogados Associados" /></CrmField>
                <CrmField label="CNPJ"><FxInput defaultValue="42.118.776/0001-09" /></CrmField>
                <CrmField label="Endereço"><FxInput defaultValue="Av. Paulista, 1842 · cj. 71 · São Paulo/SP" /></CrmField>
                <CrmField label="Dados bancários (documentos)"><FxInput defaultValue="Itaú · Ag. 0182 · CC 45821-0" /></CrmField>
                <CrmField label="Timbrado / logotipo">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', border: '1px dashed var(--border-strong)', borderRadius: 12, color: 'var(--text-muted)' }}>
                    <Icon name="upload" size={18} /><span style={{ fontSize: 12 }}>Arraste o logotipo (PNG/SVG) ou clique para enviar</span>
                  </div>
                </CrmField>
                <button className="btn btn-primary" onClick={() => toast('Dados do escritório salvos')} style={{ marginTop: 6 }}>Salvar</button>
              </div>
            )}
            {sec === 'importacao' && (
              <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[{ t: 'Backup Astrea', s: 'Última importação: 09/06/2026 · 253 clientes, 129 casos', ic: 'refreshCw', btn: 'Reimportar' }, { t: 'Leads · CSV Genions', s: 'Última importação: 02/06/2026 · 14 leads', ic: 'upload', btn: 'Importar CSV' }].map((x, i) => (
                  <div key={i} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={x.ic} size={18} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{x.t}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>{x.s}</div>
                    </div>
                    <button className="btn btn-secondary" onClick={() => toast(x.btn + ' iniciada')} style={{ height: 32 }}>{x.btn}</button>
                  </div>
                ))}
              </div>
            )}
            {sec === 'lgpd' && (
              <div>
                <div className="card" style={{ padding: 16, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(192,73,47,0.12)', color: 'var(--fin-neg,#C0492F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="alertTriangle" size={18} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Anonimização de cliente (LGPD)</div>
                    <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>Apaga dados pessoais mantendo o histórico financeiro. Ação irreversível.</div>
                  </div>
                  <button className="btn btn-secondary" onClick={() => { onClose(); onAnonimizar(); }} style={{ height: 32 }}>Selecionar cliente</button>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>Trilha de auditoria</div>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {CRM_AUDIT.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-subtle)', width: 78, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{a.when}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--text)' }}><strong style={{ fontWeight: 500 }}>{a.who}</strong> · {a.acao}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{a.ent}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

window.CrmSettings = CrmSettings;
