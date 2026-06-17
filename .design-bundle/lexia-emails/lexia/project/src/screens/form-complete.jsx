// Complete form design — V6
// Builds on V5Hybrid (flat accordion, gold eyebrows, pill as status).
// Adds: multiple contratantes, PF/PJ branching, sócios repeater,
// honorários type with conditional fields, "Na assinatura" date pill.

// ============================================================
// New shared primitives (extend the V5 set)
// ============================================================

// Compact segmented (used for inline F|J, M|F micro-controls)
const MicroSeg = ({ options, active = 0 }) => (
  <div style={{
    display: 'inline-flex',
    padding: 3,
    background: 'var(--bg-sunken)',
    borderRadius: 9,
    border: '1px solid var(--border)',
    height: 40,
    boxSizing: 'border-box',
  }}>
    {options.map((opt, i) => (
      <div key={opt + i} style={{
        padding: '0 12px',
        minWidth: 28,
        fontSize: 12,
        fontWeight: i === active ? 600 : 500,
        color: i === active ? 'var(--text)' : 'var(--text-muted)',
        background: i === active ? 'var(--surface)' : 'transparent',
        boxShadow: i === active ? '0 1px 2px rgba(2,13,37,0.08)' : 'none',
        borderRadius: 6,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        letterSpacing: '0.01em',
      }}>{opt}</div>
    ))}
  </div>
);

// Textarea (filled)
const FilledTextarea = ({ placeholder, value, rows = 4 }) => (
  <div style={{
    minHeight: rows * 22 + 16,
    padding: '12px 14px',
    background: 'var(--bg-soft)',
    borderRadius: 10,
    fontSize: 13,
    lineHeight: 1.6,
    color: value ? 'var(--text)' : 'var(--text-subtle)',
    whiteSpace: 'pre-wrap',
  }}>{value || placeholder}</div>
);

// Date input + "Na assinatura" toggle pill
const DateOrOnSign = ({ active = false, value, label = 'Na assinatura' }) => (
  <div style={{ display: 'flex', gap: 6 }}>
    <div style={{
      flex: 1, height: 40, padding: '0 14px',
      background: active ? 'var(--accent-soft)' : 'var(--bg-soft)',
      border: active ? '1px solid rgba(192, 161, 71, 0.35)' : '1px solid transparent',
      borderRadius: 10,
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 13,
      color: active ? 'var(--accent)' : (value ? 'var(--text)' : 'var(--text-subtle)'),
      fontFamily: active ? 'var(--font-sans)' : 'var(--font-mono)',
      fontWeight: active ? 600 : 400,
      letterSpacing: active ? '-0.005em' : 0,
      minWidth: 0,
    }}>
      {active && FVIcons.check(12)}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {active ? 'No ato da assinatura' : (value || 'dd/mm/aaaa')}
      </span>
    </div>
    <button style={{
      height: 40, padding: '0 12px',
      background: active ? 'var(--brand-gold)' : 'var(--surface)',
      color: active ? 'var(--brand-navy)' : 'var(--text-muted)',
      border: '1px solid ' + (active ? 'var(--brand-gold)' : 'var(--border-strong)'),
      borderRadius: 10,
      fontSize: 12, fontWeight: 500,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      letterSpacing: '-0.005em',
      fontFamily: 'inherit',
    }}>{label}</button>
  </div>
);

// Plus icon
const PlusIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

// Dashed "add" button (full width)
const AddButton = ({ children }) => (
  <button style={{
    width: '100%', height: 40,
    background: 'transparent',
    border: '1px dashed var(--border-strong)',
    borderRadius: 10,
    color: 'var(--text-muted)',
    fontSize: 12, fontWeight: 500,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    letterSpacing: '-0.005em',
    fontFamily: 'inherit',
  }}>
    <PlusIcon />
    {children}
  </button>
);

// Contratante / sócio chip strip (numbered selector)
const ContratanteStrip = ({ items, active = 0, onAdd, addLabel }) => (
  <div style={{
    display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottom: '1px dashed var(--border-strong)',
  }}>
    {items.map((it, i) => {
      const isActive = i === active;
      return (
        <div key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 10px 5px 7px',
          background: isActive ? 'var(--accent-soft)' : 'transparent',
          color: isActive ? 'var(--accent)' : 'var(--text-muted)',
          border: '1px solid ' + (isActive ? 'rgba(192, 161, 71, 0.35)' : 'var(--border-strong)'),
          borderRadius: 999,
          fontSize: 12, fontWeight: 500,
          letterSpacing: '-0.005em',
          cursor: 'pointer',
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%',
            background: isActive ? 'var(--accent)' : 'var(--bg-sunken)',
            color: isActive ? '#fff' : 'var(--text-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 500,
            fontFeatureSettings: '"tnum"',
          }}>{i + 1}</span>
          <span>{it}</span>
        </div>
      );
    })}
    <button style={{
      background: 'transparent', border: 'none',
      color: 'var(--text-muted)',
      fontSize: 12, fontWeight: 500,
      padding: '5px 8px',
      cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 4,
      letterSpacing: '-0.005em',
      fontFamily: 'inherit',
    }}>
      <PlusIcon /> {addLabel}
    </button>
  </div>
);

// Repeater item (sócio, parcela) with header
const RepeaterItem = ({ index, title, onRemove, removable = true, children, last }) => (
  <div style={{
    paddingBottom: 16,
    marginBottom: last ? 4 : 16,
    borderBottom: last ? 'none' : '1px solid var(--border)',
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 500,
          fontFeatureSettings: '"tnum"',
        }}>{index}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.005em' }}>
          {title}
        </div>
      </div>
      {removable && (
        <button style={{
          background: 'transparent', border: 'none',
          color: 'var(--text-subtle)', cursor: 'pointer',
          fontSize: 11, fontWeight: 500,
          padding: '4px 8px',
          borderRadius: 6,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontFamily: 'inherit',
        }}>
          <TrashIcon size={11} /> Remover
        </button>
      )}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {children}
    </div>
  </div>
);

// ============================================================
// Identity row: F|J + M|F + Nome completo (or Razão social)
// ============================================================

const IdentityRowPF = () => (
  <>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <FieldLabel>Pessoa</FieldLabel>
        <MicroSeg options={['F', 'J']} active={0} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <FieldLabel>Gênero</FieldLabel>
        <MicroSeg options={['M', 'F']} active={0} />
      </div>
    </div>
    <StackedField label="Nome completo">
      <FilledInput placeholder="Nome do contratante" />
    </StackedField>
  </>
);

const IdentityRowPJ = () => (
  <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-start' }}>
      <FieldLabel>Pessoa</FieldLabel>
      <MicroSeg options={['F', 'J']} active={1} />
    </div>
    <StackedField label="Razão social">
      <FilledInput placeholder="Razão social da empresa" />
    </StackedField>
  </>
);

// Sócio identity row (M|F + Nome) — used inside PJ
const SocioIdentityRow = () => (
  <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-start' }}>
      <FieldLabel>Gênero</FieldLabel>
      <MicroSeg options={['M', 'F']} active={0} />
    </div>
    <StackedField label="Nome completo">
      <FilledInput placeholder="Nome do sócio" />
    </StackedField>
  </>
);

// Reusable: PF personal fields (sans the identity row, sans address)
const PFPersonalFields = () => (
  <>
    <TwoCol>
      <StackedField label="Nacionalidade"><FilledInput value="brasileiro(a)" /></StackedField>
      <StackedField label="Estado civil"><FilledSelect placeholder="Selecione…" /></StackedField>
    </TwoCol>
    <StackedField label="Profissão"><FilledInput value="empresário(a)" /></StackedField>
    <TwoCol>
      <StackedField label="RG"><FilledInput placeholder="00.000.000-0" mono /></StackedField>
      <StackedField label="CPF"><FilledInput placeholder="000.000.000-00" mono /></StackedField>
    </TwoCol>
  </>
);

// Address subsection
const AddressFields = () => (
  <>
    <SubsectionDivider label="Endereço" />
    <StackedField label="Logradouro"><FilledInput placeholder="Rua, Av., Alameda…" /></StackedField>
    <TwoCol>
      <StackedField label="Número"><FilledInput placeholder="—" /></StackedField>
      <StackedField label="Complemento"><FilledInput placeholder="—" /></StackedField>
    </TwoCol>
  </>
);

// ============================================================
// CLIENTE section content — PF and PJ variants
// ============================================================

const ClientePFContent = () => (
  <>
    <ContratanteStrip
      items={['Helena Vargas']}
      active={0}
      addLabel="Adicionar contratante"
    />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <IdentityRowPF />
      <PFPersonalFields />
      <StackedField label="E-mail">
        <FilledInput placeholder="email@exemplo.com" mono />
      </StackedField>
      <AddressFields />
    </div>
  </>
);

const ClientePJContent = () => (
  <>
    <ContratanteStrip
      items={['Vargas Consultoria LTDA']}
      active={0}
      addLabel="Adicionar contratante"
    />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <IdentityRowPJ />
      <TwoCol>
        <StackedField label="CNPJ"><FilledInput placeholder="00.000.000/0000-00" mono /></StackedField>
        <StackedField label="E-mail"><FilledInput placeholder="email@empresa.com" mono /></StackedField>
      </TwoCol>
      <AddressFields />

      {/* Sócios subsection */}
      <SubsectionDivider label="Sócios representantes" />

      <RepeaterItem index={1} title="Sócio representante">
        <SocioIdentityRow />
        <TwoCol>
          <StackedField label="Nacionalidade"><FilledInput value="brasileiro(a)" /></StackedField>
          <StackedField label="Estado civil"><FilledSelect placeholder="Selecione…" /></StackedField>
        </TwoCol>
        <StackedField label="Profissão"><FilledInput value="empresário(a)" /></StackedField>
        <TwoCol>
          <StackedField label="RG"><FilledInput placeholder="00.000.000-0" mono /></StackedField>
          <StackedField label="CPF"><FilledInput placeholder="000.000.000-00" mono /></StackedField>
        </TwoCol>
      </RepeaterItem>

      <AddButton>Adicionar sócio</AddButton>
    </div>
  </>
);

// ============================================================
// OBJETO E PRAZO section
// ============================================================

const ObjetoContent = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <StackedField label="Objeto">
      <FilledTextarea
        placeholder="Descreva os serviços jurídicos a serem prestados. Ex: assessoria e consultoria em matéria cível e empresarial, incluindo patrocínio em ações judiciais e administrativas relacionadas."
        rows={4}
      />
    </StackedField>
  </div>
);

// ============================================================
// HONORÁRIOS section — type + conditional fields
// ============================================================

const HonorTypeSelector = ({ value = 'Parcelado' }) => (
  <StackedField label="Tipo de honorários">
    <FilledSelect value={value} />
  </StackedField>
);

const BaseCalculoSelector = () => (
  <StackedField label="Base de cálculo">
    <FilledSelect placeholder="Sobre o proveito econômico" />
  </StackedField>
);

// 6 honorários body variants
const HonorAVista = () => (
  <>
    <StackedField label="Valor total dos honorários">
      <FilledInput placeholder="R$ 0,00" mono />
    </StackedField>
    <StackedField label="Data de pagamento">
      <DateOrOnSign active />
    </StackedField>
  </>
);
const HonorParcelado = () => (
  <>
    <StackedField label="Valor total dos honorários">
      <FilledInput value="R$ 12.000,00" mono />
    </StackedField>
    <TwoCol>
      <StackedField label="Número de parcelas">
        <FilledInput value="6" mono />
      </StackedField>
      <StackedField label="Valor por parcela">
        <FilledInput value="R$ 2.000,00" mono />
      </StackedField>
    </TwoCol>
    <StackedField label="Data da primeira parcela">
      <DateOrOnSign active />
    </StackedField>
  </>
);
const HonorVariadas = () => (
  <>
    <RepeaterItem index={1} title="Parcela">
      <TwoCol>
        <StackedField label="Valor"><FilledInput value="R$ 5.000,00" mono /></StackedField>
        <StackedField label="Vencimento"><DateOrOnSign active label="Assinatura" /></StackedField>
      </TwoCol>
    </RepeaterItem>
    <RepeaterItem index={2} title="Parcela">
      <TwoCol>
        <StackedField label="Valor"><FilledInput value="R$ 7.000,00" mono /></StackedField>
        <StackedField label="Vencimento"><FilledInput placeholder="dd/mm/aaaa" mono /></StackedField>
      </TwoCol>
    </RepeaterItem>
    <AddButton>Adicionar parcela</AddButton>
  </>
);
const HonorExitoPuro = () => (
  <>
    <StackedField label="Percentual de êxito">
      <FilledInput placeholder="20%" mono />
    </StackedField>
    <BaseCalculoSelector />
  </>
);
const HonorAVistaExito = () => (
  <>
    <StackedField label="Valor dos honorários fixos">
      <FilledInput placeholder="R$ 0,00" mono />
    </StackedField>
    <StackedField label="Data de pagamento">
      <DateOrOnSign active />
    </StackedField>
    <SubsectionDivider label="Êxito" />
    <StackedField label="Percentual de êxito">
      <FilledInput placeholder="20%" mono />
    </StackedField>
    <BaseCalculoSelector />
  </>
);
const HonorParceladoExito = () => (
  <>
    <StackedField label="Valor total dos honorários">
      <FilledInput value="R$ 12.000,00" mono />
    </StackedField>
    <TwoCol>
      <StackedField label="Número de parcelas">
        <FilledInput value="6" mono />
      </StackedField>
      <StackedField label="Valor por parcela">
        <FilledInput value="R$ 2.000,00" mono />
      </StackedField>
    </TwoCol>
    <StackedField label="Data da primeira parcela">
      <DateOrOnSign active />
    </StackedField>
    <SubsectionDivider label="Êxito" />
    <StackedField label="Percentual de êxito">
      <FilledInput value="20%" mono />
    </StackedField>
    <BaseCalculoSelector />
  </>
);

const HonorariosContent = ({ type = 'Parcelado' }) => {
  const bodies = {
    'À vista': <HonorAVista />,
    'Parcelado': <HonorParcelado />,
    'Parcelas variadas': <HonorVariadas />,
    'Êxito puro': <HonorExitoPuro />,
    'À vista + êxito': <HonorAVistaExito />,
    'Parcelado + êxito': <HonorParceladoExito />,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <HonorTypeSelector value={type} />
      {bodies[type]}
    </div>
  );
};

// ============================================================
// FORO E DATA section
// ============================================================

const ForoContent = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <StackedField label="Cidade do foro">
      <FilledInput value="São Paulo / SP" />
    </StackedField>
    <StackedField label="Data de assinatura">
      <FilledInput value="21/05/2026" mono />
    </StackedField>
  </div>
);

// ============================================================
// Full forms — PF and PJ
// ============================================================

const FormCompletePF = () => (
  <NarrowFrame footerPct={42}>
    <V5Section title="Cliente" count="6 / 11" open>
      <ClientePFContent />
    </V5Section>
    <V5Section title="Objeto e prazo" count="0 / 1" open>
      <ObjetoContent />
    </V5Section>
    <V5Section title="Honorários" count="3 / 4" open>
      <HonorariosContent type="Parcelado" />
    </V5Section>
    <V5Section title="Foro e data" count="2 / 2" complete open last>
      <ForoContent />
    </V5Section>
  </NarrowFrame>
);

const FormCompletePJ = () => (
  <NarrowFrame footerPct={38}>
    <V5Section title="Cliente" count="3 / 13" open>
      <ClientePJContent />
    </V5Section>
    <V5Section title="Objeto e prazo" count="0 / 1" open>
      <ObjetoContent />
    </V5Section>
    <V5Section title="Honorários" count="5 / 6" open>
      <HonorariosContent type="Parcelado + êxito" />
    </V5Section>
    <V5Section title="Foro e data" count="1 / 2" open last>
      <ForoContent />
    </V5Section>
  </NarrowFrame>
);

window.FormCompletePF = FormCompletePF;
window.FormCompletePJ = FormCompletePJ;
// Expose content blocks for use in the unified editor (03-ai-chat.jsx)
Object.assign(window, {
  ClientePFContent, ClientePJContent,
  ObjetoContent, HonorariosContent, ForoContent,
  IdentityRowPF, IdentityRowPJ, SocioIdentityRow,
  PFPersonalFields, AddressFields,
  ContratanteStrip, RepeaterItem, AddButton,
  DateOrOnSign, MicroSeg, FilledTextarea,
});
