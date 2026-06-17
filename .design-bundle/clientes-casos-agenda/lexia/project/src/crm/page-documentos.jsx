// LexIA · CRM — Documentos: biblioteca AI-first + editor de documento.
// A geração acontece pela Barra LexIA (input global); aqui vivem a biblioteca e o papel.

const CRM_DOC_STATUS = {
  gerando:    { label: 'Gerando…',    tone: 'blue' },
  rascunho:   { label: 'Rascunho',    tone: 'neutral' },
  'revisão':  { label: 'Em revisão',  tone: 'gold' },
  finalizado: { label: 'Finalizado',  tone: 'pos' },
};

const CRM_DOC_TIPOS = [
  { tipo: 'Contrato de Honorários', icon: 'receipt', desc: 'Prestação de serviços e honorários', seed: 'Minutar contrato de honorários para ' },
  { tipo: 'Procuração',             icon: 'scroll',  desc: 'Ad judicia et extra',                seed: 'Gerar procuração ad judicia para ' },
  { tipo: 'Petição',                icon: 'gavel',   desc: 'Inicial, contestação ou recurso',    seed: 'Redigir petição inicial para ' },
  { tipo: 'Parecer',                icon: 'scale',   desc: 'Opinião legal fundamentada',         seed: 'Elaborar parecer jurídico sobre ' },
];
const crmDocIcon = (modelo) => (CRM_DOC_TIPOS.find((t) => t.tipo === modelo) || { icon: 'fileText' }).icon;

// ---------- biblioteca ----------
const CRM_DOC_COLS = '40px 1fr 200px 130px 110px 70px';

const CrmDocumentosPage = ({ store, onOpenDoc, onGerar }) => {
  const [q, setQ] = crmUseState('');
  const [seg, setSeg] = crmUseState('todos');
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q.trim());

  const rows = crmUseMemo(() => store.documentos.filter((d) => {
    if (seg === 'rascunhos' && !(d.status === 'rascunho' || d.status === 'gerando')) return false;
    if (seg === 'revisao' && d.status !== 'revisão') return false;
    if (seg === 'finalizados' && d.status !== 'finalizado') return false;
    const cli = store.clientes.find((c) => c.id === d.clienteId);
    if (nq && !(norm(d.nome).includes(nq) || norm(d.modelo).includes(nq) || (cli && norm(cli.nome).includes(nq)))) return false;
    return true;
  }).sort((a, b) => b.data.localeCompare(a.data)), [store, seg, nq]);

  return (
    <FxFrame>
      <CrmPageHead title="Documentos" sub={`${store.documentos.length} documentos · redigidos e revisados com a LexIA`}
        right={<button className="btn btn-primary" onClick={() => onGerar('')}><Icon name="sparkles" size={14} />Gerar com a LexIA</button>} />

      {/* começar com a LexIA — atalhos que abrem o input global já preenchido */}
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Começar com a LexIA</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {CRM_DOC_TIPOS.map((t) => (
            <button key={t.tipo} onClick={() => onGerar(t.seed)} className="card crm-chip" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', cursor: 'pointer', textAlign: 'left',
              border: '1px solid var(--border)', fontFamily: 'var(--font-sans)', background: 'var(--surface)',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={t.icon} size={17} strokeWidth={1.7} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.tipo}</div>
                <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.desc}</div>
              </div>
              <Icon name="sparkles" size={13} style={{ color: 'var(--accent)', flexShrink: 0, opacity: 0.7 }} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <CrmSearch value={q} onChange={setQ} placeholder="Buscar por nome, modelo, cliente…" />
        <FxSegmented options={[
          { value: 'todos', label: 'Todos' },
          { value: 'rascunhos', label: 'Rascunhos' },
          { value: 'revisao', label: 'Em revisão' },
          { value: 'finalizados', label: 'Finalizados' },
        ]} value={seg} onChange={setSeg} />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: CRM_DOC_COLS, gap: 12, alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span></span><span>Documento</span><span>Cliente</span><span>Status</span><span>Atualizado</span><span style={{ textAlign: 'right' }}>Formato</span>
        </div>
        {rows.length === 0 && <CrmEmpty icon="fileText" title="Nenhum documento encontrado" sub="Ajuste a busca ou peça à LexIA para gerar um novo documento." cta={<button className="btn btn-secondary" onClick={() => onGerar('')}><Icon name="sparkles" size={14} />Gerar com a LexIA</button>} />}
        {rows.map((d, i) => {
          const cli = store.clientes.find((c) => c.id === d.clienteId);
          const st = CRM_DOC_STATUS[d.status] || CRM_DOC_STATUS.rascunho;
          return (
            <CrmRow key={d.id} onClick={() => onOpenDoc(d.id)} style={{ display: 'grid', gridTemplateColumns: CRM_DOC_COLS, gap: 12, alignItems: 'center', padding: '11px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--bg-sunken)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={crmDocIcon(d.modelo)} size={15} strokeWidth={1.7} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>{d.modelo}{d.palavras ? ` · ${d.palavras.toLocaleString('pt-BR')} palavras` : ''}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cli ? (cli.apelido || cli.nome) : '—'}</div>
              <div><CrmBadge tone={st.tone} dot>{st.label}</CrmBadge></div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fxDate(d.data)}</div>
              <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', letterSpacing: '0.04em' }}>{d.formato}</div>
            </CrmRow>
          );
        })}
      </div>
    </FxFrame>
  );
};

// ---------- papel (sempre branco — é papel) ----------
const CrmDocLetterhead = ({ numero }) => (
  <div style={{ borderBottom: '1px solid rgba(2,13,37,0.1)' }}>
    <div style={{ height: 18, background: '#C0A147' }}></div>
    <div style={{ padding: '20px 52px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#020D25' }}>
      <div>
        <div style={{ fontFamily: 'Georgia, serif', fontWeight: 500, fontSize: 15, letterSpacing: '0.02em' }}>NCM ADVOGADOS</div>
        <div style={{ fontSize: 8.5, color: 'rgba(2,13,37,0.6)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}>Sociedade de Advogados · OAB/SP 12.456</div>
      </div>
      <div style={{ fontSize: 8.5, color: 'rgba(2,13,37,0.55)', fontFamily: 'var(--font-mono)', textAlign: 'right', lineHeight: 1.5 }}>{numero || 'Nº —'}<br />São Paulo · 11.jun.2026</div>
    </div>
  </div>
);

const CrmDocP = ({ children, indent = true }) => (
  <p style={{ margin: '0 0 9px', fontSize: 11, lineHeight: 1.7, textAlign: 'justify', textIndent: indent ? '2em' : 0, color: '#020D25' }}>{children}</p>
);
const CrmDocH = ({ children, isNew }) => (
  <div style={{ fontWeight: 500, fontSize: 11, margin: '12px 0 6px', letterSpacing: '0.02em', color: '#020D25', display: 'flex', alignItems: 'center', gap: 8 }}>
    <span>{children}</span>
    {isNew && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a7f2e', background: 'rgba(192,161,71,0.18)', padding: '2px 7px', borderRadius: 999 }}>Adicionada pela LexIA</span>}
  </div>
);
const CrmDocTitle = ({ children }) => (
  <div style={{ textAlign: 'center', fontFamily: 'Georgia, serif', fontWeight: 500, fontSize: 14, letterSpacing: '0.08em', margin: '0 0 22px', color: '#020D25' }}>{children}</div>
);

const CrmDocBody = ({ doc, cli }) => {
  const nome = cli ? cli.nome.toUpperCase() : 'PARTE A QUALIFICAR';
  const qual = cli && cli.tipo === 'PJ'
    ? <>inscrita no CNPJ sob o nº {cli.doc || '00.000.000/0001-00'}, com sede em {cli.cidade || 'São Paulo'}/{cli.uf || 'SP'}</>
    : <>brasileiro(a), portador(a) do CPF {cli && cli.doc ? cli.doc : '000.000.000-00'}, residente e domiciliado(a) em {cli && cli.cidade ? cli.cidade : 'São Paulo'}/{cli && cli.uf ? cli.uf : 'SP'}</>;

  const multa = doc.multa && (
    <div key="multa" className="lex-clause-new" style={{ padding: '2px 8px', margin: '0 -8px' }}>
      <CrmDocH isNew>CLÁUSULA TERCEIRA — DA MULTA POR ATRASO</CrmDocH>
      <CrmDocP>O atraso no pagamento de qualquer parcela sujeitará a CONTRATANTE à multa de 2% (dois por cento) sobre o valor em aberto, acrescida de juros de mora de 1% (um por cento) ao mês e correção monetária pela variação positiva do IPCA, calculados pro rata die até a data do efetivo pagamento.</CrmDocP>
    </div>
  );

  if (doc.modelo === 'Procuração') {
    return (
      <>
        <CrmDocTitle>PROCURAÇÃO AD JUDICIA ET EXTRA</CrmDocTitle>
        <CrmDocH>OUTORGANTE</CrmDocH>
        <CrmDocP><strong>{nome}</strong>, {qual}.</CrmDocP>
        <CrmDocH>OUTORGADOS</CrmDocH>
        <CrmDocP><strong>LEANDRO NUNES</strong>, OAB/SP 184.221, e <strong>LEONARDO COLLARES</strong>, OAB/SP 201.560, integrantes de NCM ADVOGADOS SOCIEDADE DE ADVOGADOS, com sede na Av. Paulista, 1.842, 14º andar, São Paulo/SP.</CrmDocP>
        <CrmDocH>PODERES</CrmDocH>
        <CrmDocP>Pelo presente instrumento, o(a) OUTORGANTE nomeia e constitui os OUTORGADOS seus procuradores, conferindo-lhes os poderes da cláusula <em>ad judicia et extra</em>, para o foro em geral, podendo propor ações, defender seus interesses em juízo ou fora dele, transigir, desistir, firmar compromissos, receber e dar quitação, substabelecer com ou sem reserva de poderes, e praticar todos os demais atos necessários ao fiel cumprimento deste mandato.</CrmDocP>
        {doc.multa && multa}
      </>
    );
  }

  if (doc.modelo === 'Petição') {
    return (
      <>
        <CrmDocP indent={false}><strong>EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE SÃO PAULO/SP</strong></CrmDocP>
        <div style={{ height: 14 }}></div>
        <CrmDocP><strong>{nome}</strong>, {qual}, por seus advogados que esta subscrevem (procuração anexa), vem, respeitosamente, à presença de Vossa Excelência, propor a presente</CrmDocP>
        <CrmDocTitle>AÇÃO DE COBRANÇA</CrmDocTitle>
        <CrmDocH>I — DOS FATOS</CrmDocH>
        <CrmDocP>A parte autora celebrou com a ré relação contratual cujo objeto restou inadimplido, conforme documentação anexa. Apesar das tentativas de composição extrajudicial, a ré quedou-se inerte, não restando alternativa senão o ajuizamento da presente demanda.</CrmDocP>
        <CrmDocH>II — DO DIREITO</CrmDocH>
        <CrmDocP>O inadimplemento contratual impõe à parte ré o dever de reparação, nos termos dos arts. 389 e 475 do Código Civil, sendo devido o principal acrescido de correção monetária e juros legais desde o vencimento.</CrmDocP>
        {doc.multa && multa}
      </>
    );
  }

  if (doc.modelo === 'Parecer') {
    return (
      <>
        <CrmDocTitle>PARECER JURÍDICO</CrmDocTitle>
        <CrmDocH>EMENTA</CrmDocH>
        <CrmDocP indent={false}><em>Consulta formulada por {nome}. Análise de riscos e alternativas jurídicas. Conclusão pela viabilidade da operação, observadas as recomendações apontadas.</em></CrmDocP>
        <CrmDocH>I — DA CONSULTA</CrmDocH>
        <CrmDocP>Consulta-nos o(a) cliente acerca dos aspectos jurídicos da operação pretendida, notadamente quanto aos riscos contratuais, tributários e societários envolvidos, bem como das medidas mitigadoras cabíveis.</CrmDocP>
        <CrmDocH>II — DA ANÁLISE</CrmDocH>
        <CrmDocP>Da documentação examinada, verifica-se que a operação encontra amparo na legislação vigente, recomendando-se, contudo, a formalização de instrumentos acessórios de garantia e a revisão das cláusulas de responsabilidade, de modo a delimitar com precisão as obrigações de cada parte.</CrmDocP>
        {doc.multa && multa}
      </>
    );
  }

  // contrato de honorários (padrão)
  return (
    <>
      <CrmDocTitle>CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS</CrmDocTitle>
      <CrmDocP>Pelo presente instrumento particular, de um lado <strong>{nome}</strong>, {qual}, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>;</CrmDocP>
      <CrmDocP>E, de outro lado, <strong>NCM ADVOGADOS SOCIEDADE DE ADVOGADOS</strong>, inscrita na OAB/SP sob o nº 12.456, com sede na Av. Paulista, 1.842, 14º andar, São Paulo/SP, doravante denominada <strong>CONTRATADA</strong>; resolvem celebrar o presente contrato, que se regerá pelas cláusulas seguintes.</CrmDocP>
      <CrmDocH>CLÁUSULA PRIMEIRA — DO OBJETO</CrmDocH>
      <CrmDocP>A CONTRATADA prestará à CONTRATANTE serviços de consultoria e assessoria jurídica, incluindo a elaboração de pareceres, contratos e demais documentos necessários ao bom andamento da atuação descrita no presente instrumento.</CrmDocP>
      <CrmDocH>CLÁUSULA SEGUNDA — DOS HONORÁRIOS</CrmDocH>
      <CrmDocP>Pela prestação dos serviços ora contratados, a CONTRATANTE pagará à CONTRATADA o valor mensal de R$ 8.500,00 (oito mil e quinhentos reais), vencível todo dia 10 de cada mês, mediante depósito bancário ou PIX em conta de titularidade da CONTRATADA.</CrmDocP>
      {doc.multa ? multa : null}
      <CrmDocH>{doc.multa ? 'CLÁUSULA QUARTA — DA VIGÊNCIA' : 'CLÁUSULA TERCEIRA — DA VIGÊNCIA'}</CrmDocH>
      <CrmDocP>O presente contrato vigerá pelo prazo de 12 (doze) meses, sendo renovado automaticamente por iguais períodos, salvo manifestação em contrário de qualquer das partes mediante aviso prévio de 30 (trinta) dias.</CrmDocP>
    </>
  );
};

const CrmDocSkeleton = () => (
  <div style={{ padding: '28px 52px' }}>
    <div className="lex-skel" style={{ height: 14, width: '58%', margin: '0 auto 24px' }}></div>
    {[92, 100, 96, 84, 0, 38, 97, 100, 90, 0, 42, 100, 95, 88, 64].map((w, i) => (
      w === 0
        ? <div key={i} style={{ height: 14 }}></div>
        : <div key={i} className="lex-skel" style={{ height: 9, width: w + '%', marginBottom: 9, animationDelay: (i * 70) + 'ms' }}></div>
    ))}
  </div>
);

// ---------- editor ----------
const CrmDocumentoEditor = ({ store, docId, nav, panelOpen, panelMode, setPanelMode }) => {
  const { toast } = useCrmToast();
  const doc = store.documentos.find((d) => d.id === docId);
  if (!doc) {
    return (
      <CrmEmpty icon="fileText" title="Documento não encontrado" sub="Ele pode ter sido removido ou pertence a outra sessão."
        cta={<button className="btn btn-secondary" onClick={() => nav.navPage('documentos')}><Icon name="chevronLeft" size={14} />Voltar para Documentos</button>} />
    );
  }
  const cli = store.clientes.find((c) => c.id === doc.clienteId);
  const gerando = doc.status === 'gerando';
  const aiDock = panelOpen;
  const SegBtn = ({ mode, icon, children }) => {
    const on = panelOpen && panelMode === mode;
    return (
      <button onClick={() => setPanelMode(mode)} disabled={gerando} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 11px', borderRadius: 7, border: 'none', cursor: gerando ? 'default' : 'pointer',
        background: on ? 'var(--surface)' : 'transparent', color: on ? 'var(--accent)' : 'var(--text-muted)',
        fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: on ? 600 : 500, letterSpacing: '-0.01em',
        boxShadow: on ? 'var(--shadow-sm)' : 'none', transition: 'background .14s, color .14s',
      }}><Icon name={icon} size={13} />{children}</button>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <button onClick={() => nav.navPage('documentos')} title="Voltar para Documentos" className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0, borderRadius: 9, flexShrink: 0 }}><Icon name="chevronLeft" size={17} /></button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.nome}</div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <span>Documentos</span><Icon name="chevronRight" size={10} /><span>{doc.modelo}</span>
            {cli && <><Icon name="chevronRight" size={10} /><CrmLink onClick={() => nav.openCliente(cli.id)}>{cli.apelido || cli.nome}</CrmLink></>}
          </div>
        </div>
        <button className="btn btn-secondary" style={{ height: 32, fontSize: 12 }} onClick={() => toast('Download iniciado')} disabled={gerando}><Icon name="download" size={14} />Baixar</button>
        {/* toggle: alterna o painel entre o chat da LexIA e o preenchimento manual */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--bg-sunken)', border: '1px solid var(--border-strong)', borderRadius: 9, padding: 3, height: 32, opacity: gerando ? 0.5 : 1 }}>
          <SegBtn mode="chat" icon="sparkles">LexIA</SegBtn>
          <SegBtn mode="form" icon="edit">Formulário</SegBtn>
        </div>
      </div>

      {/* papel — sempre A4: dimensionado pela ALTURA (constante), então o painel só o re-centraliza, nunca o redimensiona */}
      <section style={{
        flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--bg-sunken)',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        padding: '16px 36px 14px',
        paddingRight: aiDock ? 'calc(clamp(340px, 30vw, 430px) + 50px)' : 36,
        transition: 'padding .52s cubic-bezier(.32,.72,.24,1)',
      }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          {gerando ? (
            <>
              <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <span className="crm-dot" style={{ animationDelay: '0ms' }}></span>
                <span className="crm-dot" style={{ animationDelay: '160ms' }}></span>
                <span className="crm-dot" style={{ animationDelay: '320ms' }}></span>
              </span>
              <span style={{ fontWeight: 500, color: 'var(--text)' }}>A LexIA está redigindo a minuta…</span>
            </>
          ) : (
            <>
              <span>{(doc.palavras || 0).toLocaleString('pt-BR')} palavras</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', opacity: 0.5 }}></span>
              <span>atualizado {fxDate(doc.data)}</span>
            </>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <div style={{ height: '100%', aspectRatio: '210 / 297', flexShrink: 0, background: '#FFFFFF', borderRadius: 6, boxShadow: '0 1px 3px rgba(2,13,37,0.06), 0 18px 50px rgba(2,13,37,0.12)', overflow: 'hidden', position: 'relative' }}>
            <CrmDocLetterhead numero={doc.numero} />
            {gerando
              ? <CrmDocSkeleton />
              : <div className="crm-pop-in" style={{ padding: '26px 52px 32px' }}><CrmDocBody doc={doc} cli={cli} /></div>}
          </div>
        </div>

        {!gerando && <div style={{ flexShrink: 0, marginTop: 8, fontSize: 12, color: 'var(--text-subtle)', textAlign: 'center' }}>Página 1 de {doc.modelo === 'Procuração' ? 1 : 3}</div>}
      </section>
    </div>
  );
};

// ---------- formulário manual (alterna com o chat no painel acoplado) ----------
// Estilo alinhado ao chat da LexIA: mesma superfície, cantos suaves, ritmo vertical.
const CrmDocFormField = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    {children}
  </div>
);
const crmFormInput = { width: '100%', height: 38, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--surface)', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text)', outline: 'none', letterSpacing: '-0.01em' };

const CrmDocForm = ({ doc, store, onApply }) => {
  const { toast } = useCrmToast();
  const cli = store.clientes.find((c) => c.id === doc.clienteId);
  const [valor, setValor] = crmUseState('R$ 8.500,00');
  const [dia, setDia] = crmUseState('10');
  const [meses, setMeses] = crmUseState('12');
  const [reajuste, setReajuste] = crmUseState('IPCA');
  const [objeto, setObjeto] = crmUseState('Consultoria e assessoria jurídica nas áreas cível, contratual e empresarial.');
  const [multa, setMulta] = crmUseState(!!doc.multa);

  const salvar = () => { onApply({ multa }); toast('Documento atualizado'); };

  return (
    <>
      <div className="lex-back" style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Preencha os campos do documento manualmente. As alterações aparecem no papel ao lado.
        </div>

        <CrmDocFormField label="Contratante">
          <select value={cli ? cli.id : ''} onChange={() => {}} style={crmFormInput}>
            {store.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </CrmDocFormField>

        <CrmDocFormField label="Objeto do contrato">
          <textarea value={objeto} onChange={(e) => setObjeto(e.target.value)} rows={3}
            style={{ ...crmFormInput, height: 'auto', minHeight: 74, padding: '9px 12px', resize: 'none', lineHeight: 1.5 }} />
        </CrmDocFormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px', gap: 10 }}>
          <CrmDocFormField label="Valor mensal"><input value={valor} onChange={(e) => setValor(e.target.value)} style={crmFormInput} /></CrmDocFormField>
          <CrmDocFormField label="Venc."><input value={dia} onChange={(e) => setDia(e.target.value)} style={{ ...crmFormInput, textAlign: 'center' }} /></CrmDocFormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 10 }}>
          <CrmDocFormField label="Meses"><input value={meses} onChange={(e) => setMeses(e.target.value)} style={{ ...crmFormInput, textAlign: 'center' }} /></CrmDocFormField>
          <CrmDocFormField label="Reajuste">
            <select value={reajuste} onChange={(e) => setReajuste(e.target.value)} style={crmFormInput}>
              {['IPCA', 'IGP-M', 'INPC', 'Sem reajuste'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </CrmDocFormField>
        </div>

        <button onClick={() => setMulta((m) => !m)} style={{
          display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '11px 13px',
          borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Multa por atraso</div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>2% + juros de 1% a.m. · padrão do escritório</div>
          </div>
          <span style={{ width: 38, height: 22, borderRadius: 999, flexShrink: 0, padding: 2, background: multa ? 'var(--accent)' : 'var(--bg-sunken)', transition: 'background .16s' }}>
            <span style={{ display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(2,13,37,0.3)', transform: multa ? 'translateX(16px)' : 'translateX(0)', transition: 'transform .16s cubic-bezier(.34,1.4,.5,1)' }}></span>
          </span>
        </button>
      </div>

      <div style={{ position: 'relative', padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-soft) 60%, transparent)' }}>
        <button onClick={salvar} className="btn btn-primary" style={{ width: '100%', height: 38, fontSize: 13 }}><Icon name="check" size={15} />Atualizar documento</button>
      </div>
    </>
  );
};

Object.assign(window, { CrmDocumentosPage, CrmDocumentoEditor, CrmDocForm, CRM_DOC_STATUS, CRM_DOC_TIPOS, crmDocIcon });
