// Form-design variations for the unified-editor form panel.
// Same data + functionality, different visual hierarchy.

const { useState: useStateFV } = React;

// ============================================================
// Shared primitives
// ============================================================

const FVIcons = {
  chev: (size = 14) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  chevRight: (size = 14) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  check: (size = 14) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

const Eyebrow = ({ children, accent, size = 'sm', style }) => (
  <div style={{
    fontSize: size === 'xs' ? 9.5 : 10.5,
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: accent ? 'var(--accent)' : 'var(--text-subtle)',
    ...style,
  }}>{children}</div>
);

const Chip = ({ children }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '3px 10px',
    fontSize: 11, fontFeatureSettings: '"tnum"',
    color: 'var(--text-subtle)',
    background: 'var(--bg-sunken)',
    border: '1px solid var(--border)',
    borderRadius: 999,
  }}>{children}</div>
);

const Segmented = ({ options, active = 0, size = 'md' }) => (
  <div style={{
    display: 'inline-flex',
    padding: 3,
    background: 'var(--bg-sunken)',
    borderRadius: 9,
    border: '1px solid var(--border)',
  }}>
    {options.map((opt, i) => (
      <div key={opt} style={{
        padding: size === 'sm' ? '5px 14px' : '7px 18px',
        fontSize: size === 'sm' ? 12 : 12.5,
        fontWeight: i === active ? 600 : 500,
        color: i === active ? 'var(--text)' : 'var(--text-muted)',
        background: i === active ? 'var(--surface)' : 'transparent',
        boxShadow: i === active ? '0 1px 2px rgba(2,13,37,0.08), inset 0 0 0 1px var(--border)' : 'none',
        borderRadius: 6,
        cursor: 'pointer',
        letterSpacing: '-0.005em',
      }}>{opt}</div>
    ))}
  </div>
);

const FieldLabel = ({ children }) => (
  <label style={{
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-muted)',
    letterSpacing: '-0.005em',
  }}>{children}</label>
);

// Outlined input — V1 baseline
const OutlinedInput = ({ placeholder, value, mono }) => (
  <div style={{
    height: 40, padding: '0 14px',
    border: '1px solid var(--border-strong)',
    borderRadius: 10,
    background: 'var(--surface)',
    display: 'flex', alignItems: 'center',
    fontSize: 13,
    color: value ? 'var(--text)' : 'var(--text-subtle)',
    fontFamily: mono ? 'var(--font-mono)' : 'inherit',
    letterSpacing: mono ? 0 : '-0.005em',
  }}>{value || placeholder}</div>
);

const OutlinedSelect = ({ placeholder, value }) => (
  <div style={{
    height: 40, padding: '0 14px',
    border: '1px solid var(--border-strong)',
    borderRadius: 10,
    background: 'var(--surface)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: 13,
    color: value ? 'var(--text)' : 'var(--text-subtle)',
  }}>
    <span>{value || placeholder}</span>
    <span style={{ color: 'var(--text-subtle)' }}>{FVIcons.chev(14)}</span>
  </div>
);

// Filled input — V3 typographic
const FilledInput = ({ placeholder, value, mono }) => (
  <div style={{
    height: 40, padding: '0 14px',
    background: 'var(--bg-soft)',
    border: '1px solid transparent',
    borderRadius: 10,
    display: 'flex', alignItems: 'center',
    fontSize: 13,
    color: value ? 'var(--text)' : 'var(--text-subtle)',
    fontFamily: mono ? 'var(--font-mono)' : 'inherit',
  }}>{value || placeholder}</div>
);
const FilledSelect = ({ placeholder, value }) => (
  <div style={{
    height: 40, padding: '0 14px',
    background: 'var(--bg-soft)',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: 13,
    color: value ? 'var(--text)' : 'var(--text-subtle)',
  }}>
    <span>{value || placeholder}</span>
    <span style={{ color: 'var(--text-subtle)' }}>{FVIcons.chev(14)}</span>
  </div>
);

// Plain inline input — V2 settings rows
const PlainValue = ({ placeholder, value, mono, align = 'left' }) => (
  <div style={{
    fontSize: 13,
    color: value ? 'var(--text)' : 'var(--text-subtle)',
    fontFamily: mono ? 'var(--font-mono)' : 'inherit',
    letterSpacing: mono ? 0 : '-0.005em',
    textAlign: align,
  }}>{value || placeholder}</div>
);

// Stacked field (label above input)
const StackedField = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <FieldLabel>{label}</FieldLabel>
    {children}
  </div>
);

const TwoCol = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>
);

// ============================================================
// Frame chrome shared by all variations (doc header + progress footer)
// ============================================================

const DocHeader = () => (
  <div style={{ marginBottom: 24 }}>
    <Eyebrow accent>Modelo ativo</Eyebrow>
    <div style={{
      marginTop: 6,
      fontSize: 20, fontWeight: 500,
      letterSpacing: '-0.02em',
      color: 'var(--text)',
    }}>
      Contrato de Honorários Advocatícios
    </div>
  </div>
);

const ProgressFooter = ({ pct = 24 }) => (
  <div style={{
    borderTop: '1px solid var(--border)',
    padding: '14px 28px',
    background: 'var(--bg)',
    display: 'flex', alignItems: 'center', gap: 14,
  }}>
    <div style={{ flex: 1 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Progresso</div>
        <div style={{ fontSize: 12, color: 'var(--text-subtle)', fontFeatureSettings: '"tnum"' }}>
          11 campos pendentes
        </div>
      </div>
      <div style={{
        height: 4, borderRadius: 999, background: 'var(--bg-sunken)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: 'var(--accent)',
          borderRadius: 999,
        }} />
      </div>
    </div>
  </div>
);

const Frame = ({ children, footerPct }) => (
  <div style={{
    width: '100%', height: '100%',
    background: 'var(--bg)',
    display: 'flex', flexDirection: 'column',
    color: 'var(--text)',
    fontFamily: 'var(--font-sans)',
    letterSpacing: '-0.01em',
  }}>
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 28px 32px' }}>
      {children}
    </div>
    <ProgressFooter pct={footerPct} />
  </div>
);

// Section header (eyebrow + count) — V1
const SectionEyebrow = ({ title, count, accent = false }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  }}>
    <Eyebrow accent={accent}>{title}</Eyebrow>
    {count !== undefined && <Chip>{count}</Chip>}
  </div>
);

// ============================================================
// VARIATION 1 — Cards (current baseline)
// ============================================================

const V1Cards = () => (
  <Frame footerPct={24}>
    <DocHeader />

    <SectionEyebrow title="Cliente" count="0 / 8" />
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: 22,
      boxShadow: 'var(--shadow-sm)',
      marginBottom: 22,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <FieldLabel>Contratante</FieldLabel>
          <Segmented options={['Pessoa física', 'Pessoa jurídica']} active={0} />
        </div>
        <StackedField label="Nome completo">
          <OutlinedInput placeholder="NOME DO CONTRATANTE" />
        </StackedField>
        <StackedField label="Gênero">
          <Segmented options={['Masculino', 'Feminino']} active={0} size="sm" />
        </StackedField>
        <TwoCol>
          <StackedField label="Nacionalidade"><OutlinedInput value="brasileiro(a)" /></StackedField>
          <StackedField label="Estado civil"><OutlinedSelect placeholder="Selecione…" /></StackedField>
        </TwoCol>
        <StackedField label="Profissão"><OutlinedInput value="empresário(a)" /></StackedField>
        <TwoCol>
          <StackedField label="RG"><OutlinedInput placeholder="00.000.000-0" mono /></StackedField>
          <StackedField label="CPF"><OutlinedInput placeholder="000.000.000-00" mono /></StackedField>
        </TwoCol>

        <div style={{ height: 1, background: 'var(--border)', margin: '6px -22px' }} />
        <Eyebrow size="xs">Endereço</Eyebrow>

        <StackedField label="Logradouro"><OutlinedInput placeholder="Rua, Av., Alameda…" /></StackedField>
        <TwoCol>
          <StackedField label="Número"><OutlinedInput placeholder="" /></StackedField>
          <StackedField label="Complemento"><OutlinedInput placeholder="" /></StackedField>
        </TwoCol>
      </div>
    </div>
  </Frame>
);

// ============================================================
// VARIATION 2 — Apple Settings (grouped rows w/ hairline dividers)
// ============================================================

const SettingsRow = ({ label, children, last }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 18,
    padding: '14px 20px',
    minHeight: 54,
    borderBottom: last ? 'none' : '1px solid var(--border)',
  }}>
    <div style={{
      width: 140, flexShrink: 0,
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text)',
      letterSpacing: '-0.005em',
    }}>{label}</div>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
      {children}
    </div>
  </div>
);

const GroupTitle = ({ children, top }) => (
  <div style={{
    padding: top ? '0 6px 10px' : '24px 6px 10px',
    fontSize: 14.5,
    fontWeight: 500,
    color: 'var(--text)',
    letterSpacing: '-0.015em',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>{children}</div>
);

const V2Settings = () => (
  <Frame footerPct={24}>
    <DocHeader />

    <GroupTitle top>
      <span>Cliente</span>
      <Chip>0 / 8</Chip>
    </GroupTitle>

    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <SettingsRow label="Contratante">
        <Segmented options={['Pessoa física', 'Pessoa jurídica']} active={0} size="sm" />
      </SettingsRow>
      <SettingsRow label="Nome completo">
        <PlainValue placeholder="Nome do contratante" align="right" />
      </SettingsRow>
      <SettingsRow label="Gênero">
        <Segmented options={['Masculino', 'Feminino']} active={0} size="sm" />
      </SettingsRow>
      <SettingsRow label="Nacionalidade">
        <PlainValue value="brasileiro(a)" align="right" />
      </SettingsRow>
      <SettingsRow label="Estado civil">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-subtle)', fontSize: 13 }}>
          <span>Selecione…</span>
          {FVIcons.chev(13)}
        </div>
      </SettingsRow>
      <SettingsRow label="Profissão">
        <PlainValue value="empresário(a)" align="right" />
      </SettingsRow>
      <SettingsRow label="RG">
        <PlainValue placeholder="00.000.000-0" mono align="right" />
      </SettingsRow>
      <SettingsRow label="CPF" last>
        <PlainValue placeholder="000.000.000-00" mono align="right" />
      </SettingsRow>
    </div>

    <GroupTitle>
      <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>Endereço</span>
    </GroupTitle>

    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <SettingsRow label="Logradouro">
        <PlainValue placeholder="Rua, Av., Alameda…" align="right" />
      </SettingsRow>
      <SettingsRow label="Número">
        <PlainValue placeholder="—" align="right" />
      </SettingsRow>
      <SettingsRow label="Complemento" last>
        <PlainValue placeholder="—" align="right" />
      </SettingsRow>
    </div>
  </Frame>
);

// ============================================================
// VARIATION 3 — Typographic (eyebrow lateral, filled inputs)
// ============================================================

const V3Typographic = () => (
  <Frame footerPct={24}>
    <DocHeader />

    <div style={{
      display: 'grid',
      gridTemplateColumns: '108px 1fr',
      columnGap: 32,
      rowGap: 28,
      alignItems: 'start',
    }}>
      {/* Cliente section eyebrow */}
      <div style={{ paddingTop: 4 }}>
        <Eyebrow accent>Cliente</Eyebrow>
        <div style={{
          fontSize: 11, color: 'var(--text-subtle)',
          marginTop: 6, fontFeatureSettings: '"tnum"',
        }}>0 de 8</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FieldLabel>Contratante</FieldLabel>
          <Segmented options={['Pessoa física', 'Pessoa jurídica']} active={0} />
        </div>
        <StackedField label="Nome completo">
          <FilledInput placeholder="Nome do contratante" />
        </StackedField>
        <StackedField label="Gênero">
          <Segmented options={['Masculino', 'Feminino']} active={0} size="sm" />
        </StackedField>
        <TwoCol>
          <StackedField label="Nacionalidade"><FilledInput value="brasileiro(a)" /></StackedField>
          <StackedField label="Estado civil"><FilledSelect placeholder="Selecione…" /></StackedField>
        </TwoCol>
        <StackedField label="Profissão"><FilledInput value="empresário(a)" /></StackedField>
        <TwoCol>
          <StackedField label="RG"><FilledInput placeholder="00.000.000-0" mono /></StackedField>
          <StackedField label="CPF"><FilledInput placeholder="000.000.000-00" mono /></StackedField>
        </TwoCol>
      </div>

      {/* Endereço subsection eyebrow */}
      <div style={{ paddingTop: 4 }}>
        <Eyebrow size="xs">Endereço</Eyebrow>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <StackedField label="Logradouro"><FilledInput placeholder="Rua, Av., Alameda…" /></StackedField>
        <TwoCol>
          <StackedField label="Número"><FilledInput placeholder="—" /></StackedField>
          <StackedField label="Complemento"><FilledInput placeholder="—" /></StackedField>
        </TwoCol>
      </div>
    </div>
  </Frame>
);

// ============================================================
// VARIATION 4 — Accordion (one section at a time)
// ============================================================

const AccordionHead = ({ title, count, open, complete, last }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '16px 20px',
    background: open ? 'var(--bg-soft)' : 'var(--surface)',
    cursor: 'pointer',
    borderBottom: (open || last) ? 'none' : '1px solid var(--border)',
  }}>
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      border: '1.5px solid ' + (complete ? 'var(--accent)' : 'var(--border-strong)'),
      background: complete ? 'var(--accent)' : 'transparent',
      color: complete ? '#fff' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>{complete && FVIcons.check(11)}</div>
    <div style={{
      flex: 1, fontSize: 14, fontWeight: 500,
      letterSpacing: '-0.01em', color: 'var(--text)',
    }}>{title}</div>
    <div style={{ fontSize: 12, color: 'var(--text-subtle)', fontFeatureSettings: '"tnum"' }}>
      {count}
    </div>
    <span style={{
      color: 'var(--text-subtle)',
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform 0.2s',
      display: 'flex', alignItems: 'center',
    }}>
      {FVIcons.chev(14)}
    </span>
  </div>
);

const V4Accordion = () => (
  <Frame footerPct={24}>
    <DocHeader />

    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <AccordionHead title="Cliente" count="0 / 8" open />
      <div style={{ padding: '6px 20px 20px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <FieldLabel>Contratante</FieldLabel>
            <Segmented options={['Pessoa física', 'Pessoa jurídica']} active={0} size="sm" />
          </div>
          <StackedField label="Nome completo"><OutlinedInput placeholder="Nome do contratante" /></StackedField>
          <StackedField label="Gênero">
            <Segmented options={['Masculino', 'Feminino']} active={0} size="sm" />
          </StackedField>
          <TwoCol>
            <StackedField label="Nacionalidade"><OutlinedInput value="brasileiro(a)" /></StackedField>
            <StackedField label="Estado civil"><OutlinedSelect placeholder="Selecione…" /></StackedField>
          </TwoCol>
          <TwoCol>
            <StackedField label="RG"><OutlinedInput placeholder="00.000.000-0" mono /></StackedField>
            <StackedField label="CPF"><OutlinedInput placeholder="000.000.000-00" mono /></StackedField>
          </TwoCol>

          {/* Inset subsection — endereço */}
          <div style={{
            marginTop: 4,
            borderTop: '1px dashed var(--border-strong)',
            paddingTop: 14,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <Eyebrow size="xs">Endereço</Eyebrow>
            <StackedField label="Logradouro"><OutlinedInput placeholder="Rua, Av., Alameda…" /></StackedField>
            <TwoCol>
              <StackedField label="Número"><OutlinedInput placeholder="—" /></StackedField>
              <StackedField label="Complemento"><OutlinedInput placeholder="—" /></StackedField>
            </TwoCol>
          </div>
        </div>
      </div>

      <AccordionHead title="Honorários" count="0 / 4" />
      <AccordionHead title="Objeto e prazo" count="0 / 3" />
      <AccordionHead title="Foro" count="0 / 2" last />
    </div>
  </Frame>
);

// ============================================================
// VARIATION 5 — Hybrid: flat accordion + gold eyebrows + pill as status
// ============================================================
// • No outer card — sits directly on the page background like V3.
// • Section headers use the gold uppercase eyebrow from A/C.
// • The completion pill (0/8) IS the status indicator: neutral pill when
//   incomplete; gold-filled pill w/ check when 100%. No left bullet.
// • Sections separated by solid hairlines (edge-to-edge).
// • Subsections (Endereço) separated by a dashed hairline within the
//   open section.

const StatusPill = ({ count, complete }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: complete ? '3px 9px 3px 7px' : '3px 10px',
    fontSize: 11, fontWeight: 500,
    fontFeatureSettings: '"tnum"',
    letterSpacing: '0.01em',
    color: complete ? 'var(--brand-navy)' : 'var(--text-subtle)',
    background: complete ? 'var(--brand-gold)' : 'transparent',
    border: '1px solid ' + (complete ? 'var(--brand-gold)' : 'var(--border-strong)'),
    borderRadius: 999,
    transition: 'background 0.15s, color 0.15s',
  }}>
    {complete && FVIcons.check(10)}
    <span>{count}</span>
  </div>
);

const V5Section = ({ title, count, complete, open, last, children }) => (
  <div>
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, padding: '16px 20px 14px',
      cursor: 'pointer',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 500,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--accent)',
      }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StatusPill count={count} complete={complete} />
        <span style={{
          color: 'var(--text-subtle)',
          opacity: 0.55,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
          display: 'flex', alignItems: 'center',
        }}>{FVIcons.chev(13)}</span>
      </div>
    </div>
    {open && (
      <div style={{ padding: '0 20px 22px' }}>
        {children}
      </div>
    )}
    {!last && <div style={{ height: 1, background: 'var(--border)' }} />}
  </div>
);

const SubsectionDivider = ({ label }) => (
  <div style={{
    margin: '6px 0 2px',
    borderTop: '1px dashed var(--border-strong)',
    paddingTop: 16,
  }}>
    <div style={{
      fontSize: 9.5, fontWeight: 500,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: 'var(--text-subtle)',
    }}>{label}</div>
  </div>
);

// Narrow frame: less horizontal padding, hairlines span the full width.
const NarrowFrame = ({ children, footerPct }) => (
  <div style={{
    width: '100%', height: '100%',
    background: 'var(--bg)',
    display: 'flex', flexDirection: 'column',
    color: 'var(--text)',
    fontFamily: 'var(--font-sans)',
    letterSpacing: '-0.01em',
  }}>
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ padding: '24px 20px 4px' }}>
        <DocHeader />
      </div>
      <div style={{ height: 1, background: 'var(--border)' }} />
      {children}
    </div>
    <ProgressFooter pct={footerPct} />
  </div>
);

const V5Hybrid = () => (
  <NarrowFrame footerPct={24}>
    <V5Section title="Cliente" count="0 / 8" open>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FieldLabel>Contratante</FieldLabel>
          <Segmented options={['Pessoa física', 'Pessoa jurídica']} active={0} size="sm" />
        </div>
        <StackedField label="Nome completo">
          <FilledInput placeholder="Nome do contratante" />
        </StackedField>
        <StackedField label="Gênero">
          <Segmented options={['Masculino', 'Feminino']} active={0} size="sm" />
        </StackedField>
        <TwoCol>
          <StackedField label="Nacionalidade"><FilledInput value="brasileiro(a)" /></StackedField>
          <StackedField label="Estado civil"><FilledSelect placeholder="Selecione…" /></StackedField>
        </TwoCol>
        <StackedField label="Profissão">
          <FilledInput value="empresário(a)" />
        </StackedField>
        <TwoCol>
          <StackedField label="RG"><FilledInput placeholder="00.000.000-0" mono /></StackedField>
          <StackedField label="CPF"><FilledInput placeholder="000.000.000-00" mono /></StackedField>
        </TwoCol>

        <SubsectionDivider label="Endereço" />

        <StackedField label="Logradouro">
          <FilledInput placeholder="Rua, Av., Alameda…" />
        </StackedField>
        <TwoCol>
          <StackedField label="Número"><FilledInput placeholder="—" /></StackedField>
          <StackedField label="Complemento"><FilledInput placeholder="—" /></StackedField>
        </TwoCol>
      </div>
    </V5Section>

    <V5Section title="Honorários" count="0 / 4" />
    <V5Section title="Objeto e prazo" count="0 / 3" />
    <V5Section title="Foro" count="2 / 2" complete last />
  </NarrowFrame>
);

// Export
window.V1Cards = V1Cards;
window.V2Settings = V2Settings;
window.V3Typographic = V3Typographic;
window.V4Accordion = V4Accordion;
window.V5Hybrid = V5Hybrid;
// Primitives reused by form-complete.jsx and 03-ai-chat.jsx
Object.assign(window, {
  V5Section, SubsectionDivider, StatusPill, NarrowFrame, ProgressFooter,
  Frame, DocHeader, SectionEyebrow,
  FieldLabel, StackedField, TwoCol,
  FilledInput, FilledSelect, OutlinedInput, OutlinedSelect, PlainValue,
  Segmented, Eyebrow, Chip, FVIcons,
});
