// LexIA · Financeiro interativo — data model + helpers.
// "Lançamento" = a single receivable (in) or payable (out) line.
//   dir:   'in'  -> a receber / entrada (honorário)
//          'out' -> a pagar / saída (gasto)
//   pago:  boolean; pagoData: ISO string or null
//   venc:  ISO due date 'YYYY-MM-DD'
//   grupo: recurrence label (e.g. 'Mensal 3/6', 'Parcela 2/4') or null
// Status is derived from date + pago — never stored.

const FX_TODAY = new Date('2026-06-09T12:00:00');
const FX_MON   = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const FX_MON_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// ---- money ----
const _fxBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fxMoney = (n) => _fxBRL.format(n).replace('-', '−');
const fxCompact = (n) => {
  const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1000) return `${s}R$ ${(a / 1000).toLocaleString('pt-BR', { minimumFractionDigits: a >= 100000 ? 0 : 1, maximumFractionDigits: 1 })} mil`;
  return fxMoney(n);
};

// ---- dates ----
function fxAddMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1 + n, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
const fxDate = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y.slice(2)}`; };
const fxDateLong = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-').map(Number); return `${d} ${FX_MON[m - 1]} ${y}`; };
const fxMonthKey = (iso) => iso.slice(0, 7);                 // 'YYYY-MM'
const fxYear = (iso) => Number(iso.slice(0, 4));
const fxMonthIdx = (iso) => Number(iso.slice(5, 7)) - 1;     // 0-11
const fxQuarter = (iso) => Math.floor(fxMonthIdx(iso) / 3);  // 0-3

// ---- status ----
function fxStatus(it) {
  if (it.pago) return 'pago';
  const v = new Date(it.venc + 'T12:00:00');
  return v < FX_TODAY ? 'vencido' : 'avencer';
}
const FX_STATUS_LABEL = { pago: 'Pago', vencido: 'Vencido', avencer: 'A vencer' };
function fxDaysTo(iso) {
  const v = new Date(iso + 'T12:00:00');
  return Math.round((v - FX_TODAY) / 86400000);
}

// ---- categories (drive the form + filters) ----
const FX_CATS = {
  in:  ['Recorrente', 'Parcelado', 'Êxito', 'À vista', 'Consultoria'],
  out: ['Folha & internos', 'Ocupação', 'Sistemas & software', 'Impostos & taxas', 'Marketing', 'Outros'],
};
const FX_CLIENTES = ['Construtora Aurora S/A', 'Helena Vargas', 'Tech Holding LTDA', 'Mendonça & Filhos', 'Família Soares', 'Editora Linhares', 'Indústria Kessler', 'Vértice Capital', 'Atlântico Logística'];
const FX_FORNEC = ['Imobiliária Faria Lima', 'Thomson Reuters', 'Microsoft 365', 'Receita Federal', 'OAB/SP', 'Google Ads', 'Equipe LexIA', 'Cartório 2º Ofício'];

// ---- seed builder ----
function fxBuildSeed() {
  let n = 0, s = 0;
  const id = () => `L${(++n).toString().padStart(3, '0')}`;
  const serieId = () => `S${(++s).toString().padStart(2, '0')}`;
  const items = [];
  const push = (o) => items.push({ id: id(), pago: false, pagoData: null, caso: null, grupo: null, serie: null, obs: '', ...o });

  function monthly({ dir, desc, cat, party, caso, valor, startISO, count, paidThrough }) {
    const serie = serieId();
    for (let i = 0; i < count; i++) {
      const venc = fxAddMonths(startISO, i);
      const paid = paidThrough != null && i < paidThrough;
      push({ dir, desc, cat, party, caso, valor, venc, pago: paid, pagoData: paid ? venc : null, grupo: `Mensal ${i + 1}/${count}`, serie });
    }
  }
  function parcelado({ dir, desc, cat, party, caso, total, startISO, count, paidThrough }) {
    const each = Math.round(total / count / 100) * 100;
    const serie = serieId();
    for (let i = 0; i < count; i++) {
      const venc = fxAddMonths(startISO, i);
      const paid = paidThrough != null && i < paidThrough;
      push({ dir, desc: `${desc} · parcela ${i + 1}/${count}`, cat, party, caso, valor: each, venc, pago: paid, pagoData: paid ? venc : null, grupo: `Parcela ${i + 1}/${count}`, serie });
    }
  }

  // ===== Entradas (a receber / honorários) =====
  // Recorrentes longos (≈30 meses) — somam ~R$ 74,8 mil/mês, acima das saídas
  // fixas (~R$ 62,8 mil/mês), para a projeção de caixa subir de forma realista.
  monthly({ dir: 'in', desc: 'Honorários · assessoria mensal', cat: 'Recorrente', party: 'Construtora Aurora S/A', caso: 'Contencioso trabalhista', valor: 18000, startISO: '2026-03-05', count: 30, paidThrough: 3 });
  monthly({ dir: 'in', desc: 'Assessoria mensal', cat: 'Recorrente', party: 'Editora Linhares', caso: 'Propriedade intelectual', valor: 6500, startISO: '2026-03-05', count: 30, paidThrough: 3 });
  monthly({ dir: 'in', desc: 'Assessoria contenciosa mensal', cat: 'Recorrente', party: 'Indústria Kessler', caso: 'Recuperação judicial', valor: 21000, startISO: '2026-04-10', count: 29, paidThrough: 2 });
  monthly({ dir: 'in', desc: 'Retainer · consultivo societário', cat: 'Recorrente', party: 'Vértice Capital', caso: 'Consultivo', valor: 16500, startISO: '2026-03-15', count: 30, paidThrough: 3 });
  monthly({ dir: 'in', desc: 'Assessoria tributária mensal', cat: 'Recorrente', party: 'Atlântico Logística', caso: 'Consultivo fiscal', valor: 12800, startISO: '2026-05-08', count: 28, paidThrough: 1 });
  parcelado({ dir: 'in', desc: 'Consultoria societária', cat: 'Parcelado', party: 'Tech Holding LTDA', caso: 'Reestruturação', total: 72000, startISO: '2026-03-12', count: 6, paidThrough: 3 });
  parcelado({ dir: 'in', desc: 'Revisão contratual', cat: 'Parcelado', party: 'Mendonça & Filhos', caso: 'Revisão contratual', total: 34000, startISO: '2026-03-28', count: 4, paidThrough: 3 });
  push({ dir: 'in', desc: 'Honorários de êxito · inventário', cat: 'Êxito', party: 'Helena Vargas', caso: 'Inventário', valor: 42000, venc: '2026-05-20' });
  push({ dir: 'in', desc: 'Due diligence · M&A', cat: 'À vista', party: 'Vértice Capital', caso: 'Aquisição', valor: 65000, venc: '2026-06-18' });
  push({ dir: 'in', desc: 'Honorários · recuperação judicial', cat: 'À vista', party: 'Indústria Kessler', caso: 'Recuperação judicial', valor: 38000, venc: '2026-06-10' });
  push({ dir: 'in', desc: 'Acordo extrajudicial', cat: 'À vista', party: 'Família Soares', caso: 'Acordo cível', valor: 14500, venc: '2026-05-08', pago: true, pagoData: '2026-05-09' });
  push({ dir: 'in', desc: 'Parecer tributário', cat: 'Consultoria', party: 'Atlântico Logística', caso: 'Mandado de segurança', valor: 9800, venc: '2026-07-03' });

  // ===== Saídas (a pagar / gastos) =====
  monthly({ dir: 'out', desc: 'Folha · equipe e advogados', cat: 'Folha & internos', party: 'Equipe LexIA', valor: 42800, startISO: '2026-03-05', count: 30, paidThrough: 3 });
  monthly({ dir: 'out', desc: 'Aluguel · escritório', cat: 'Ocupação', party: 'Imobiliária Faria Lima', valor: 11600, startISO: '2026-03-10', count: 30, paidThrough: 3 });
  monthly({ dir: 'out', desc: 'Sistemas & software', cat: 'Sistemas & software', party: 'Thomson Reuters', valor: 8400, startISO: '2026-03-01', count: 30, paidThrough: 3 });
  push({ dir: 'out', desc: 'Impostos · Simples Nacional', cat: 'Impostos & taxas', party: 'Receita Federal', valor: 31600, venc: '2026-06-20' });
  push({ dir: 'out', desc: 'Marketing · captação', cat: 'Marketing', party: 'Google Ads', valor: 9700, venc: '2026-06-15' });
  push({ dir: 'out', desc: 'Anuidade OAB/SP', cat: 'Impostos & taxas', party: 'OAB/SP', valor: 5500, venc: '2026-05-28' });
  push({ dir: 'out', desc: 'Custas processuais', cat: 'Outros', party: 'Cartório 2º Ofício', valor: 3650, venc: '2026-06-12' });
  push({ dir: 'out', desc: 'Marketing · evento OAB', cat: 'Marketing', party: 'Google Ads', valor: 6200, venc: '2026-05-15', pago: true, pagoData: '2026-05-14' });

  return items.sort((a, b) => a.venc.localeCompare(b.venc));
}

Object.assign(window, {
  FX_TODAY, FX_MON, FX_MON_FULL, FX_CATS, FX_CLIENTES, FX_FORNEC, FX_STATUS_LABEL,
  fxMoney, fxCompact, fxAddMonths, fxDate, fxDateLong, fxMonthKey, fxYear, fxMonthIdx, fxQuarter,
  fxStatus, fxDaysTo, fxBuildSeed,
});
