// Templates — library of reusable document templates
const TemplatePreview = ({ type }) => {
  const code = type === 'Contrato' ? 'CT' :
               type === 'Procuração' ? 'PR' :
               type === 'Proposta' ? 'PP' : 'PJ';
  return (
    <div style={{
      width: '100%', aspectRatio: '1 / 1.05',
      background: 'var(--bg-sunken)',
      borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Paper sheet */}
      <div style={{
        width: '62%', height: '78%',
        background: '#FFFFFF',
        borderRadius: 4,
        border: '1px solid var(--border-strong)',
        boxShadow: '0 6px 18px rgba(2, 13, 37, 0.08)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Gold header */}
        <div style={{ height: 14, background: '#C0A147', flexShrink: 0 }} />
        {/* Type code */}
        <div style={{
          fontSize: 7, fontWeight: 500, letterSpacing: '0.12em',
          color: '#020D25', fontFamily: 'var(--font-mono)',
          textAlign: 'center', padding: '6px 0 8px',
        }}>{code}</div>
        {/* Lines */}
        <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[100, 86, 92, 70, 88, 78, 95, 60].map((w, i) => (
            <div key={i} style={{
              height: 2, width: `${w}%`,
              background: i === 0 || i === 3 ? '#020D25' : '#020D25',
              opacity: i === 0 || i === 3 ? 0.7 : 0.22,
              borderRadius: 1,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
};

const TemplateCard = ({ name, type, description, usedCount, modified, isFavorite, hasVariables }) => (
  <div style={{
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: 14,
    cursor: 'pointer',
    transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex', flexDirection: 'column', gap: 12,
    position: 'relative',
  }}>
    {isFavorite && (
      <div style={{
        position: 'absolute', top: 22, right: 22, zIndex: 1,
        color: 'var(--brand-gold)',
      }}>
        <Icon name="star" size={13} strokeWidth={2} style={{ fill: 'currentColor' }} />
      </div>
    )}
    <TemplatePreview type={type} />

    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 500, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--accent)',
        }}>{type}</span>
        {hasVariables && (
          <span style={{
            fontSize: 9.5, fontWeight: 500,
            padding: '1px 5px', borderRadius: 4,
            background: 'var(--bg-sunken)', color: 'var(--text-subtle)',
            fontFamily: 'var(--font-mono)',
          }}>{'{{var}}'}</span>
        )}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 500, color: 'var(--text)',
        letterSpacing: '-0.015em', lineHeight: 1.3,
      }}>{name}</div>
      <div style={{
        fontSize: 12, color: 'var(--text-muted)',
        lineHeight: 1.45, letterSpacing: '-0.005em',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', minHeight: 33,
      }}>{description}</div>
    </div>

    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 10, borderTop: '1px solid var(--border)',
      fontSize: 11, color: 'var(--text-subtle)',
    }}>
      <span>Usado {usedCount}×</span>
      <span>{modified}</span>
    </div>
  </div>
);

const CategoryChip = ({ label, count, active }) => (
  <button style={{
    height: 30, padding: '0 12px', borderRadius: 999,
    border: '1px solid ' + (active ? 'transparent' : 'var(--border)'),
    background: active ? 'var(--text)' : 'var(--surface)',
    color: active ? 'var(--bg)' : 'var(--text-muted)',
    fontSize: 12, fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 7,
    letterSpacing: '-0.005em',
  }}>
    {label}
    <span style={{
      fontSize: 11, fontWeight: 500,
      color: active ? 'var(--bg)' : 'var(--text-subtle)',
      opacity: active ? 0.6 : 1,
      fontFeatureSettings: '"tnum"',
    }}>{count}</span>
  </button>
);

const TemplatesScreen = () => (
  <AppShell
    active="documentos"
    breadcrumb={['Documentos']}
    tabs={<DocTabs active="templates" />}
    actions={
      <>
        <button className="btn btn-ghost" style={{ height: 32, fontSize: 12, color: 'var(--text-muted)' }}>
          <Icon name="download" size={13} />
          Importar .docx
        </button>
        <button className="btn btn-primary" style={{ height: 32, fontSize: 12 }}>
          <Icon name="plus" size={13} />
          Novo modelo
        </button>
      </>
    }
  >
    <div style={{ padding: '28px 40px 40px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 25, fontWeight: 500,
            letterSpacing: '-0.025em', color: 'var(--text)',
          }}>Modelos</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-muted)', maxWidth: 560, lineHeight: 1.5 }}>
            Modelos prontos do escritório. Cada modelo guarda papel timbrado, cláusulas padrão e variáveis automáticas.
          </p>
        </div>
        <div style={{
          display: 'flex', gap: 18,
          padding: '10px 18px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Total</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em' }}>32</div>
          </div>
          <div style={{ width: 1, background: 'var(--border)' }} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Favoritos</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.02em' }}>7</div>
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <CategoryChip label="Todos" count={32} active />
        <CategoryChip label="Contrato" count={14} />
        <CategoryChip label="Procuração" count={6} />
        <CategoryChip label="Proposta" count={4} />
        <CategoryChip label="Parecer Jurídico" count={8} />
      </div>

      {/* Search + sort */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 20,
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}>
            <Icon name="search" size={14} />
          </div>
          <input className="input" placeholder="Buscar modelo por nome ou variável..." style={{
            paddingLeft: 36, height: 34, fontSize: 13,
          }} />
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" style={{ height: 32, fontSize: 12 }}>
          <Icon name="sliders" size={13} />
          Mais usados
          <Icon name="chevronDown" size={12} />
        </button>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
      }}>
        <TemplateCard
          name="Contrato de Honorários — Padrão"
          type="Contrato"
          description="Honorários advocatícios fixos com cláusula de êxito opcional e foro de São Paulo."
          usedCount={48}
          modified="há 3 dias"
          isFavorite
          hasVariables
        />
        <TemplateCard
          name="Procuração Ad Judicia"
          type="Procuração"
          description="Cláusula ad judicia et extra com poderes para o foro em geral, sem reserva."
          usedCount={36}
          modified="há 1 semana"
          isFavorite
          hasVariables
        />
        <TemplateCard
          name="Parecer Jurídico — Análise Contratual"
          type="Parecer Jurídico"
          description="Estrutura clássica: relatório, fundamentação, conclusão e recomendações ao cliente."
          usedCount={22}
          modified="há 2 semanas"
          hasVariables
        />
        <TemplateCard
          name="Proposta de Honorários — PJ"
          type="Proposta"
          description="Carta-proposta para pessoas jurídicas com escopo, prazos e tabela de valores."
          usedCount={19}
          modified="há 2 semanas"
          isFavorite
          hasVariables
        />
        <TemplateCard
          name="Contrato de Cessão de Direitos"
          type="Contrato"
          description="Cessão de direitos patrimoniais autorais com cláusula de exclusividade territorial."
          usedCount={14}
          modified="há 3 semanas"
          hasVariables
        />
        <TemplateCard
          name="Procuração — Imóveis"
          type="Procuração"
          description="Poderes específicos para compra, venda e regularização de bens imóveis."
          usedCount={11}
          modified="há 1 mês"
          hasVariables
        />
        <TemplateCard
          name="Contrato de Prestação de Serviços"
          type="Contrato"
          description="Modelo enxuto para serviços continuados com reajuste por IPCA e rescisão imotivada."
          usedCount={9}
          modified="há 1 mês"
          hasVariables
        />
        <TemplateCard
          name="Parecer — Compliance LGPD"
          type="Parecer Jurídico"
          description="Avaliação de adequação à Lei Geral de Proteção de Dados em sistemas e processos."
          usedCount={6}
          modified="há 1 mês"
        />
      </div>

      <div style={{
        marginTop: 24, padding: '14px 18px',
        background: 'var(--bg-soft)',
        border: '1px dashed var(--border-strong)',
        borderRadius: 12,
        display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 12, color: 'var(--text-muted)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name="sigma" size={15} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.005em' }}>
            Cláusulas reutilizáveis agora vivem dentro do editor de modelo
          </div>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            Abra qualquer modelo e use o painel lateral para inserir cláusulas-padrão (foro, confidencialidade, rescisão, etc).
          </div>
        </div>
        <button className="btn btn-ghost" style={{ height: 28, fontSize: 12, color: 'var(--text-muted)' }}>
          Saiba mais
          <Icon name="arrowRight" size={12} />
        </button>
      </div>
    </div>
  </AppShell>
);

window.TemplatesScreen = TemplatesScreen;
