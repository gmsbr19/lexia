// ============================================================================
// LexIA · Sistema de logotipo
// Conceito: contraste tipográfico conta a marca.
//   "Lex" — serifa refinada (Spectral): tradição, direito, gravidade.
//   "IA"  — assinatura dourada: a tecnologia / inteligência.
// Navy + dourado, dourado como assinatura. Nada de SVG complexo: só a fagulha
// (4 pontas), que já é a linguagem de "IA/geração" no design system.
// ============================================================================

const SERIF = '"Spectral", Georgia, "Times New Roman", serif';
const MONO  = '"JetBrains Mono", ui-monospace, monospace';
const SANS  = '"Inter", -apple-system, system-ui, sans-serif';

const C = {
  navy:     '#020D25',
  panel:    '#0A1733',
  panel3:   '#13234C',
  gold:     '#C0A147',
  goldSoft: '#D8BE7A',
  goldDeep: '#9A7F2E',
  cream:    '#F5F1E4',
  creamDim: 'rgba(245,241,228,0.66)',
  border:   'rgba(255,255,255,0.08)',
  borderGold:'rgba(192,161,71,0.40)',
  // tema claro
  ink:      '#020D25',
  inkDim:   'rgba(2,13,37,0.60)',
  paper:    '#FAFAF7',
};

// ── Fagulha (4 pontas) — assinatura de "IA / geração" ──────────────────────
function Spark({ size = 18, color = C.gold, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      style={{ display: 'block', ...style }}>
      <path d="M12 0.5 L14 9.6 L23.5 12 L14 14.4 L12 23.5 L10 14.4 L0.5 12 L10 9.6 Z"
        fill={color} />
    </svg>
  );
}

// ── Símbolo / monograma ────────────────────────────────────────────────────
// variant: 'fill' (tile dourado, L navy) · 'outline' (tile navy, borda+L dourado)
function Mark({ size = 72, variant = 'fill', spark = false }) {
  const r = Math.round(size * 0.22);
  const base = {
    position: 'relative',
    width: size, height: size, borderRadius: r,
    display: 'grid', placeItems: 'center', flexShrink: 0,
  };
  const isFill = variant === 'fill';
  const tile = isFill
    ? { background: C.gold }
    : { background: C.panel, border: `1px solid ${C.borderGold}` };
  return (
    <div style={{ ...base, ...tile }}>
      <span style={{
        fontFamily: SERIF, fontWeight: 600, lineHeight: 1,
        fontSize: Math.round(size * 0.58),
        color: isFill ? C.navy : C.gold,
        letterSpacing: '-0.02em',
        marginTop: -size * 0.02,
      }}>L</span>
      {spark && (
        <Spark size={Math.round(size * 0.26)}
          color={isFill ? C.navy : C.gold}
          style={{ position: 'absolute', top: size * 0.13, right: size * 0.13 }} />
      )}
    </div>
  );
}

// ── Wordmarks ──────────────────────────────────────────────────────────────

// A · Bicolor serifa — "Lex" creme + "IA" dourado. Puro, clássico. (recomendado)
function WMBicolor({ size = 72, cream = C.cream, gold = C.gold }) {
  return (
    <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: size,
      letterSpacing: '-0.025em', lineHeight: 1, display: 'flex' }}>
      <span style={{ color: cream }}>Lex</span>
      <span style={{ color: gold }}>IA</span>
    </div>
  );
}

// B · Serifa + monoespaçada — "Lex" serifa, "IA" mono dourado (tradição + tech)
function WMSerifMono({ size = 72, cream = C.cream, gold = C.gold }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: size,
        letterSpacing: '-0.025em', lineHeight: 1, color: cream }}>Lex</span>
      <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: size * 0.74,
        letterSpacing: '-0.01em', lineHeight: 1, color: gold,
        marginLeft: size * 0.06 }}>IA</span>
    </div>
  );
}

// C · Com fagulha — bicolor + fagulha sobrescrita (registro tech sutil)
function WMSpark({ size = 72, cream = C.cream, gold = C.gold }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex',
      fontFamily: SERIF, fontWeight: 500, fontSize: size,
      letterSpacing: '-0.025em', lineHeight: 1 }}>
      <span style={{ color: cream }}>Lex</span>
      <span style={{ color: gold }}>IA</span>
      <Spark size={size * 0.26} color={gold}
        style={{ position: 'absolute', top: -size * 0.06, right: -size * 0.22 }} />
    </div>
  );
}

// D · Separador fagulha — "Lex · IA" com a fagulha como ponto
function WMDot({ size = 64, cream = C.cream, gold = C.gold }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.16,
      fontFamily: SERIF, fontWeight: 500, fontSize: size,
      letterSpacing: '-0.02em', lineHeight: 1 }}>
      <span style={{ color: cream }}>Lex</span>
      <Spark size={size * 0.3} color={gold} />
      <span style={{ color: gold }}>IA</span>
    </div>
  );
}

// E · Com tagline — wordmark + filete + sobrescrito
function WMTagline({ size = 60, cream = C.cream, gold = C.gold, dim = C.creamDim }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <WMBicolor size={size} cream={cream} gold={gold} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 28, height: 1, background: C.borderGold }} />
        <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12,
          letterSpacing: '0.32em', textTransform: 'uppercase', color: dim,
          paddingLeft: '0.32em' }}>Inteligência Jurídica</span>
        <span style={{ width: 28, height: 1, background: C.borderGold }} />
      </div>
    </div>
  );
}

// ── Lockup completo: símbolo + wordmark ─────────────────────────────────────
function Lockup({ markSize = 64, wordSize = 52, variant = 'fill', cream = C.cream, gold = C.gold }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: markSize * 0.34 }}>
      <Mark size={markSize} variant={variant} />
      <WMBicolor size={wordSize} cream={cream} gold={gold} />
    </div>
  );
}

// ── Palco: preenche o artboard com um fundo e centraliza ────────────────────
function Stage({ bg = C.navy, children, dir = 'center' }) {
  return (
    <div style={{ width: '100%', height: '100%', background: bg,
      display: 'flex', alignItems: 'center',
      justifyContent: dir === 'center' ? 'center' : dir,
      overflow: 'hidden' }}>
      {children}
    </div>
  );
}

// ── Escala de favicon ───────────────────────────────────────────────────────
function FaviconScale() {
  const sizes = [48, 32, 24, 16];
  return (
    <Stage bg={C.navy}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40 }}>
        {sizes.map((s) => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 14 }}>
            <Mark size={s} variant="fill" />
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.creamDim }}>{s}px</span>
          </div>
        ))}
      </div>
    </Stage>
  );
}

// ── Símbolo: variações lado a lado ──────────────────────────────────────────
function MarkVariants() {
  const items = [
    { v: 'fill', spark: false, cap: 'sólido' },
    { v: 'outline', spark: false, cap: 'contorno' },
    { v: 'outline', spark: true, cap: 'com fagulha' },
  ];
  return (
    <Stage bg={C.navy}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 56 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 16 }}>
            <Mark size={88} variant={it.v} spark={it.spark} />
            <span style={{ fontFamily: SANS, fontSize: 12, color: C.creamDim }}>{it.cap}</span>
          </div>
        ))}
      </div>
    </Stage>
  );
}

// ── Aplicação: cabeçalho de sidebar ─────────────────────────────────────────
function SidebarApp({ theme = 'dark' }) {
  const dark = theme === 'dark';
  const bg = dark ? C.panel : '#FFFFFF';
  const pageBg = dark ? C.navy : C.paper;
  const txt = dark ? C.cream : C.ink;
  const dim = dark ? C.creamDim : C.inkDim;
  const bd = dark ? C.border : 'rgba(2,13,37,0.08)';
  const navItems = ['Início', 'Documentos', 'Casos', 'Clientes', 'Agenda'];
  return (
    <div style={{ width: '100%', height: '100%', background: pageBg,
      display: 'flex', padding: 22 }}>
      <div style={{ width: '100%', background: bg, border: `1px solid ${bd}`,
        borderRadius: 14, padding: '22px 16px', display: 'flex', flexDirection: 'column' }}>
        {/* marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 6px 22px' }}>
          <Mark size={34} variant="fill" />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
            <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 17,
              letterSpacing: '-0.02em' }}>
              <span style={{ color: txt }}>Lex</span><span style={{ color: dark ? C.gold : C.goldDeep }}>IA</span>
            </span>
            <span style={{ fontFamily: SANS, fontSize: 11, color: dim }}>Inteligência Jurídica</span>
          </div>
        </div>
        <div style={{ height: 1, background: bd, margin: '0 -16px 14px' }} />
        {/* nav fantasma */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((n, i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 11,
              height: 34, padding: '0 10px', borderRadius: 8,
              background: i === 0 ? (dark ? 'rgba(192,161,71,0.12)' : 'rgba(192,161,71,0.14)') : 'transparent',
              color: i === 0 ? (dark ? C.goldSoft : C.goldDeep) : dim,
              fontFamily: SANS, fontSize: 14, fontWeight: i === 0 ? 500 : 400 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2,
                background: i === 0 ? (dark ? C.gold : C.goldDeep) : 'currentColor',
                opacity: i === 0 ? 1 : 0.5 }} />
              {n}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Aplicação: splash / login ───────────────────────────────────────────────
function SplashApp() {
  return (
    <Stage bg={C.navy}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }}>
        <Lockup markSize={56} wordSize={46} variant="fill" />
        <div style={{ width: 1, height: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: SANS, fontSize: 14, color: C.creamDim,
            maxWidth: 320, textAlign: 'center', lineHeight: 1.5 }}>
            A inteligência que entende o seu escritório.
          </span>
          <div style={{ marginTop: 14, height: 40, padding: '0 22px', borderRadius: 8,
            background: C.gold, color: C.navy, fontFamily: SANS, fontWeight: 500,
            fontSize: 14, display: 'inline-flex', alignItems: 'center' }}>
            Entrar
          </div>
        </div>
      </div>
    </Stage>
  );
}

// ============================================================================
// SÍMBOLOS — conexões, nós & laços. Geometria limpa (linhas, círculos, arcos),
// monolinha dourada, leitura séria. Cada um lê como "rede/loop" + advocacia.
// viewBox 96×96; espessuras em unidades do viewBox p/ escalar com o tamanho.
// ============================================================================

// A · Elo (Loop-L) — o "L" com um nó/laço no vértice. Marca + loop.
function MarkLoopL({ size = 96, color = C.gold }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" style={{ display: 'block' }}>
      <g fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <line x1="33" y1="16" x2="33" y2="50" />
        <circle cx="33" cy="62" r="12" />
        <line x1="45" y1="62" x2="78" y2="62" />
      </g>
    </svg>
  );
}

// B · Constelação — rede de nós; triângulo estável = equilíbrio/balança + conexões.
function MarkConstellation({ size = 96, color = C.gold }) {
  const A = [48, 22], B = [26, 62], D = [70, 62];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" style={{ display: 'block' }}>
      <g stroke={color} strokeWidth="4" strokeLinecap="round">
        <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} />
        <line x1={A[0]} y1={A[1]} x2={D[0]} y2={D[1]} />
        <line x1={B[0]} y1={B[1]} x2={D[0]} y2={D[1]} />
      </g>
      <g fill={color}>
        <circle cx={A[0]} cy={A[1]} r="6.5" />
        <circle cx={B[0]} cy={B[1]} r="6.5" />
        <circle cx={D[0]} cy={D[1]} r="6.5" />
        <circle cx="48" cy="62" r="4.5" />
      </g>
    </svg>
  );
}

// C · Elos entrelaçados — dois anéis em chain link = conexão + vínculo (contrato).
function MarkLinked({ size = 96, color = C.gold }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" style={{ display: 'block' }}>
      <g fill="none" stroke={color} strokeWidth="6.5">
        <circle cx="39" cy="48" r="16" />
        <circle cx="59" cy="48" r="16" />
        {/* re-desenha o arco superior do anel esquerdo POR CIMA → entrelace real */}
        <path d="M43.14 32.54 A16 16 0 0 1 53.26 40.74" />
      </g>
    </svg>
  );
}

// D · Órbita — nó central + laço orbital + nó na órbita = inteligência contínua.
function MarkOrbit({ size = 96, color = C.gold }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" style={{ display: 'block' }}>
      <ellipse cx="48" cy="48" rx="32" ry="14" transform="rotate(-28 48 48)"
        fill="none" stroke={color} strokeWidth="5.5" />
      <circle cx="48" cy="48" r="6.5" fill={color} />
      <circle cx="74.9" cy="42.8" r="5" fill={color} />
    </svg>
  );
}

// Lockup genérico: símbolo (à esquerda) + wordmark bicolor serifa.
function SymbolLockup({ symbol, wordSize = 50, gap, cream = C.cream, gold = C.gold }) {
  const g = gap ?? wordSize * 0.52;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: g }}>
      {symbol}
      <WMBicolor size={wordSize} cream={cream} gold={gold} />
    </div>
  );
}

// Direção completa: símbolo grande em cima, lockup embaixo. Para comparação.
function Direction({ Symbol, bg = C.navy, cream = C.cream, gold = C.gold }) {
  return (
    <Stage bg={bg}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 42 }}>
        <Symbol size={116} color={gold} />
        <SymbolLockup symbol={<Symbol size={48} color={gold} />} wordSize={46} cream={cream} gold={gold} />
      </div>
    </Stage>
  );
}

Object.assign(window, {
  LexSpark: Spark, LexMark: Mark, LexStage: Stage, LexLockup: Lockup,
  WMBicolor, WMSerifMono, WMSpark, WMDot, WMTagline,
  FaviconScale, MarkVariants, SidebarApp, SplashApp,
  MarkLoopL, MarkConstellation, MarkLinked, MarkOrbit,
  SymbolLockup, Direction,
});
