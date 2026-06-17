// Home — AI-first document creation landing
const { useState: useStateHome } = React;

const DraftCard = ({ name, type, client, modified, completion, source }) => (
  <div className="card" style={{
    padding: 16, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: 12,
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    minHeight: 132,
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          width: 28, height: 36, borderRadius: 4,
          background: '#FFFFFF',
          border: '1px solid var(--border-strong)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: 4, flexShrink: 0, position: 'relative',
        }}>
          <span style={{
            fontSize: 7, fontWeight: 500, letterSpacing: '0.04em',
            color: '#020D25', fontFamily: 'var(--font-mono)',
          }}>{type === 'Contrato' ? 'CT' : type === 'Procuração' ? 'PR' : type === 'Proposta' ? 'PP' : 'PJ'}</span>
          <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#C0A147', borderRadius: '4px 4px 0 0' }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
          {type}
        </span>
      </div>
      {source === 'ai' && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>
          <Icon name="sparkles" size={10} strokeWidth={2} />
          IA
        </span>
      )}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: 14, fontWeight: 500, color: 'var(--text)',
        letterSpacing: '-0.015em', lineHeight: 1.3,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{name}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
        {client} · {modified}
      </div>
    </div>
    <div>
      <div style={{
        height: 3, background: 'var(--bg-sunken)', borderRadius: 999, overflow: 'hidden',
      }}>
        <div style={{ height: '100%', width: `${completion}%`, background: 'var(--accent)' }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 5 }}>
        {completion}% completo
      </div>
    </div>
  </div>
);

const QuickTemplateCard = ({ name, type, usedCount }) => (
  <div className="card" style={{
    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }}>
    <div style={{
      width: 32, height: 40, borderRadius: 5,
      background: '#FFFFFF',
      border: '1px solid var(--border-strong)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      paddingBottom: 4, flexShrink: 0, position: 'relative',
    }}>
      <span style={{ fontSize: 7.5, fontWeight: 500, letterSpacing: '0.04em', color: '#020D25', fontFamily: 'var(--font-mono)' }}>
        {type === 'Contrato' ? 'CT' : type === 'Procuração' ? 'PR' : type === 'Proposta' ? 'PP' : 'PJ'}
      </span>
      <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3.5, background: '#C0A147', borderRadius: '5px 5px 0 0' }} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>
        {type} · Usado {usedCount}×
      </div>
    </div>
    <Icon name="arrowRight" size={14} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
  </div>
);

const TypeCardMini = ({ icon, name, count }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: 'var(--bg-sunken)', color: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon name={icon} size={16} strokeWidth={1.7} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.015em' }}>
        {name}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>
        {count} modelos
      </div>
    </div>
    <Icon name="arrowRight" size={14} style={{ color: 'var(--text-subtle)' }} />
  </div>
);

const ExampleChip = ({ text }) => (
  <button style={{
    height: 28, padding: '0 12px', borderRadius: 999,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-muted)',
    fontSize: 12, letterSpacing: '-0.005em',
    cursor: 'pointer', textAlign: 'left',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    maxWidth: '100%',
  }}>
    <Icon name="sparkles" size={10} strokeWidth={2} style={{ color: 'var(--accent)', flexShrink: 0 }} />
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
  </button>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
    <div>
      <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--text)' }}>
        {title}
      </h2>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
    {action && (
      <a style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
        {action} →
      </a>
    )}
  </div>
);

const HomeScreen = () => (
  <AppShell
    active="documentos"
    breadcrumb={['Documentos']}
    tabs={<DocTabs active="criar" />}
    actions={null}
  >
    <div style={{ padding: '32px 40px 48px', maxWidth: 1180 }}>

      {/* === Hero: AI composer === */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{
          margin: 0, fontSize: 28, fontWeight: 500,
          letterSpacing: '-0.025em', color: 'var(--text)',
        }}>O que vamos criar?</h1>
        <p style={{ margin: '6px 0 20px', fontSize: 14, color: 'var(--text-muted)', letterSpacing: '-0.005em' }}>
          Descreva o documento — a IA escolhe o modelo e preenche para você.
        </p>

        {/* Composer */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-md)',
          padding: '14px 16px 12px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* subtle gold glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(circle at 100% 0%, var(--accent-soft) 0%, transparent 55%)',
          }} />

          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 500, color: 'var(--accent)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              <Icon name="sparkles" size={11} strokeWidth={2} />
              Assistente LexIA
            </div>

            <div
              style={{
                width: '100%', minHeight: 64,
                fontSize: 15, letterSpacing: '-0.005em', lineHeight: 1.55,
                color: 'var(--text-subtle)',
                outline: 'none', border: 'none', resize: 'none',
                background: 'transparent', padding: 0,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Descreva o documento que precisa criar. Ex: contrato de honorários para Helena Vargas, R$ 12.000 fixos + 20% sobre êxito, foro de São Paulo…
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginTop: 10, paddingTop: 10,
              borderTop: '1px solid var(--border)',
            }}>
              <button className="btn btn-ghost" style={{ height: 28, fontSize: 12, padding: '0 8px' }}>
                <Icon name="paperclip" size={12} />
                Anexar caso
              </button>
              <button className="btn btn-ghost" style={{ height: 28, fontSize: 12, padding: '0 8px' }}>
                <Icon name="user" size={12} />
                Vincular cliente
              </button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                A IA escolhe o modelo ideal
              </span>
              <button className="btn btn-gold" style={{ height: 30, fontSize: 12, padding: '0 14px' }}>
                <Icon name="sparkles" size={12} strokeWidth={2} />
                Criar com IA
              </button>
            </div>
          </div>
        </div>

        {/* Example prompts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-subtle)', alignSelf: 'center', marginRight: 4 }}>
            Exemplos:
          </span>
          <ExampleChip text="Procuração ad judicia para Construtora Aurora" />
          <ExampleChip text="Parecer sobre aplicação do art. 50 do CDC" />
          <ExampleChip text="Proposta para Tech Holding, atuação trabalhista" />
        </div>
      </div>

      {/* === Drafts (continue) === */}
      <section style={{ marginBottom: 36 }}>
        <SectionHeader
          title="Continue de onde parou"
          subtitle="3 rascunhos em aberto"
          action="Ver todos"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <DraftCard name="Contrato de Honorários — Helena Vargas" type="Contrato" client="Helena Vargas" modified="há 2 horas" completion={72} source="ai" />
          <DraftCard name="Procuração ad judicia — Construtora Aurora" type="Procuração" client="Aurora S/A" modified="ontem" completion={40} />
          <DraftCard name="Parecer cláusula 4.2 — Caso Mendonça" type="Parecer Jurídico" client="Mendonça & Filhos" modified="3 mar" completion={88} source="ai" />
        </div>
      </section>

      {/* === Most-used templates === */}
      <section style={{ marginBottom: 36 }}>
        <SectionHeader
          title="Atalhos do escritório"
          subtitle="Modelos mais usados no último mês"
          action="Ver biblioteca"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <QuickTemplateCard name="Contrato de Honorários — Padrão" type="Contrato" usedCount={48} />
          <QuickTemplateCard name="Procuração Ad Judicia" type="Procuração" usedCount={36} />
          <QuickTemplateCard name="Parecer — Análise Contratual" type="Parecer Jurídico" usedCount={22} />
          <QuickTemplateCard name="Proposta de Honorários PJ" type="Proposta" usedCount={19} />
        </div>
      </section>

      {/* === Browse by type === */}
      <section>
        <SectionHeader
          title="Navegar por tipo"
          subtitle="Abrir biblioteca filtrada por categoria"
          action="Toda a biblioteca"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <TypeCardMini icon="scroll"    name="Contrato"        count={14} />
          <TypeCardMini icon="feather"   name="Procuração"      count={6} />
          <TypeCardMini icon="briefcase" name="Proposta"        count={4} />
          <TypeCardMini icon="scale"     name="Parecer Jurídico" count={8} />
        </div>
      </section>
    </div>
  </AppShell>
);

window.HomeScreen = HomeScreen;
