// Preview — full document with review toolbar
const Letterhead = () => (
  <div style={{ borderBottom: '1px solid rgba(2,13,37,0.1)' }}>
    <div style={{ height: 22, background: '#C0A147' }} />
    <div style={{
      padding: '24px 56px 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      color: '#020D25',
    }}>
      <div>
        <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 16, letterSpacing: '0.02em' }}>
          MORAES &amp; ASSOCIADOS
        </div>
        <div style={{ fontSize: 9, color: 'rgba(2,13,37,0.6)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}>
          Sociedade de Advogados · OAB/SP 12.456
        </div>
      </div>
      <div style={{ fontSize: 9, color: 'rgba(2,13,37,0.55)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', lineHeight: 1.5 }}>
        Nº 2026/0142<br/>
        São Paulo · 21.mai.2026
      </div>
    </div>
  </div>
);

const ContractParagraph = ({ indent, children }) => (
  <p style={{
    margin: '0 0 9px',
    fontSize: 10.5,
    lineHeight: 1.7,
    textAlign: 'justify',
    textIndent: indent ? '2em' : 0,
    color: '#020D25',
  }}>{children}</p>
);

const FullDocumentPreview = () => (
  <div style={{
    background: '#FFFFFF',
    borderRadius: 6,
    boxShadow: '0 1px 3px rgba(2, 13, 37, 0.06), 0 18px 50px rgba(2, 13, 37, 0.12)',
    width: '100%',
    aspectRatio: '210/297',
    overflow: 'hidden',
    color: '#020D25',
    position: 'relative',
  }}>
    <Letterhead />
    <div style={{ padding: '32px 56px 32px' }}>
      <div style={{
        textAlign: 'center',
        fontFamily: 'Georgia, serif',
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: '0.08em',
        marginBottom: 24,
      }}>
        CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS
      </div>

      <ContractParagraph indent>
        Pelo presente instrumento particular, de um lado <strong>HELENA MARIA VARGAS</strong>, brasileira, empresária, portadora do RG 28.451.227-8 SSP/SP e CPF 312.984.760-15, residente e domiciliada na Rua Oscar Freire, 1.205, ap. 92, São Paulo/SP, doravante denominada simplesmente <strong>CONTRATANTE</strong>;
      </ContractParagraph>

      <ContractParagraph indent>
        E, de outro lado, <strong>MORAES &amp; ASSOCIADOS SOCIEDADE DE ADVOGADOS</strong>, inscrita na OAB/SP sob o nº 12.348, com sede na Av. Paulista, 1.842, 14º andar, São Paulo/SP, neste ato representada por seu sócio Rafael Moraes, doravante denominada <strong>CONTRATADA</strong>;
      </ContractParagraph>

      <ContractParagraph indent>
        Resolvem celebrar o presente <em>Contrato de Prestação de Serviços Advocatícios</em>, que se regerá pelas cláusulas e condições seguintes.
      </ContractParagraph>

      <div style={{ height: 8 }} />

      <div style={{ fontWeight: 700, fontSize: 10.5, marginBottom: 6, letterSpacing: '0.02em' }}>
        CLÁUSULA PRIMEIRA — DO OBJETO
      </div>
      <ContractParagraph indent>
        A CONTRATADA prestará à CONTRATANTE serviços de consultoria e assessoria jurídica nas áreas cível, contratual e empresarial, incluindo a elaboração de pareceres, contratos e demais documentos necessários ao bom andamento da atuação descrita no presente instrumento.
      </ContractParagraph>

      <div style={{ fontWeight: 700, fontSize: 10.5, marginBottom: 6, letterSpacing: '0.02em' }}>
        CLÁUSULA SEGUNDA — DOS HONORÁRIOS
      </div>
      <ContractParagraph indent>
        Pela prestação dos serviços ora contratados, a CONTRATANTE pagará à CONTRATADA o valor mensal de R$ 8.500,00 (oito mil e quinhentos reais), vencível todo dia 10 de cada mês, mediante depósito bancário ou PIX em conta de titularidade da CONTRATADA.
      </ContractParagraph>

      <div style={{ fontWeight: 700, fontSize: 10.5, marginBottom: 6, letterSpacing: '0.02em' }}>
        CLÁUSULA TERCEIRA — DA VIGÊNCIA
      </div>
      <ContractParagraph indent>
        O presente contrato vigerá pelo prazo de 12 (doze) meses, a contar de 1º de abril de 2026, sendo renovado automaticamente por iguais períodos, salvo manifestação em contrário de qualquer das partes mediante aviso prévio de 30 (trinta) dias.
      </ContractParagraph>

      <div style={{ fontWeight: 700, fontSize: 10.5, marginBottom: 6, letterSpacing: '0.02em' }}>
        CLÁUSULA QUARTA — DO REAJUSTE
      </div>
      <ContractParagraph indent>
        O valor dos honorários será reajustado anualmente, no mês de aniversário do contrato, pela variação positiva do IPCA acumulado nos últimos doze meses, ou outro índice oficial que vier a substituí-lo.
      </ContractParagraph>
    </div>
  </div>
);

const PreviewScreen = () => (
  <AppShell
    active="documentos"
    breadcrumb={['Documentos', 'Novo contrato', 'Revisão']}
    actions={
      <>
        <button className="btn btn-ghost" style={{ height: 32, fontSize: 12.5 }}>
          <Icon name="edit" size={14} />
          Editar
        </button>
        <button className="btn btn-secondary" style={{ height: 32, fontSize: 12.5 }}>
          <Icon name="users" size={14} />
          Compartilhar
        </button>
        <button className="btn btn-primary" style={{ height: 32, fontSize: 12.5 }}>
          <Icon name="download" size={14} />
          Baixar
        </button>
      </>
    }
  >
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 320px',
      height: '100%', minHeight: 0,
    }}>
      {/* Document viewport */}
      <section style={{
        background: 'var(--bg-sunken)',
        overflow: 'auto',
        padding: '32px 40px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Doc title */}
        <div style={{ width: '100%', maxWidth: 720, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{
                margin: 0, fontSize: 22, fontWeight: 600,
                letterSpacing: '-0.02em', color: 'var(--text)',
              }}>
                Contrato de Honorários — Helena Vargas
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Gerado pela IA · Modelo HRA-02</span>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', opacity: 0.5 }} />
                <span>3 páginas · 1.247 palavras</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: 3 }}>
              <button style={{
                height: 26, padding: '0 12px', borderRadius: 999, border: 'none',
                background: 'var(--text)', color: 'var(--bg)',
                fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
              }}>Documento</button>
              <button style={{
                height: 26, padding: '0 12px', borderRadius: 999, border: 'none',
                background: 'transparent', color: 'var(--text-muted)',
                fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
              }}>Comentários</button>
              <button style={{
                height: 26, padding: '0 12px', borderRadius: 999, border: 'none',
                background: 'transparent', color: 'var(--text-muted)',
                fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
              }}>Histórico</button>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: 720 }}>
          <FullDocumentPreview />
        </div>

        <div style={{
          marginTop: 14, fontSize: 11.5, color: 'var(--text-subtle)',
        }}>Página 1 de 3</div>
      </section>

      {/* Review sidebar */}
      <aside style={{
        borderLeft: '1px solid var(--border)',
        background: 'var(--bg)',
        overflow: 'auto',
        padding: '24px 22px',
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>
            Verificação
          </div>

          {[
            { label: 'Partes identificadas', state: 'ok', detail: 'CPF e endereço completos' },
            { label: 'Valores e datas', state: 'ok', detail: 'R$ 8.500/mês · 12 meses' },
            { label: 'Cláusula de foro', state: 'ok', detail: 'Comarca de São Paulo/SP' },
            { label: 'Assinatura digital', state: 'pending', detail: 'Aguardando configuração' },
          ].map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 0',
              borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: c.state === 'ok' ? 'rgba(46, 160, 67, 0.14)' : 'var(--accent-soft)',
                color: c.state === 'ok' ? '#2ea043' : 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>
                <Icon name={c.state === 'ok' ? 'check' : 'circleDot'} size={11} strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {c.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>
            Sugestões da IA
          </div>
          <div style={{
            background: 'var(--bg-soft)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '12px 12px 10px',
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>
              <Icon name="sparkles" size={12} />
              CLÁUSULA 2ª
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5, letterSpacing: '-0.005em', marginBottom: 10 }}>
              Considerar incluir multa por atraso (2% + juros 1% a.m.) — padrão do escritório.
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary" style={{ height: 26, fontSize: 11.5, padding: '0 10px' }}>Aplicar</button>
              <button className="btn btn-ghost" style={{ height: 26, fontSize: 11.5, padding: '0 10px' }}>Ignorar</button>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>
            Detalhes
          </div>
          <div style={{ display: 'grid', gap: 10, fontSize: 12.5 }}>
            {[
              ['Cliente', 'Helena Vargas'],
              ['Caso', 'Consultoria 2026/03'],
              ['Criado por', 'Rafael Moraes'],
              ['Atualizado', 'há 4 minutos'],
              ['Numeração', 'CT-2026-0142'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  </AppShell>
);

window.PreviewScreen = PreviewScreen;
window.FullDocumentPreview = FullDocumentPreview;
window.Letterhead = Letterhead;
window.ContractParagraph = ContractParagraph;
