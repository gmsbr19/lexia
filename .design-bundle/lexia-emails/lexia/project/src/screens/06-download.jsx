// Download — final state with format & sharing options
const FormatOption = ({ icon, format, size, description, selected }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px',
    background: selected ? 'var(--accent-soft)' : 'var(--surface)',
    border: `1px solid ${selected ? 'var(--brand-gold)' : 'var(--border)'}`,
    borderRadius: 12,
    cursor: 'pointer',
    position: 'relative',
  }}>
    <div style={{
      width: 40, height: 48, borderRadius: 6,
      background: selected ? 'var(--brand-gold)' : 'var(--bg-sunken)',
      color: selected ? 'var(--brand-navy)' : 'var(--text-muted)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 500, letterSpacing: '0.04em',
      fontFamily: 'var(--font-mono)',
      position: 'relative',
      flexShrink: 0,
    }}>
      {format}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 0, height: 0,
        borderStyle: 'solid', borderWidth: '0 8px 8px 0',
        borderColor: `transparent ${selected ? 'rgba(2,13,37,0.15)' : 'rgba(2,13,37,0.06)'} transparent transparent`,
      }} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em' }}>
        {description}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
        {size}
      </div>
    </div>
    <div style={{
      width: 18, height: 18, borderRadius: '50%',
      border: `1.5px solid ${selected ? 'var(--brand-gold)' : 'var(--border-strong)'}`,
      background: selected ? 'var(--brand-gold)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--brand-navy)',
      flexShrink: 0,
    }}>
      {selected && <Icon name="check" size={11} strokeWidth={3} />}
    </div>
  </div>
);

const DownloadScreen = () => (
  <AppShell
    active="documentos"
    breadcrumb={['Documentos', 'Novo contrato', 'Concluído']}
    actions={null}
  >
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      height: '100%', minHeight: 0,
    }}>
      {/* Left — Success + options */}
      <section style={{
        padding: '48px 56px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        overflow: 'auto',
      }}>
        <div style={{ maxWidth: 460 }}>
          {/* Success badge */}
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: 'rgba(46, 160, 67, 0.12)',
            color: '#2ea043',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 22,
            position: 'relative',
          }}>
            <Icon name="checkCircle" size={28} strokeWidth={1.6} />
          </div>

          <h1 style={{
            margin: 0, fontSize: 28, fontWeight: 500,
            letterSpacing: '-0.025em', color: 'var(--text)',
          }}>
            Pronto para baixar.
          </h1>
          <p style={{
            margin: '8px 0 28px', fontSize: 14.5, color: 'var(--text-muted)',
            letterSpacing: '-0.005em', lineHeight: 1.55,
          }}>
            O documento foi gerado no papel timbrado e arquivado na pasta de Helena Vargas com a numeração <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>CT-2026-0142</strong>.
          </p>

          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
              color: 'var(--text-subtle)', textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              Formato
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <FormatOption
                format="PDF"
                description="PDF para assinatura"
                size="324 KB · A4 · 3 páginas · pronto para impressão"
                selected
              />
              <FormatOption
                format="DOCX"
                description="DOCX editável"
                size="118 KB · Compatível com Word e Pages"
              />
            </div>
          </div>

          {/* Options */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            padding: '14px 16px',
            background: 'var(--bg-soft)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            marginBottom: 24,
          }}>
            {[
              ['Assinar digitalmente (ICP-Brasil)', true],
              ['Marca d\'água "CÓPIA" nas demais páginas', false],
              ['Enviar por e-mail ao cliente após download', true],
            ].map(([label, on], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 30, height: 18, borderRadius: 999,
                  background: on ? 'var(--brand-gold)' : 'var(--border-strong)',
                  position: 'relative',
                  transition: 'background 0.15s',
                  flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: on ? 14 : 2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#FFFFFF',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    transition: 'left 0.15s',
                  }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text)', letterSpacing: '-0.005em' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ height: 44, fontSize: 14, flex: 1, fontWeight: 500 }}>
              <Icon name="download" size={16} />
              Baixar PDF (324 KB)
            </button>
            <button className="btn btn-secondary" style={{ height: 44, width: 44, padding: 0 }}>
              <Icon name="mail" size={16} />
            </button>
            <button className="btn btn-secondary" style={{ height: 44, width: 44, padding: 0 }}>
              <Icon name="copy" size={16} />
            </button>
          </div>

          {/* Footer links */}
          <div style={{
            display: 'flex', gap: 16, marginTop: 22,
            fontSize: 12, color: 'var(--text-muted)',
          }}>
            <a style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>Criar novo documento</a>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            <a style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>Ver histórico</a>
          </div>
        </div>
      </section>

      {/* Right — document mockup */}
      <section style={{
        background: 'var(--bg-sunken)',
        padding: '48px 56px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 30%, var(--accent-soft) 0%, transparent 60%)',
          opacity: 0.6,
        }} />

        <div style={{
          width: 360, position: 'relative',
          transform: 'rotate(-2deg)',
        }}>
          {/* Stack illusion - back pages */}
          <div style={{
            position: 'absolute', inset: 0,
            background: '#FFFFFF', borderRadius: 6,
            transform: 'translate(12px, 16px) rotate(3deg)',
            boxShadow: '0 4px 16px rgba(2, 13, 37, 0.08)',
            opacity: 0.7,
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: '#FFFFFF', borderRadius: 6,
            transform: 'translate(6px, 8px) rotate(1.5deg)',
            boxShadow: '0 4px 16px rgba(2, 13, 37, 0.1)',
            opacity: 0.85,
          }} />
          <div style={{ position: 'relative' }}>
            <FullDocumentPreview />
            {/* Watermark seal */}
            <div style={{
              position: 'absolute', top: 16, right: 16,
              width: 64, height: 64, borderRadius: '50%',
              border: '1.5px solid #C0A147',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
              color: '#C0A147', background: 'rgba(255,255,255,0.92)',
              fontFamily: 'Georgia, serif', fontSize: 7,
              fontWeight: 500, letterSpacing: '0.06em',
              textAlign: 'center', lineHeight: 1.3,
              transform: 'rotate(8deg)',
            }}>
              MORAES<br/>&<br/>ASSOC.
            </div>
          </div>
        </div>
      </section>
    </div>
  </AppShell>
);

window.DownloadScreen = DownloadScreen;
