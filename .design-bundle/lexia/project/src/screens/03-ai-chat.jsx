// Unified Editor — Form + Live preview + AI chat panel (collapsible)
// Replaces the old separated AI-chat / Manual-form screens.
const FormField = ({ label, value, placeholder, mono, aiSuggested, multiline }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
        {label}
      </label>
      {aiSuggested && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 9.5, fontWeight: 500, color: 'var(--accent)',
          padding: '1px 5px', borderRadius: 4,
          background: 'var(--accent-soft)',
          letterSpacing: '0.04em',
        }}>
          <Icon name="sparkles" size={8} strokeWidth={2.4} />
          IA
        </span>
      )}
    </div>
    <div style={{
      background: 'var(--surface)',
      border: '1px solid ' + (aiSuggested ? 'var(--brand-gold)' : 'var(--border-strong)'),
      borderRadius: 7,
      padding: multiline ? '8px 10px' : '7px 10px',
      fontSize: 12.5,
      color: value ? 'var(--text)' : 'var(--text-subtle)',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      letterSpacing: '-0.005em',
      minHeight: multiline ? 52 : 'auto',
      lineHeight: multiline ? 1.5 : 1.4,
      boxShadow: aiSuggested ? '0 0 0 3px var(--ring)' : 'none',
    }}>
      {value || placeholder}
    </div>
  </div>
);

const FormSection = ({ title, completion, children }) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 10,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-subtle)',
      }}>{title}</div>
      {completion !== undefined && (
        <div style={{
          fontSize: 10, color: 'var(--text-subtle)', fontFeatureSettings: '"tnum"',
        }}>{completion}</div>
      )}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {children}
    </div>
  </div>
);

// Highlighted variable inline in the preview body
const Var = ({ value, pending }) => (
  <span style={{
    background: pending ? 'rgba(192, 161, 71, 0.18)' : 'rgba(192, 161, 71, 0.10)',
    color: pending ? 'var(--text-subtle)' : 'var(--text)',
    fontWeight: pending ? 400 : 600,
    fontStyle: pending ? 'italic' : 'normal',
    padding: '0 3px', borderRadius: 3,
    fontFamily: pending ? 'var(--font-mono)' : 'inherit',
    fontSize: pending ? '0.92em' : 'inherit',
  }}>{value}</span>
);

const DocumentPreview = () => (
  <div style={{
    width: '100%', maxWidth: 560,
    margin: '0 auto',
    background: '#FFFFFF',
    borderRadius: 6,
    boxShadow: '0 18px 50px rgba(2, 13, 37, 0.10), 0 4px 14px rgba(2, 13, 37, 0.06)',
    overflow: 'hidden',
    color: '#020D25',
    fontFamily: '"Lora", Georgia, serif',
  }}>
    {/* Letterhead */}
    <div style={{ height: 18, background: '#C0A147' }} />
    <div style={{ padding: '20px 40px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(2,13,37,0.1)' }}>
      <div>
        <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 13, letterSpacing: '0.02em', color: '#020D25' }}>
          MORAES & ASSOCIADOS
        </div>
        <div style={{ fontSize: 8, color: 'rgba(2,13,37,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>
          Sociedade de Advogados · OAB/SP 12.456
        </div>
      </div>
      <div style={{ fontSize: 8, color: 'rgba(2,13,37,0.5)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>
        Nº 2026/0142<br/>
        São Paulo · 21.mai.2026
      </div>
    </div>

    {/* Body */}
    <div style={{ padding: '24px 40px 40px', fontSize: 10.5, lineHeight: 1.7, color: '#020D25' }}>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 12.5, letterSpacing: '0.06em', marginBottom: 16 }}>
        CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS
      </div>

      <p style={{ margin: '0 0 10px', textAlign: 'justify' }}>
        Pelo presente instrumento particular, de um lado, <Var value="HELENA VARGAS" />,
        brasileira, advogada, portadora do RG nº <Var value="12.345.678-9" /> e CPF
        nº <Var value="123.456.789-00" />, residente e domiciliada na cidade
        de <Var value="São Paulo/SP" />, doravante denominada CONTRATANTE; e, de outro
        lado, <span style={{ fontWeight: 600 }}>MORAES &amp; ASSOCIADOS SOCIEDADE DE ADVOGADOS</span>, inscrita
        na OAB/SP sob o nº 12.456, doravante denominada CONTRATADA, têm entre
        si justo e contratado o seguinte:
      </p>

      <p style={{ margin: '12px 0 6px', fontWeight: 700, fontSize: 10.5 }}>
        CLÁUSULA PRIMEIRA — DO OBJETO
      </p>
      <p style={{ margin: 0, textAlign: 'justify' }}>
        A CONTRATADA prestará à CONTRATANTE serviços de assessoria e
        consultoria jurídica em <Var value="matéria cível e empresarial" pending />,
        incluindo o patrocínio em ações judiciais e administrativas relacionadas.
      </p>

      <p style={{ margin: '12px 0 6px', fontWeight: 700, fontSize: 10.5 }}>
        CLÁUSULA SEGUNDA — DOS HONORÁRIOS
      </p>
      <p style={{ margin: 0, textAlign: 'justify' }}>
        Pelos serviços, a CONTRATANTE pagará à CONTRATADA o valor
        de <Var value="R$ 12.000,00 (doze mil reais)" />, em
        parcela única, acrescido de <Var value="20% (vinte por cento)" /> sobre
        eventual proveito econômico obtido, a título de honorários de êxito.
      </p>

      <p style={{ margin: '12px 0 6px', fontWeight: 700, fontSize: 10.5, opacity: 0.45 }}>
        CLÁUSULA TERCEIRA — DO PRAZO
      </p>
      <p style={{ margin: 0, textAlign: 'justify', opacity: 0.4, fontStyle: 'italic' }}>
        … continua abaixo
      </p>
    </div>
  </div>
);

const ChatMessage = ({ from, children, suggestion }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
      color: from === 'ai' ? 'var(--accent)' : 'var(--text-subtle)',
    }}>
      {from === 'ai' && <Icon name="sparkles" size={10} strokeWidth={2} />}
      {from === 'ai' ? 'LexIA' : 'Você'}
    </div>
    <div style={{
      fontSize: 12.5, lineHeight: 1.55,
      color: 'var(--text)',
      letterSpacing: '-0.005em',
      background: from === 'ai' ? 'var(--bg-soft)' : 'transparent',
      padding: from === 'ai' ? '10px 12px' : '0',
      borderRadius: from === 'ai' ? 10 : 0,
      border: from === 'ai' ? '1px solid var(--border)' : 'none',
    }}>{children}</div>
    {suggestion && (
      <div style={{
        marginTop: 4, padding: '8px 10px',
        background: 'var(--accent-soft)',
        border: '1px solid rgba(192, 161, 71, 0.35)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ flex: 1, fontSize: 11.5, color: 'var(--text)', lineHeight: 1.45 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 2 }}>
            Sugestão · {suggestion.field}
          </div>
          {suggestion.value}
        </div>
        <button className="btn btn-ghost" style={{ height: 24, width: 24, padding: 0, color: 'var(--text-subtle)' }}>
          <Icon name="check" size={13} strokeWidth={2} />
        </button>
      </div>
    )}
  </div>
);

const AIChatPanel = () => (
  <aside style={{
    width: 320, flexShrink: 0,
    background: 'var(--bg-soft)',
    borderLeft: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  }}>
    {/* Header */}
    <div style={{
      padding: '14px 16px',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--surface)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'linear-gradient(135deg, #C0A147 0%, #9a7f2e 100%)',
        color: '#020D25',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name="sparkles" size={14} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Assistente LexIA
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-subtle)' }}>
          Acompanhando o documento
        </div>
      </div>
      <button className="btn btn-ghost" style={{ height: 26, width: 26, padding: 0 }} title="Minimizar">
        <Icon name="chevronRight" size={14} />
      </button>
    </div>

    {/* Messages */}
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 14px' }}>
      <ChatMessage from="ai">
        Vinculei o cliente <strong>Helena Vargas</strong> e puxei CPF, RG e endereço do cadastro. Faltam apenas o objeto e o prazo.
      </ChatMessage>

      <ChatMessage from="user">
        Defenda matéria cível e empresarial, prazo de 12 meses renováveis.
      </ChatMessage>

      <ChatMessage
        from="ai"
        suggestion={{
          field: 'Objeto',
          value: 'Assessoria em matéria cível e empresarial, com patrocínio em ações judiciais relacionadas.',
        }}
      >
        Boa. Preenchi o objeto na cláusula primeira. Quer que eu adicione cláusula específica de litígio empresarial (arbitragem)?
      </ChatMessage>

      <ChatMessage from="ai">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 11, fontWeight: 500 }}>
          <span className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
          Revisando cláusulas obrigatórias…
        </div>
      </ChatMessage>
    </div>

    {/* Composer */}
    <div style={{
      padding: '10px 12px 12px',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <div style={{
        background: 'var(--bg)',
        border: '1px solid var(--border-strong)',
        borderRadius: 10,
        padding: '8px 10px',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.5, minHeight: 32 }}>
          Pergunte ou peça um ajuste…
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 6,
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost" style={{ height: 22, width: 22, padding: 0, color: 'var(--text-subtle)' }}>
              <Icon name="paperclip" size={11} />
            </button>
            <button className="btn btn-ghost" style={{ height: 22, width: 22, padding: 0, color: 'var(--text-subtle)' }}>
              <Icon name="mic" size={11} />
            </button>
          </div>
          <button className="btn btn-gold" style={{ height: 24, width: 24, padding: 0 }}>
            <Icon name="send" size={11} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
        {['Adicionar cláusula de foro', 'Revisar valor', 'Sugerir prazo'].map(s => (
          <button key={s} style={{
            height: 22, padding: '0 8px', borderRadius: 999,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', fontSize: 10.5, cursor: 'pointer',
            letterSpacing: '-0.005em',
          }}>{s}</button>
        ))}
      </div>
    </div>
  </aside>
);

const SaveStatus = () => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 11.5, color: 'var(--text-subtle)', marginRight: 4,
  }}>
    <Icon name="checkCircle" size={12} style={{ color: '#2ea043' }} />
    Salvo há 2s
  </div>
);

// File kept as 03-ai-chat.jsx for back-compat with LexIA.html; export name unchanged.
const AIChatScreen = () => (
  <AppShell
    active="documentos"
    breadcrumb={[
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} key="back">
        <Icon name="chevronLeft" size={12} /> Contrato
      </span>,
      'Honorários — Helena Vargas',
    ]}
    actions={
      <>
        <SaveStatus />
        <button className="btn btn-ghost" style={{ height: 32, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <Icon name="eye" size={13} />
          Visualizar
        </button>
        <button className="btn btn-primary" style={{ height: 32, fontSize: 12.5 }}>
          Gerar documento
          <Icon name="arrowRight" size={12} />
        </button>
      </>
    }
  >
    <div style={{
      display: 'flex', flexDirection: 'row',
      width: '100%', height: '100%',
      overflow: 'hidden',
    }}>

      {/* === Left: Form === */}
      <aside style={{
        width: 400, flexShrink: 0,
        background: 'var(--bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Active template header */}
        <div style={{ padding: '18px 20px 14px' }}>
          <div style={{
            fontSize: 10.5, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--accent)',
          }}>Modelo ativo</div>
          <div style={{
            marginTop: 6,
            fontSize: 15.5, fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
          }}>Contrato de Honorários Advocatícios</div>
          <button style={{
            marginTop: 8, padding: 0, background: 'none', border: 'none',
            color: 'var(--accent)', fontSize: 11.5, cursor: 'pointer', fontWeight: 500,
            letterSpacing: '-0.005em',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            Trocar modelo
            <Icon name="chevronRight" size={11} strokeWidth={2} />
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Scrollable form sections — flat accordion */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <V5Section title="Cliente" count="7 / 11" open>
            <ClientePFContent />
          </V5Section>
          <V5Section title="Objeto e prazo" count="0 / 1">
            <ObjetoContent />
          </V5Section>
          <V5Section title="Honorários" count="4 / 5">
            <HonorariosContent type="Parcelado" />
          </V5Section>
          <V5Section title="Foro e data" count="2 / 2" complete last>
            <ForoContent />
          </V5Section>
        </div>

        {/* Progress footer */}
        <ProgressFooter pct={56} />
      </aside>

      {/* === Center: Live preview === */}
      <main style={{
        flex: 1, minWidth: 0,
        overflow: 'auto',
        background: 'var(--bg-sunken)',
        padding: '24px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', maxWidth: 560,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: 'var(--text-muted)',
            padding: '4px 10px', borderRadius: 999,
            background: 'var(--surface)', border: '1px solid var(--border)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2ea043' }} />
            6 / 8 campos preenchidos · 72%
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost" style={{ height: 26, width: 26, padding: 0 }} title="Diminuir">
              <Icon name="chevronLeft" size={12} />
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontFeatureSettings: '"tnum"', alignSelf: 'center', padding: '0 4px' }}>
              100%
            </span>
            <button className="btn btn-ghost" style={{ height: 26, width: 26, padding: 0 }} title="Aumentar">
              <Icon name="chevronRight" size={12} />
            </button>
          </div>
        </div>

        <DocumentPreview />

        <div style={{
          width: '100%', maxWidth: 560, textAlign: 'center',
          fontSize: 10.5, color: 'var(--text-subtle)',
          fontFamily: 'var(--font-mono)',
        }}>Página 1 de 3</div>
      </main>

      {/* === Right: AI chat === */}
      <AIChatPanel />
    </div>
  </AppShell>
);

window.AIChatScreen = AIChatScreen;
