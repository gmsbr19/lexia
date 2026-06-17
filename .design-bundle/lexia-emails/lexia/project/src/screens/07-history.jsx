// History — list of all generated documents
const DocRow = ({ name, type, client, author, date, status, size, source }) => (
  <tr style={{ borderTop: '1px solid var(--border)' }}>
    <td style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 28, height: 36, borderRadius: 4,
          background: '#FFFFFF',
          border: '1px solid var(--border-strong)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: 4,
          flexShrink: 0, position: 'relative',
        }}>
          <span style={{
            fontSize: 7, fontWeight: 500, letterSpacing: '0.04em',
            color: '#020D25', fontFamily: 'var(--font-mono)',
          }}>{type === 'Contrato' ? 'CT' : type === 'Procuração' ? 'PR' : type === 'Proposta' ? 'PP' : 'PJ'}</span>
          <span style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 3, background: '#C0A147', borderRadius: '4px 4px 0 0',
          }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>
            <span>{type}</span>
            <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'currentColor', opacity: 0.5 }} />
            <span>{size}</span>
            {source === 'ai' && (
              <>
                <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'currentColor', opacity: 0.5 }} />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--accent)' }}>
                  <Icon name="sparkles" size={9} strokeWidth={2} />
                  IA
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </td>
    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{client}</td>
    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--bg-sunken)',
          color: 'var(--text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9.5, fontWeight: 500,
        }}>{author.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
        {author}
      </div>
    </td>
    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-subtle)' }}>{date}</td>
    <td style={{ padding: '12px 16px' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 500,
        padding: '3px 8px', borderRadius: 6,
        background: status === 'Finalizado' ? 'rgba(46, 160, 67, 0.12)' :
                    status === 'Rascunho' ? 'var(--bg-sunken)' :
                    status === 'Assinado' ? 'var(--accent-soft)' :
                    'rgba(2, 13, 37, 0.06)',
        color: status === 'Finalizado' ? '#2ea043' :
               status === 'Rascunho' ? 'var(--text-muted)' :
               status === 'Assinado' ? 'var(--accent)' :
               'var(--text-muted)',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
        {status}
      </span>
    </td>
    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
      <div style={{ display: 'inline-flex', gap: 4 }}>
        <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
          <Icon name="download" size={14} />
        </button>
        <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}>
          <Icon name="moreHorizontal" size={14} />
        </button>
      </div>
    </td>
  </tr>
);

const HistoryScreen = () => (
  <AppShell
    active="documentos"
    breadcrumb={['Documentos']}
    tabs={<DocTabs active="meus" />}
    actions={
      <button className="btn btn-primary" style={{ height: 32, fontSize: 12 }}>
        <Icon name="plus" size={13} />
        Novo documento
      </button>
    }
  >
    <div style={{ padding: '28px 40px 40px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          margin: 0, fontSize: 25, fontWeight: 500,
          letterSpacing: '-0.025em', color: 'var(--text)',
        }}>Meus documentos</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
          142 documentos · 38 nos últimos 30 dias
        </p>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12, marginBottom: 24,
      }}>
        {[
          { label: 'Contratos', count: 76, trend: '+12%' },
          { label: 'Procurações', count: 38, trend: '+4%' },
          { label: 'Pareceres', count: 19, trend: '−2%' },
          { label: 'Propostas', count: 9, trend: '+22%' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
              {s.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {s.count}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 500,
                color: s.trend.startsWith('+') ? '#2ea043' : '#d97706',
              }}>
                {s.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 14,
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}>
            <Icon name="search" size={14} />
          </div>
          <input className="input" placeholder="Buscar por nome, cliente, número..." style={{
            paddingLeft: 36, height: 34, fontSize: 13,
          }} />
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-soft)', borderRadius: 8, padding: 3 }}>
          {['Todos', 'Contratos', 'Procurações', 'Propostas', 'Pareceres'].map((t, i) => (
            <button key={t} style={{
              height: 26, padding: '0 10px', borderRadius: 6, border: 'none',
              background: i === 0 ? 'var(--surface)' : 'transparent',
              color: i === 0 ? 'var(--text)' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              boxShadow: i === 0 ? 'var(--shadow-sm)' : 'none',
            }}>{t}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" style={{ height: 32, fontSize: 12 }}>
          <Icon name="filter" size={13} />
          Filtros
        </button>
        <button className="btn btn-secondary" style={{ height: 32, fontSize: 12 }}>
          <Icon name="calendar" size={13} />
          Últimos 30 dias
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-soft)' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Documento</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cliente</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Autor</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Atualizado</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <DocRow name="Contrato de Honorários — Helena Vargas" type="Contrato" client="Helena Vargas" author="Rafael Moraes" date="há 4 min" status="Finalizado" size="324 KB" source="ai" />
            <DocRow name="Procuração ad judicia — Construtora Aurora S/A" type="Procuração" client="Aurora S/A" author="Camila Reis" date="ontem · 17:42" status="Assinado" size="118 KB" source="manual" />
            <DocRow name="Parecer — Cláusula 4.2 do contrato Mendonça" type="Parecer Jurídico" client="Mendonça & Filhos" author="Rafael Moraes" date="3 mar 2026" status="Finalizado" size="446 KB" source="ai" />
            <DocRow name="Proposta de honorários — Tech Holding LTDA" type="Proposta" client="Tech Holding" author="Camila Reis" date="2 mar 2026" status="Rascunho" size="86 KB" source="manual" />
            <DocRow name="Contrato de cessão — Editora Linhares" type="Contrato" client="Editora Linhares" author="Rafael Moraes" date="28 fev 2026" status="Assinado" size="512 KB" source="ai" />
            <DocRow name="Procuração específica — Imóvel Vila Madalena" type="Procuração" client="Família Soares" author="Diego Tomé" date="26 fev 2026" status="Finalizado" size="94 KB" source="manual" />
            <DocRow name="Parecer — Impacto LGPD em sistema CRM" type="Parecer Jurídico" client="HelpFlow Brasil" author="Camila Reis" date="22 fev 2026" status="Em revisão" size="612 KB" source="ai" />
          </tbody>
        </table>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-soft)',
          fontSize: 12, color: 'var(--text-muted)',
        }}>
          <span>Mostrando 7 de 142 documentos</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost" style={{ width: 24, height: 24, padding: 0 }}>
              <Icon name="chevronLeft" size={13} />
            </button>
            <button className="btn btn-ghost" style={{ width: 24, height: 24, padding: 0 }}>
              <Icon name="chevronRight" size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
);

window.HistoryScreen = HistoryScreen;
